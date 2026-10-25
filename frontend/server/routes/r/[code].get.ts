import { defineEventHandler, getHeader, getRequestURL, send, setResponseHeader, setResponseStatus } from 'h3'

/**
 * A dinamikus QR-kódok rövid címe (/r/abc123) a külön futó Nitro backendre
 * mutat. Ez a vékony átjáró gondoskodik róla, hogy a böngésző ugyanazon az
 * originon maradjon, és a backend lássa a teljes útvonalat. Az átirányítást
 * nem követjük le, hanem változatlan státusszal adjuk tovább.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const url = getRequestURL(event)
  const target = `${String(config.backendUrl).replace(/\/$/, '')}${url.pathname}${url.search}`

  const forward = new Headers()
  for (const name of ['user-agent', 'accept-language', 'referer', 'cf-ipcountry', 'x-vercel-ip-country']) {
    const value = getHeader(event, name)
    if (value) forward.set(name, value)
  }

  let response: Response
  try {
    response = await fetch(target, { headers: forward, redirect: 'manual' })
  } catch {
    setResponseStatus(event, 503)
    setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    return send(event, '<!doctype html><meta charset="utf-8"><title>Átmeneti hiba</title><p>A QR-kód szolgáltatás átmenetileg nem elérhető.</p>', 'text/html; charset=utf-8')
  }

  setResponseStatus(event, response.status)
  for (const name of ['content-type', 'location', 'cache-control', 'x-robots-tag', 'retry-after']) {
    const value = response.headers.get(name)
    if (value) setResponseHeader(event, name, value)
  }
  setResponseHeader(event, 'x-qr-gateway', '1')

  if (response.status >= 300 && response.status < 400) return null
  return send(event, await response.text(), response.headers.get('content-type') || 'text/html; charset=utf-8')
})
