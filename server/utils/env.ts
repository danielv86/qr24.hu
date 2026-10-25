/**
 * Szerveroldali környezeti változó.
 *
 * A titkokat szándékosan a futásidejű `process.env`-ből olvassuk, nem a
 * `runtimeConfig`-ból: a runtimeConfig alapértékei ugyanis bekerülnek az éles
 * build artifactbe, így a jelszó és a munkamenet-titok a `.output` fájljaiban
 * landolna, és a telepítéskor már nem lehetne felülírni őket.
 */
export function serverEnv(key: string, fallback = ''): string {
  const value = process.env[key]
  return String(value === undefined ? fallback : value).trim()
}
