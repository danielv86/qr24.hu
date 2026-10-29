<script setup lang="ts">
import {
  CUSTOM_SHAPE_MAX_CONTOURS,
  CUSTOM_SHAPE_MAX_POINTS,
  CUSTOM_SHAPE_MIN_POINTS,
  cloneCustomShape,
  contourPath,
  createContour,
  customFramePath,
  customShapePath,
  isValidCustomShape,
  parseCustomShape,
  shapeCoverage,
} from '#shared/qr/custom-shape'
import type { CustomShape, ShapeContour, ShapePoint } from '#shared/qr/custom-shape'
import {
  CORNER_DOT_OPTIONS,
  CORNER_SQUARE_OPTIONS,
  DOT_STYLE_OPTIONS,
} from '~/lib/qr/customization'
import { EMPTY_NEIGHBOURS, bodyShapePath, eyeBallShapePath, eyeFrameShapePath } from '~/lib/qr/shapes'
import { ShapeImportError, importShapeFromImage, importShapeFromSvg, pointsFromPathData } from '~/lib/qr/shape-import'
import type { CornerDotStyle, CornerSquareStyle, DotStyle } from '#shared/qr/types'

const props = withDefaults(
  defineProps<{
    open: boolean
    kind: 'body' | 'frame' | 'ball'
    shape?: CustomShape | null
    /** A kiválasztott beépített forma útvonala, amiből szerkesztés indulhat. */
    seedPath?: string
    /** Beépített mód: a szerkesztő nem modálban, hanem az oldal részeként jelenik meg. */
    embedded?: boolean
  }>(),
  { shape: null, seedPath: '', embedded: false },
)

const visible = computed(() => props.open || props.embedded)

const emit = defineEmits<{ close: []; save: [shape: CustomShape] }>()

const KIND_LABELS: Record<'body' | 'frame' | 'ball', string> = {
  body: 'Test formája',
  frame: 'Sarokelem kerete',
  ball: 'Sarokelem belseje',
}

const KIND_HINTS: Record<'body' | 'frame' | 'ball', string> = {
  body: 'Ez az alak jelenik meg a kód minden modulján. Több alakzatot is összeépíthetsz, a kivágások lyukat vágnak.',
  frame: 'A külső alak adja a keresőminta keretét, a belseje üresen marad.',
  ball: 'A forma a keresőminta 3 × 3-as magját rajzolja ki.',
}

const SCALE = 100
const SNAP_STEP = 0.05

function circlePoints(count = 12): ShapePoint[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2
    return { x: 0.5 + Math.cos(angle) * 0.5, y: 0.5 + Math.sin(angle) * 0.5 }
  })
}

type PresetId = 'square' | 'circle' | 'leaf' | 'star' | 'octagon' | 'heart'

function presetPoints(preset: PresetId): ShapePoint[] {
  if (preset === 'circle') return circlePoints(12)
  if (preset === 'square') {
    return [
      { x: 0.02, y: 0.02 },
      { x: 0.98, y: 0.02 },
      { x: 0.98, y: 0.98 },
      { x: 0.02, y: 0.98 },
    ]
  }
  if (preset === 'leaf') {
    return [
      { x: 0.04, y: 0.5 },
      { x: 0.5, y: 0.02 },
      { x: 0.96, y: 0.5 },
      { x: 0.5, y: 0.98 },
    ]
  }
  if (preset === 'heart') {
    return [
      { x: 0.5, y: 0.98 },
      { x: 0.08, y: 0.5 },
      { x: 0.12, y: 0.18 },
      { x: 0.38, y: 0.06 },
      { x: 0.5, y: 0.24 },
      { x: 0.62, y: 0.06 },
      { x: 0.88, y: 0.18 },
      { x: 0.92, y: 0.5 },
    ]
  }
  if (preset === 'octagon') {
    return Array.from({ length: 8 }, (_, index) => {
      const angle = (index / 8) * Math.PI * 2 + Math.PI / 8
      return { x: 0.5 + Math.cos(angle) * 0.5, y: 0.5 + Math.sin(angle) * 0.5 }
    })
  }
  return Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2 - Math.PI / 2
    const radius = index % 2 === 0 ? 0.5 : 0.21
    return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius }
  })
}

