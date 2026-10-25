import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// A Nuxt saját aliasai (`~`, `#shared`) itt is kellenek, mert a tesztek
// közvetlenül importálják az app/shared/server fájlokat Nuxt nélkül.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('.', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
})
