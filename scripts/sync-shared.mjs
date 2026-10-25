#!/usr/bin/env node
/**
 * A közös kód (tartalom, QR-típusok, csomaglimitek, SEO-segédek) egy helyen, a
 * gyökér `shared/` mappában él. A Nuxt és a Nitro viszont csak a saját
 * gyökerén belüli `#shared` aliast látja megbízhatóan, ezért a két alkalmazás
 * kap egy másolatot, amit ez a szkript tart szinkronban.
 *
 *   node scripts/sync-shared.mjs          # másolás a két appba
 *   node scripts/sync-shared.mjs --check  # csak ellenőrzés (CI), eltérésre 1
 */
import { cp, readdir, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = join(root, 'shared')
const targets = [join(root, 'frontend', 'shared'), join(root, 'backend', 'shared')]
const checkOnly = process.argv.includes('--check')

/** @param {string} dir @param {string} [base] @returns {Promise<string[]>} */
async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)))
    else if (entry.isFile()) files.push(relative(base, full).split('\\').join('/'))
  }
  return files.sort()
}

const sourceFiles = await listFiles(source)
let drift = false

if (!checkOnly) {
  for (const target of targets) {
    await rm(target, { recursive: true, force: true })
    await cp(source, target, { recursive: true })
  }
}

for (const target of targets) {
  const label = relative(root, target).split('\\').join('/')
  if (!existsSync(target)) {
    console.error(`✖ hiányzó mappa: ${label}`)
    drift = true
    continue
  }
  const targetFiles = await listFiles(target)
  for (const file of sourceFiles) {
    if (!targetFiles.includes(file)) {
      console.error(`✖ hiányzik: ${label}/${file}`)
      drift = true
      continue
    }
    const [a, b] = await Promise.all([readFile(join(source, file), 'utf8'), readFile(join(target, file), 'utf8')])
    if (a !== b) {
      console.error(`✖ eltér: ${label}/${file}`)
      drift = true
    }
  }
  for (const file of targetFiles) {
    if (!sourceFiles.includes(file)) {
      console.error(`✖ felesleges (nincs a gyökér shared/ alatt): ${label}/${file}`)
      drift = true
    }
  }
}

if (drift && checkOnly) {
  console.error('\nA frontend/shared és backend/shared eltér a gyökér shared/ mappától. Futtasd: node scripts/sync-shared.mjs')
  process.exit(1)
}

console.log(checkOnly ? '✔ A megosztott kód szinkronban van.' : `✔ Megosztott kód átmásolva (${sourceFiles.length} fájl).`)