const contours = ref<ShapeContour[]>([])
const activeIndex = ref(0)
const selected = ref(-1)
const snap = ref(true)
const mode = ref<'move' | 'add' | 'delete'>('move')
const importing = ref(false)
const importError = ref('')
const svgRef = ref<SVGSVGElement | null>(null)
const svgInput = ref<HTMLInputElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const jsonInput = ref<HTMLInputElement | null>(null)
const builtinOpen = ref(false)
const history = ref<ShapeContour[][]>([])
const redoStack = ref<ShapeContour[][]>([])
const dragIndex = ref(-1)
const draggingContour = ref(false)
const dragOrigin = ref<ShapePoint | null>(null)
const dragSnapshot = ref<ShapePoint[] | null>(null)

/** A vászon tényleges szélessége, hogy a jelölők pixelben állandók legyenek. */
const canvasWidth = ref(480)
let canvasObserver: ResizeObserver | null = null

const title = computed(() => KIND_LABELS[props.kind])
const hint = computed(() => KIND_HINTS[props.kind])
const activeContour = computed<ShapeContour | null>(() => contours.value[activeIndex.value] ?? null)
const activePoints = computed(() => activeContour.value?.points ?? [])
const smooth = computed({
  get: () => activeContour.value?.smooth ?? 0,
  set: value => updateActive({ smooth: value }),
})
const shape = computed<CustomShape>(() => ({ contours: contours.value }))
const coverage = computed(() => {
  const total = shapeCoverage(shape.value)
  if (props.kind !== 'frame') return total
  return Math.max(0, total * (1 - (5 / 7) ** 2))
})

const coverageStatus = computed(() => {
  const ratio = coverage.value
  if (props.kind === 'body') {
    if (ratio >= 0.34) return { tone: 'ok', text: 'Kiváló lefedettség' }
    if (ratio >= 0.22) return { tone: 'warn', text: 'Vékony minta – nehézkes lehet a beolvasás' }
    return { tone: 'bad', text: 'Túl kevés tinta, a kód beolvashatatlan lehet' }
  }
  if (props.kind === 'frame') {
    if (ratio >= 0.3) return { tone: 'ok', text: 'A gyűrű megfelelő vastagságú' }
    if (ratio >= 0.16) return { tone: 'warn', text: 'Vékony gyűrű – a sarokelem nehezebben ismerhető fel' }
    return { tone: 'bad', text: 'A gyűrű túl vékony a megbízható felismeréshez' }
  }
  if (ratio >= 0.45) return { tone: 'ok', text: 'A mag megfelelően kitöltött' }
  if (ratio >= 0.28) return { tone: 'warn', text: 'Kicsi mag – érdemes nagyobb alakzatot rajzolni' }
  return { tone: 'bad', text: 'A mag túl kicsi, a kód nem ismerhető fel' }
})

const coverageClass = computed(() =>
  coverageStatus.value.tone === 'ok'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : coverageStatus.value.tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-red-200 bg-red-50 text-red-700',
)

const previewModules = computed(() => {
  if (props.kind === 'frame') return customFramePath(shape.value, 0, 0, 100)
  if (props.kind === 'ball') return customShapePath(shape.value, 0, 0, 100)
  const pattern = ['11011', '10101', '11111', '10001', '11011']
  const cell = 100 / 5
  let d = ''
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      if (pattern[row]![column] !== '1') continue
      d += customShapePath(shape.value, column * cell, row * cell, cell)
    }
  }
  return d
})

function cloneContours(source: ShapeContour[]): ShapeContour[] {
  return source.map(contour => ({
    ...contour,
    points: contour.points.map(point => ({ ...point })),
  }))
}

function pushHistory() {
  history.value = [...history.value.slice(-29), cloneContours(contours.value)]
  redoStack.value = []
}

function undo() {
  const previous = history.value.pop()
  if (!previous) return
  redoStack.value = [...redoStack.value.slice(-29), cloneContours(contours.value)]
  contours.value = previous
  activeIndex.value = Math.min(activeIndex.value, contours.value.length - 1)
  selected.value = -1
}

function redo() {
  const next = redoStack.value.pop()
  if (!next) return
  history.value = [...history.value.slice(-29), cloneContours(contours.value)]
  contours.value = next
  activeIndex.value = Math.min(activeIndex.value, contours.value.length - 1)
  selected.value = -1
}

function updateActive(patch: Partial<ShapeContour>) {
  const index = activeIndex.value
  const current = contours.value[index]
  if (!current) return
  const next = cloneContours(contours.value)
  next[index] = { ...current, ...patch }
  contours.value = next
}

function setActivePoints(points: ShapePoint[]) {
  updateActive({ points })
}

