import { defineEventHandler, getRequestURL, getRouterParam, sendRedirect } from 'h3'

/**
 * A rövid linkek új előtagja a /go. A korábban kinyomtatott /r/... kódok
 * működjenek tovább, ezért állandó átirányítással továbbítjuk őket.
 */
export default defineEventHandler((event) => {
  const code = getRouterParam(event, 'code') || ''
  const query = getRequestURL(event).search
  return sendRedirect(event, `/go/${encodeURIComponent(code)}${query}`, 301)
})
