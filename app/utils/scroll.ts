const SELECTOR_ID = 'qr-type-selector'

/** A típusválasztó; az `stale` az előző oldal azonos azonosítójú eleme. */
function findSelector(stale: HTMLElement | null): HTMLElement | null {
  const element = document.getElementById(SELECTOR_ID)
  return element && element !== stale ? element : null
}

/**
 * A választó kívánt görgetési pozíciója. A dokumentumon belüli eltolásból
 * számol, ezért a görgetés közben is ugyanazt adja – így animáció közben is
 * újraszámolható, ha a fölötte lévő tartalom elmozdul.
 */
function targetTop(element: HTMLElement, gap: number): number {
  const marginTop = Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0
  return Math.max(0, Math.round(window.scrollY + element.getBoundingClientRect().top - marginTop - gap))
}

/** Azonnali görgetés: a `scroll-behavior: smooth` ne indítson külön animációt. */
function jumpTo(top: number) {
  window.scrollTo({ top, behavior: 'instant' })
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

/** Képkockára vár, de háttérben lévő lapnál (ahol nincs rAF) időkorláttal továbblép. */
const nextFrameOr = (timeout = 50) =>
  Promise.race([nextFrame(), new Promise<void>(resolve => setTimeout(resolve, timeout))])

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/**
 * Rövid, saját animáció a célpozícióig. A cél minden képkockában újraszámolódik,
 * ezért ha közben betöltődő tartalom elmozdítja a választót, nem ugrik a végén.
 * A böngésző beépített smooth görgetését azért nem használjuk, mert az a fix
 * célpontot követi, és a közben elmozduló tartalom miatt láthatóan ugrott.
 */
function animateTo(getTarget: () => number, signal: AbortSignal, duration: number): Promise<void> {
  return new Promise((resolve) => {
    const startY = window.scrollY
    const started = performance.now()
    let frameStarted = false

    const step = (now: number) => {
      frameStarted = true
      if (signal.aborted) {
        resolve()
        return
      }
      const progress = Math.min(1, (now - started) / duration)
      const target = getTarget()
      jumpTo(Math.round(startY + (target - startY) * easeInOutCubic(progress)))
      if (progress < 1) requestAnimationFrame(step)
      else resolve()
    }

    // Háttérben lévő lapon nincs animációs képkocka: ilyenkor a célpozícióra ugrunk.
    const guard = setTimeout(() => {
      if (frameStarted) return
      jumpTo(getTarget())
      resolve()
    }, 400)

    requestAnimationFrame((now) => {
      clearTimeout(guard)
      step(now)
    })
  })
}

/**
 * A QR-típus választóhoz görget: a fix fejlécet a választó `scroll-mt-*`
 * értékéből veszi figyelembe, a kért ráhagyással (alapból 5 px).
 *
 * `animate: true` esetén rövid, lágy animáció fut (oldalon belüli váltásnál),
 * `animate: false` esetén azonnali az igazítás. Oldalváltásnál azért kell az
 * azonnali: az új oldal más magasságú fejléccel renderelődik, így az animáció
 * a rossz pozícióból indulna – az látható ugrásként jelenne meg.
 *
 * Utána néhány képkockán át figyeli, hogy a késve betöltődő tartalom nem
 * mozdította-e el a választót, és ha igen, azonnal korrigál – felhasználói
 * görgetésnél minden korrekció leáll.
 */
export async function scrollToTypeSelector(
  gap = 5,
  stale: HTMLElement | null = null,
  { animate = true }: { animate?: boolean } = {},
): Promise<void> {
  if (!import.meta.client) return

  await nextTick()

  let element = findSelector(stale)
  // Ha a DOM-csere egy képkockával később fut, rövid ideig várunk rá.
  for (let frame = 0; !element && frame < 12; frame += 1) {
    await nextFrameOr()
    element = findSelector(stale)
  }
  if (!element) return
  const fallback = element

  const stop = new AbortController()
  const cancel = () => stop.abort()
  const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
  for (const event of events) window.addEventListener(event, cancel, { passive: true, once: true })

  const reduced = !animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const distance = Math.abs(targetTop(element, gap) - window.scrollY)
  const duration = reduced ? 0 : Math.min(420, Math.max(200, distance * 0.6))

  if (duration > 0 && distance > 1) {
    await animateTo(() => {
      const current = findSelector(stale) ?? fallback
      return targetTop(current, gap)
    }, stop.signal, duration)
  }

  // Pontos zárópozíció, majd kb. egy másodpercig figyeljük az utólagos
  // elmozdulásokat (betűtípus, kép, hirdetés betöltése), és azonnal korrigálunk.
  // Enélkül a választó néhányszor 10 px-et csúszna a megérkezés után.
  const deadline = performance.now() + 1000
  let expected = window.scrollY
  while (!stop.signal.aborted && performance.now() < deadline) {
    // Ha a felhasználó (vagy más) nagyot görgetett, nem húzzuk vissza.
    if (Math.abs(window.scrollY - expected) > 60) break
    const current = findSelector(stale)
    if (!current) break
    element = current
    const target = targetTop(element, gap)
    if (Math.abs(window.scrollY - target) >= 1) {
      jumpTo(target)
      expected = target
    }
    await nextFrameOr(60)
  }

  for (const event of events) window.removeEventListener(event, cancel)
}