function resetFromProps() {
  if (isValidCustomShape(props.shape)) {
    contours.value = cloneContours(props.shape.contours)
  } else {
    // Ha a felhasználó egy beépített formát szerkeszt, abból indulunk, hogy a
    // meglévő alakot ne kelljen újra rajzolni.
    const seeded = props.seedPath ? pointsFromPathData(props.seedPath) : []
    contours.value = [
      seeded.length
        ? createContour(seeded, 0.2, 'add')
        : createContour(circlePoints(12), 0.5, 'add'),
    ]
  }
  builtinOpen.value = false
  activeIndex.value = 0
  selected.value = -1
  history.value = []
  redoStack.value = []
  importError.value = ''
  mode.value = 'move'
}

// Minden megnyitáskor a mentett formából indulunk, így a korábbi munka
// tovább szerkeszthető. Mentés közben nem írjuk felül a vásznat.
watch(
  visible,
  value => {
    if (value) resetFromProps()
  },
  { immediate: true },
)

const nodeSize = computed(() => Math.min(3.2, Math.max(1.4, (9 / Math.max(1, canvasWidth.value)) * SCALE)))
const nodeHit = computed(() => nodeSize.value * 1.9)
const nodeStroke = computed(() => nodeSize.value * 0.22)

function contourPathFor(contour: ShapeContour, index: number): string {
  const reverse = contour.mode === 'cut'
  return contourPath(contour, 0, 0, SCALE, reverse)
}

function isActive(index: number) {
  return index === activeIndex.value
}

function selectContour(index: number) {
  activeIndex.value = index
  selected.value = -1
}

function setActiveMode(value: 'add' | 'cut') {
  if (!activeContour.value || activeContour.value.mode === value) return
  pushHistory()
  updateActive({ mode: value })
}

function addContour(preset: PresetId) {
  if (contours.value.length >= CUSTOM_SHAPE_MAX_CONTOURS) {
    importError.value = `Legfeljebb ${CUSTOM_SHAPE_MAX_CONTOURS} alakzat használható egy formában.`
    return
  }
  pushHistory()
  const scale = 0.32
  const points = presetPoints(preset).map(point => ({
    x: 0.5 + (point.x - 0.5) * scale,
    y: 0.5 + (point.y - 0.5) * scale,
  }))
  const smoothValue = preset === 'square' || preset === 'star' ? 0.08 : preset === 'octagon' ? 0.2 : 0.9
  contours.value = [...contours.value, createContour(points, smoothValue, 'add')]
  activeIndex.value = contours.value.length - 1
  selected.value = -1
  importError.value = ''
}

function removeContour() {
  if (contours.value.length <= 1) {
    importError.value = 'Legalább egy alakzat kell a formához.'
    return
  }
  pushHistory()
  const next = cloneContours(contours.value)
  next.splice(activeIndex.value, 1)
  contours.value = next
  activeIndex.value = Math.max(0, activeIndex.value - 1)
  selected.value = -1
}

const builtinOptions = computed(() => {
  if (props.kind === 'body') return DOT_STYLE_OPTIONS
  if (props.kind === 'frame') return CORNER_SQUARE_OPTIONS
  return CORNER_DOT_OPTIONS
})

/** A beépített forma útvonala a jelenlegi elemhez (test, keret vagy mag). */
function builtinPath(value: string): string {
  if (props.kind === 'body') return bodyShapePath(value as DotStyle)(0, 0, 100, EMPTY_NEIGHBOURS, 1, 1)
  if (props.kind === 'frame') return eyeFrameShapePath(value as CornerSquareStyle)(0, 0, 100, 100 / 7)
  return eyeBallShapePath(value as CornerDotStyle)(0, 0, 100, 100 / 3)
}

/** Kiválasztott alap forma betöltése a kijelölt alakzat helyére. */
function applyBuiltin(value: string) {
  const builtin = pointsFromPathData(builtinPath(value))
  if (!builtin.length) {
    importError.value = 'Ezt a formát nem sikerült átalakítani. Próbálj másikat.'
    builtinOpen.value = false
    return
  }
  pushHistory()
  updateActive({ points: builtin, smooth: 0.2, mode: 'add' })
  selected.value = -1
  importError.value = ''
  builtinOpen.value = false
}

function applyPreset(preset: PresetId) {
  pushHistory()
  const smoothValue = preset === 'square' || preset === 'star' ? 0.08 : preset === 'octagon' ? 0.2 : 0.9
  updateActive({ points: presetPoints(preset), smooth: smoothValue })
  selected.value = -1
}

