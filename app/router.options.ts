import type { RouterConfig } from '@nuxt/schema'
import { QR_TYPE_PATHS } from '#shared/content/type-pages'

/** Azok az oldalak, amelyek a típusválasztót is tartalmazzák. */
const TYPE_PAGE_PATHS = new Set<string>(Object.values(QR_TYPE_PATHS))

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    // Vissza/előre lépésnél marad a böngésző által mentett pozíció.
    if (savedPosition) return savedPosition

    if (to.hash) {
      const target = document.querySelector(to.hash)
      if (target) {
        const marginTop = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0
        return { el: target as HTMLElement, top: marginTop }
      }
    }

    // Típusoldalakon nem görgetünk a tetejére: a típusválasztóhoz igazítunk
    // (lásd plugins/type-page-scroll.client.ts), így nincs fel-le ugrálás.
    if (TYPE_PAGE_PATHS.has(to.path)) return false

    return { left: 0, top: 0 }
  },
}
