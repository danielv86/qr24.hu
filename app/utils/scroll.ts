const SELECTOR_ID = 'qr-type-selector'

/** A típusválasztó; az `stale` az előző oldal azonos azonosítójú eleme. */
function findSelector(stale: HTMLElement | null): HTMLElement | null {
  const element = document.getElementById(SELECTOR_ID)
  return element && element !== stale ? element : null
}

/** A választó kívánt görgetési pozíciója (a fix fejléc alatt, ráhagyással). */
function targetTop(element: HTMLElement, gap: number): number {
  const marginTop = Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0
  return Math.max(0, Math.round(window.scrollY + element.getBoundingClientRect().top - marginTop - gap))
}

function align(element: HTMLElement, gap: number, behavior: ScrollBehavior): boolean {
  const next = targetTop(element, gap)
  if (Math.abs(window.scrollY - next) < 1) return false
  window.scrollTo({ top: next, behavior })
  return true
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

/**
 * A QR-típus választóhoz görget: a fix fejlécet a választó `scroll-mt-*`
 * értékéből veszi figyelembe, a kért ráhagyással (alapból 5 px).
 *
 * Az igazítás azonnali (nem animált), mert az oldal `scroll-behavior: smooth`
 * beállítása mellett az animált csúszás fel-le ugrálásnak látszott. Utána néhány
 * képkockán át figyeli, hogy a késve betöltődő tartalom nem mozdította-e el a
 * választót, és ha igen, azonnal korrigál – felhasználói görgetésnél leáll.
 */
export async function scrollToTypeSelector(gap = 5, stale: HTMLElement | null = null): Promise<void> {
  if (!import.meta.client) return

  await nextTick()

  let element = findSelector(stale)
  // Ha a DOM-csere egy képkockával később fut, rövid ideig várunk rá.
  for (let frame = 0; !element && frame < 12; frame += 1) {
    await nextFrame()
    element = findSelector(stale)
  }
  if (!element) return

  const stop = new AbortController()
  const cancel = () => stop.abort()
  const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
  for (const event of events) window.addEventListener(event, cancel, { passive: true, once: true })

  align(element, gap, 'instant')

  let stable = 0
  for (let frame = 0; frame < 40 && !stop.signal.aborted; frame += 1) {
    await nextFrame()
    const current = findSelector(stale)
    if (!current) break
    element = current
    stable = align(element, gap, 'instant') ? 0 : stable + 1
    if (stable > 8) break
  }

  for (const event of events) window.removeEventListener(event, cancel)
}