function toCanvas(event: PointerEvent): ShapePoint {
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect || !rect.width) return { x: 0, y: 0 }
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  return {
    x: snap.value ? clamp(Math.round(x / SNAP_STEP) * SNAP_STEP) : clamp(x),
    y: snap.value ? clamp(Math.round(y / SNAP_STEP) * SNAP_STEP) : clamp(y),
  }
}

function startDrag(index: number, event: PointerEvent) {
  if (mode.value === 'delete') {
    removePoint(index)
    return
  }
  selected.value = index
  if (mode.value !== 'move') return
  pushHistory()
  dragIndex.value = index
  svgRef.value?.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function startContourDrag(index: number, event: PointerEvent) {
  if (mode.value === 'move') {
    pushHistory()
    draggingContour.value = true
    dragOrigin.value = toCanvas(event)
    dragSnapshot.value = cloneContours(contours.value)[index]!.points
    svgRef.value?.setPointerCapture(event.pointerId)
  }
}

function onPointerMove(event: PointerEvent) {
  if (dragIndex.value >= 0) {
    const position = toCanvas(event)
    const next = cloneContours(contours.value)
    next[activeIndex.value]!.points[dragIndex.value] = position
    contours.value = next
    return
  }
  if (!draggingContour.value || !dragOrigin.value || !dragSnapshot.value) return
  const position = toCanvas(event)
  const dx = position.x - dragOrigin.value.x
  const dy = position.y - dragOrigin.value.y
  const next = cloneContours(contours.value)
  next[activeIndex.value]!.points = dragSnapshot.value.map(point => ({
    x: Math.min(1, Math.max(0, point.x + dx)),
    y: Math.min(1, Math.max(0, point.y + dy)),
  }))
  contours.value = next
}

function endDrag(event: PointerEvent) {
  dragIndex.value = -1
  draggingContour.value = false
  dragOrigin.value = null
  dragSnapshot.value = null
  if (svgRef.value?.hasPointerCapture(event.pointerId)) svgRef.value.releasePointerCapture(event.pointerId)
}

function projectOnSegment(point: ShapePoint, a: ShapePoint, b: ShapePoint): { point: ShapePoint; distance: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared
    ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
    : 0
  const projected = { x: a.x + t * dx, y: a.y + t * dy }
  return { point: projected, distance: Math.hypot(point.x - projected.x, point.y - projected.y) }
}

function onCanvasClick(event: MouseEvent) {
  if (mode.value !== 'add' || !activeContour.value) return
  if (activePoints.value.length >= CUSTOM_SHAPE_MAX_POINTS) {
    importError.value = `Legfeljebb ${CUSTOM_SHAPE_MAX_POINTS} csomópont használható egy alakzaton.`
    return
  }
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect || !rect.width) return
  const position = {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  }
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  let bestPoint = position
  const points = activePoints.value
  for (let index = 0; index < points.length; index += 1) {
    const result = projectOnSegment(position, points[index]!, points[(index + 1) % points.length]!)
    if (result.distance < bestDistance) {
      bestDistance = result.distance
      bestIndex = index
      bestPoint = result.point
    }
  }
  const snapped = snap.value
    ? {
        x: Math.round(bestPoint.x / SNAP_STEP) * SNAP_STEP,
        y: Math.round(bestPoint.y / SNAP_STEP) * SNAP_STEP,
      }
    : bestPoint
  pushHistory()
  const next = [...activePoints.value]
  next.splice(bestIndex + 1, 0, snapped)
  setActivePoints(next)
  selected.value = bestIndex + 1
  importError.value = ''
}

function removePoint(index: number) {
  if (activePoints.value.length <= CUSTOM_SHAPE_MIN_POINTS) {
    importError.value = `Legalább ${CUSTOM_SHAPE_MIN_POINTS} csomópont kell az alakzathoz.`
    return
  }
  pushHistory()
  setActivePoints(activePoints.value.filter((_, position) => position !== index))
  selected.value = -1
}

function deleteSelected() {
  if (selected.value >= 0) removePoint(selected.value)
}

