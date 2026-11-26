import { QR_TYPE_PATHS } from '#shared/content/type-pages'
import { scrollToTypeSelector } from '~/utils/scroll'

const TYPE_PAGE_PATHS = new Set<string>(Object.values(QR_TYPE_PATHS))

/**
 * Bármely típuslinkről (fejléc TYP menü, lábléc, népszerű típusok, típusválasztó)
 * érkezve a típusoldal a típusválasztónál nyílik, nem az oldal tetején.
 * A router scrollBehavior ezeken az oldalakon nem görget, így nincs fel-le ugrálás.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()

  router.afterEach((to, from, failure) => {
    if (failure) return
    // Friss betöltésnél (nincs előző oldal) nem avatkozunk be.
    if (from.matched.length === 0) return
    if (!TYPE_PAGE_PATHS.has(to.path)) return
    // Az előző oldal választója még a DOM-ban lehet, azt hagyjuk ki.
    const stale = document.getElementById('qr-type-selector')
    void scrollToTypeSelector(5, stale)
  })
})