function onWindowKeydown(event: KeyboardEvent) {
  if (!visible.value) return
  const modifier = event.ctrlKey || event.metaKey
  const target = event.target as HTMLElement | null
  const editingField = Boolean(target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  if (modifier && event.key.toLowerCase() === 'z' && !editingField) {
    event.preventDefault()
    if (event.shiftKey) redo()
    else undo()
    return
  }
  if (modifier && event.key.toLowerCase() === 'y' && !editingField) {
    event.preventDefault()
    redo()
    return
  }
  if (event.key === 'Escape') {
    if (builtinOpen.value) {
      builtinOpen.value = false
      return
    }
    if (!props.embedded) emit('close')
    return
  }
  if (editingField) return
  if (selected.value < 0) return
  const step = event.shiftKey ? SNAP_STEP : 0.01
  const deltas: Record<string, [number, number]> = {
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
  }
  const delta = deltas[event.key]
  if (!delta) return
  event.preventDefault()
  pushHistory()
  const next = [...activePoints.value]
  const current = next[selected.value]!
  next[selected.value] = {
    x: Math.min(1, Math.max(0, current.x + delta[0])),
    y: Math.min(1, Math.max(0, current.y + delta[1])),
  }
  setActivePoints(next)
}

function attachEditorChrome() {
  if (!import.meta.client || !visible.value) return
  window.removeEventListener('keydown', onWindowKeydown)
  window.addEventListener('keydown', onWindowKeydown)
  const element = svgRef.value
  if (!element) return
  canvasWidth.value = element.getBoundingClientRect().width || 480
  canvasObserver?.disconnect()
  canvasObserver = new ResizeObserver(entries => {
    const width = entries[0]?.contentRect.width
    if (width) canvasWidth.value = width
  })
  canvasObserver.observe(element)
}

function detachEditorChrome() {
  if (!import.meta.client) return
  window.removeEventListener('keydown', onWindowKeydown)
  canvasObserver?.disconnect()
  canvasObserver = null
}

watch(
  visible,
  async value => {
    if (!import.meta.client) return
    if (!props.embedded) document.documentElement.style.overflow = value ? 'hidden' : ''
    if (value) {
      await nextTick()
      attachEditorChrome()
    } else {
      detachEditorChrome()
    }
  },
  { immediate: true },
)

onMounted(() => {
  // Beépített módban a szerveroldali renderelés után még nincs DOM, ezért itt
  // pótoljuk a beépített formából induló betöltést és az események bekötését.
  if (!import.meta.client || !visible.value) return
  resetFromProps()
  attachEditorChrome()
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('keydown', onWindowKeydown)
  canvasObserver?.disconnect()
  document.documentElement.style.overflow = ''
})

async function onFileSelected(event: Event, source: 'svg' | 'image') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importing.value = true
  importError.value = ''
  try {
    const imported = source === 'svg' ? await importShapeFromSvg(file) : await importShapeFromImage(file)
    pushHistory()
    updateActive({ points: imported, smooth: 0.55 })
    selected.value = -1
  } catch (error) {
    importError.value =
      error instanceof ShapeImportError
        ? error.message
        : 'A fájl feldolgozása nem sikerült. Próbálj másik fájllal.'
  } finally {
    importing.value = false
    input.value = ''
  }
}

function exportShape() {
  if (!import.meta.client || !isValidCustomShape(shape.value)) return
  const payload = {
    format: 'qrkod24-shape',
    version: 1,
    kind: props.kind,
    shape: cloneCustomShape(shape.value),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `qr-forma-${props.kind}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function onJsonSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importError.value = ''
  try {
    const parsed = parseCustomShape(JSON.parse(await file.text()))
    if (!parsed) throw new Error('invalid')
    pushHistory()
    contours.value = cloneContours(parsed.contours)
    activeIndex.value = 0
    selected.value = -1
  } catch {
    importError.value = 'A JSON nem tartalmaz érvényes QR-formát. Használj korábban exportált fájlt.'
  } finally {
    input.value = ''
  }
}

function save() {
  if (!isValidCustomShape(shape.value)) {
    importError.value = `Legalább ${CUSTOM_SHAPE_MIN_POINTS} csomópont kell a mentéshez.`
    return
  }
  const cloned = cloneCustomShape(shape.value)
  if (cloned) emit('save', cloned)
  emit('close')
}
</script>

<template>
  <Teleport to="body" :disabled="embedded">
    <div
      v-if="visible"
      :class="
        embedded
          ? 'w-full'
          : 'fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6'
      "
      role="presentation"
      @click.self="!embedded && emit('close')"
    >
      <div
        :class="[
          'flex w-full flex-col overflow-hidden bg-surface',
          embedded
            ? 'rounded-2xl border border-slate-200'
            : 'max-h-[94vh] max-w-4xl rounded-t-2xl shadow-2xl sm:rounded-2xl',
        ]"
        role="dialog"
        :aria-modal="!embedded"
        aria-labelledby="qr-shape-editor-title"
      >
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">{{ title }}</p>
            <h2 id="qr-shape-editor-title" class="mt-1 text-xl font-bold text-ink">Forma szerkesztése</h2>
            <p class="mt-1 text-sm leading-relaxed text-ink-muted">{{ hint }}</p>
          </div>
          <button
            v-if="!embedded"
            type="button"
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-surface text-ink-muted transition-colors hover:bg-slate-50 hover:text-ink"
            aria-label="Bezárás"
            @click="emit('close')"
          >
            <Icon name="lucide:x" class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div class="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 md:grid-cols-[minmax(0,1fr)_320px]">
          <div class="min-w-0">
            <!-- Alakzatok -->
            <div class="mb-2 flex flex-wrap items-center gap-1.5">
              <button
                v-for="(contour, index) in contours"
                :key="index"
                type="button"
                :aria-pressed="isActive(index)"
                :class="[
                  'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors',
                  isActive(index)
                    ? 'border-brand-600 bg-brand-50 text-brand-800'
                    : 'border-slate-200 bg-white text-ink-soft hover:border-brand-300',
                ]"
                @click="selectContour(index)"
              >
                Alak {{ index + 1 }}
                <span v-if="contour.mode === 'cut'" class="text-[10px] font-bold uppercase tracking-wide text-red-600">
                  kivágás
                </span>
              </button>
              <button
                type="button"
                class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-ink-muted hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                :disabled="contours.length <= 1"
                title="Aktív alakzat törlése"
                aria-label="Aktív alakzat törlése"
                @click="removeContour"
              >
                <Icon name="lucide:trash-2" class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <!-- Eszközök -->
            <div class="mb-2 flex flex-wrap items-center gap-1.5">
              <button
                v-for="tool in [
                  { id: 'move', label: 'Húzás', icon: 'lucide:hand' },
                  { id: 'add', label: 'Pont', icon: 'lucide:plus' },
                  { id: 'delete', label: 'Törlés', icon: 'lucide:minus' },
                ] as const"
                :key="tool.id"
                type="button"
                :aria-pressed="mode === tool.id"
                :class="[
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                  mode === tool.id
                    ? 'border-brand-600 bg-brand-50 text-brand-800'
                    : 'border-slate-200 bg-white text-ink-soft hover:border-brand-300',
                ]"
                @click="mode = tool.id"
              >
                <Icon :name="tool.icon" class="h-3.5 w-3.5" aria-hidden="true" />
                {{ tool.label }}
              </button>
              <button
                type="button"
                :aria-pressed="snap"
                class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors"
                :class="snap ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-ink-soft'"
                @click="snap = !snap"
              >
                <Icon name="lucide:grid-3x3" class="h-3.5 w-3.5" aria-hidden="true" />
                Rács
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand-300 disabled:opacity-40"
                :disabled="!history.length"
                title="Visszavonás (Ctrl+Z)"
                @click="undo"
              >
                <Icon name="lucide:undo-2" class="h-3.5 w-3.5" aria-hidden="true" />
                Vissza
              </button>
            </div>

            <div class="rounded-xl border border-slate-200 bg-slate-50 p-2">
              <svg
                ref="svgRef"
                viewBox="0 0 100 100"
                class="aspect-square w-full touch-none select-none"
                :class="mode === 'add' ? 'cursor-copy' : 'cursor-crosshair'"
                role="application"
                :aria-label="`${title} szerkesztővászon`"
                @pointermove="onPointerMove"
                @pointerup="endDrag"
                @pointercancel="endDrag"
                @click="onCanvasClick"
              >
                <defs>
                  <pattern id="qr-shape-editor-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M10 0H0V10" fill="none" stroke="#E2E8F0" stroke-width="0.6" />
                  </pattern>
                </defs>
                <rect x="0" y="0" width="100" height="100" fill="#fff" />
                <rect x="0" y="0" width="100" height="100" fill="url(#qr-shape-editor-grid)" />
                <rect x="0.6" y="0.6" width="98.8" height="98.8" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="3 3" />

                <path
                  v-for="(contour, index) in contours"
                  :key="`shape-${index}`"
                  :d="contourPathFor(contour, index)"
                  :fill="contour.mode === 'cut' ? '#FFFFFF' : isActive(index) ? '#0F172A' : '#475569'"
                  :fill-opacity="isActive(index) ? 1 : 0.45"
                  :stroke="contour.mode === 'cut' ? '#B91C1C' : 'none'"
                  :stroke-width="contour.mode === 'cut' ? 0.7 : 0"
                  stroke-dasharray="2 1.4"
                  class="cursor-pointer"
                  @pointerdown.stop="selectContour(index); startContourDrag(index, $event)"
                  @click.stop="selectContour(index)"
                />

                <g v-for="(point, index) in activePoints" :key="`node-${activeIndex}-${index}`">
                  <circle
                    :cx="point.x * SCALE"
                    :cy="point.y * SCALE"
                    :r="nodeHit"
                    fill="transparent"
                    class="cursor-move"
                    @pointerdown.stop="startDrag(index, $event)"
                  />
                  <rect
                    :x="point.x * SCALE - nodeSize / 2"
                    :y="point.y * SCALE - nodeSize / 2"
                    :width="nodeSize"
                    :height="nodeSize"
                    :rx="nodeSize * 0.2"
                    :fill="selected === index ? '#6D28D9' : '#FFFFFF'"
                    stroke="#6D28D9"
                    :stroke-width="nodeStroke"
                    pointer-events="none"
                  />
                </g>
              </svg>
            </div>
            <p class="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">
              Húzd a négyzeteket vagy az alakzat belsejét, a „Pont” eszközzel a vászonra kattintva új
              csomópontot szúrhatsz be. Nyílbillentyűk: 0,01, Shift+nyíl: 0,05. Ctrl+Z visszavonás.
            </p>
          </div>

          <div class="grid content-start gap-4">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <div class="flex items-center justify-between px-0.5 pb-1.5">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Élő előnézet</span>
                <span class="text-[11px] text-ink-muted">{{ contours.length }} alakzat</span>
              </div>
              <div class="mx-auto w-[104px] rounded-lg bg-white p-2 shadow-inner">
                <svg viewBox="0 0 100 100" class="h-full w-full" fill="#0F172A" aria-hidden="true">
                  <path :d="previewModules" />
                </svg>
              </div>
            </div>

            <div>
              <p class="field-label">Kijelölt alakzat</p>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  :aria-pressed="activeContour?.mode === 'add'"
                  class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors"
                  :class="activeContour?.mode === 'add' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-ink-soft'"
                  @click="setActiveMode('add')"
                >
                  <Icon name="lucide:plus" class="h-3.5 w-3.5" aria-hidden="true" />
                  Hozzáadás
                </button>
                <button
                  type="button"
                  :aria-pressed="activeContour?.mode === 'cut'"
                  class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors"
                  :class="activeContour?.mode === 'cut' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-ink-soft'"
                  @click="setActiveMode('cut')"
                >
                  <Icon name="lucide:minus" class="h-3.5 w-3.5" aria-hidden="true" />
                  Kivágás
                </button>
              </div>
              <p class="field-help">A kivágás lyukat vág az alakba – például a szemeket a fejen.</p>
            </div>

            <div>
              <p class="field-label">Alakzat hozzáadása</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="item in [
                    { id: 'circle', label: 'Kör' },
                    { id: 'square', label: 'Négyzet' },
                    { id: 'star', label: 'Csillag' },
                    { id: 'heart', label: 'Szív' },
                  ] as const"
                  :key="item.id"
                  type="button"
                  class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand-300 hover:text-brand-800"
                  @click="addContour(item.id)"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between gap-2">
                <p class="field-label">A kijelölt alakzat cseréje</p>
                <button
                  type="button"
                  class="mb-1.5 text-[11.5px] font-semibold text-brand-700 hover:underline"
                  @click="builtinOpen = true"
                >
                  Alap formák…
                </button>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="item in [
                    { id: 'circle', label: 'Kör' },
                    { id: 'square', label: 'Négyzet' },
                    { id: 'leaf', label: 'Levél' },
                    { id: 'octagon', label: 'Nyolcszög' },
                    { id: 'star', label: 'Csillag' },
                  ] as const"
                  :key="`preset-${item.id}`"
                  type="button"
                  class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11.5px] font-semibold text-ink-soft hover:border-brand-300 hover:text-brand-800"
                  @click="applyPreset(item.id)"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <div>
              <label for="qr-shape-smooth" class="field-label">
                Lekerekítés: {{ Math.round(smooth * 100) }}%
              </label>
              <input
                id="qr-shape-smooth"
                v-model.number="smooth"
                type="range"
                min="0"
                max="1"
                step="0.05"
                class="w-full accent-brand-600"
              >
              <p class="field-help">0%-nál éles sarkok, 100%-nál teljesen gömbölyű ívek.</p>
            </div>

            <div class="grid gap-2">
              <p class="field-label">Feltöltés a kijelölt alakzatra</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="btn-secondary justify-center text-xs"
                  :disabled="importing"
                  @click="svgInput?.click()"
                >
                  <Icon name="lucide:file-code" class="h-4 w-4" aria-hidden="true" />
                  SVG
                </button>
                <button
                  type="button"
                  class="btn-secondary justify-center text-xs"
                  :disabled="importing"
                  @click="imageInput?.click()"
                >
                  <Icon name="lucide:image" class="h-4 w-4" aria-hidden="true" />
                  Kép
                </button>
              </div>
              <input
                ref="svgInput"
                type="file"
                accept="image/svg+xml,.svg"
                class="sr-only"
                @change="onFileSelected($event, 'svg')"
              >
              <input
                ref="imageInput"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                class="sr-only"
                @change="onFileSelected($event, 'image')"
              >
              <div class="col-span-2 mt-1 grid grid-cols-2 gap-2">
                <button type="button" class="btn-secondary justify-center text-xs" @click="exportShape">
                  <Icon name="lucide:download" class="h-4 w-4" aria-hidden="true" />
                  JSON mentés
                </button>
                <button type="button" class="btn-secondary justify-center text-xs" @click="jsonInput?.click()">
                  <Icon name="lucide:upload" class="h-4 w-4" aria-hidden="true" />
                  JSON betöltés
                </button>
              </div>
              <input
                ref="jsonInput"
                type="file"
                accept="application/json,.json"
                class="sr-only"
                @change="onJsonSelected"
              >
              <p class="field-help">
                Az SVG-ből és a képből is vektoros alakzat lesz: a legnagyobb összefüggő forma
                körvonalát követjük, legfeljebb {{ CUSTOM_SHAPE_MAX_POINTS }} csomóponttal. Legfeljebb 2 MB.
              </p>
              <p v-if="importing" class="flex items-center gap-2 text-xs font-medium text-ink-muted">
                <Icon name="lucide:loader-circle" class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Feldolgozás…
              </p>
              <p v-if="importError" class="field-error" role="alert">{{ importError }}</p>
            </div>

            <div :class="['rounded-xl border px-3 py-2.5 text-xs font-medium', coverageClass]">
              <div class="flex items-center justify-between gap-2">
                <span>{{ coverageStatus.text }}</span>
                <span class="tabular-nums">{{ Math.round(coverage * 100) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <footer class="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
          <span class="text-[11px] text-ink-muted">Ctrl+Z visszavonás · Ctrl+Shift+Z újra</span>
          <div class="flex items-center gap-2">
            <button v-if="!embedded" type="button" class="btn-secondary" @click="emit('close')">Mégse</button>
            <button type="button" class="btn-primary" @click="save">
              <Icon name="lucide:check" class="h-4 w-4" aria-hidden="true" />
              Forma mentése
            </button>
          </div>
        </footer>

        <!-- Alap formák: külön modál, a szerkesztő nyitva marad alatta. -->
        <Teleport to="body">
          <div
            v-if="visible && builtinOpen"
            class="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            role="presentation"
            @click.self="builtinOpen = false"
          >
            <div
              class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-2xl sm:rounded-2xl sm:p-5"
              role="dialog"
              aria-modal="true"
              aria-labelledby="qr-builtin-title"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">Alap formák</p>
                  <h3 id="qr-builtin-title" class="mt-1 text-lg font-bold text-ink">Válassz kiinduló formát</h3>
                  <p class="mt-1 text-sm text-ink-muted">
                    A kiválasztott forma a jelenlegi alakzat helyére kerül, és a vásznon tovább szerkeszthető.
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-ink-muted hover:bg-slate-50"
                  aria-label="Alap formák bezárása"
                  @click="builtinOpen = false"
                >
                  <Icon name="lucide:x" class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div class="mt-4">
                <QrShapeTiles
                  id="qr-builtin-shapes"
                  :model-value="''"
                  label="Beépített formák"
                  :options="builtinOptions"
                  :variant="kind"
                  @update:model-value="applyBuiltin"
                />
              </div>
            </div>
          </div>
        </Teleport>
      </div>
    </div>
  </Teleport>
</template>
