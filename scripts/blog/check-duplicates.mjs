import { posts as batch1 } from './posts-1.mjs'
import { posts as batch2 } from './posts-2.mjs'
import { posts as batch3 } from './posts-3.mjs'

/**
 * Belső ismétlődés-ellenőrző: nem külső forrásokhoz mér, hanem a 30 cikk egymáshoz
 * viszonyított szövegazonosságát nézi. Cél, hogy ne legyen két bejegyzés, ami
 * ugyanazokból a mondatokból épül fel.
 */
const posts = [...batch1, ...batch2, ...batch3]

function normalize(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, ' és ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const words = new Map(posts.map(post => [post.slug, normalize(post.content).split(' ')]))

function shingles(list, size) {
  const result = new Set()
  for (let index = 0; index + size <= list.length; index++) {
    result.add(list.slice(index, index + size).join(' '))
  }
  return result
}

function jaccard(a, b) {
  let intersection = 0
  for (const item of a) if (b.has(item)) intersection += 1
  return intersection / (a.size + b.size - intersection)
}

function longestCommonRun(a, b) {
  let best = { length: 0, text: '' }
  const previous = new Array(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = 0
    for (let j = 1; j <= b.length; j++) {
      const saved = previous[j]
      if (a[i - 1] === b[j - 1]) {
        previous[j] = diagonal + 1
        if (previous[j] > best.length) {
          best = { length: previous[j], text: a.slice(i - previous[j], i).join(' ') }
        }
      } else {
        previous[j] = 0
      }
      diagonal = saved
    }
  }
  return best
}

console.log(`Bejegyzések: ${posts.length}`)

// 1. Páronkénti shingle-átfedés (8 szavas ablak).
const shingleSets = posts.map(post => shingles(words.get(post.slug), 8))
const pairs = []
for (let i = 0; i < posts.length; i++) {
  for (let j = i + 1; j < posts.length; j++) {
    pairs.push({
      a: posts[i].slug,
      b: posts[j].slug,
      similarity: jaccard(shingleSets[i], shingleSets[j]),
    })
  }
}
pairs.sort((left, right) => right.similarity - left.similarity)
console.log('\nLegjobban hasonlító párok (8 szavas shingle Jaccard):')
for (const pair of pairs.slice(0, 8)) {
  console.log(`  ${(pair.similarity * 100).toFixed(2)}%  ${pair.a} ↔ ${pair.b}`)
}

// 2. Leghosszabb közös szósor a leginkább hasonló pároknál.
console.log('\nLeghosszabb közös szósor a három leginkább hasonló párnál:')
for (const pair of pairs.slice(0, 3)) {
  const run = longestCommonRun(words.get(pair.a), words.get(pair.b))
  console.log(`  ${pair.a} ↔ ${pair.b}: ${run.length} szó`)
  if (run.length) console.log(`    „${run.text}”`)
}

// 3. Bármely 10 szavas sor, ami egynél több bejegyzésben szerepel.
const index = new Map()
for (const post of posts) {
  const seen = new Set()
  const list = words.get(post.slug)
  for (let index2 = 0; index2 + 10 <= list.length; index2++) {
    const text = list.slice(index2, index2 + 10).join(' ')
    if (seen.has(text)) continue
    seen.add(text)
    if (!index.has(text)) index.set(text, new Set())
    index.get(text).add(post.slug)
  }
}
const shared = [...index.entries()].filter(([, slugs]) => slugs.size > 1)
console.log(`\nTöbb bejegyzésben is szereplő 10 szavas sorok: ${shared.length}`)
for (const [text, slugs] of shared.slice(0, 12)) {
  console.log(`  [${[...slugs].join(', ')}] „${text}”`)
}

// 4. Egy bejegyzésen belüli ismétlődő 10 szavas sorok.
console.log('\nCikken belüli ismétlődés:')
let selfRepeats = 0
for (const post of posts) {
  const list = words.get(post.slug)
  const seen = new Map()
  for (let i = 0; i + 10 <= list.length; i++) {
    const text = list.slice(i, i + 10).join(' ')
    seen.set(text, (seen.get(text) ?? 0) + 1)
  }
  const repeats = [...seen.entries()].filter(([, count]) => count > 1)
  if (repeats.length) {
    selfRepeats += repeats.length
    for (const [text] of repeats.slice(0, 3)) console.log(`  ${post.slug}: „${text}”`)
  }
}
console.log(`  összesen: ${selfRepeats}`)

// 5. Statisztika: hossz és szószám.
const lengths = posts.map(post => ({
  slug: post.slug,
  words: words.get(post.slug).length,
  title: post.title.length,
  excerpt: post.excerpt.length,
}))
console.log('\nHosszak:')
console.log(`  szavak: min ${Math.min(...lengths.map(l => l.words))}, max ${Math.max(...lengths.map(l => l.words))}`)
console.log(`  cím: max ${Math.max(...lengths.map(l => l.title))} karakter`)
console.log(`  kivonat: max ${Math.max(...lengths.map(l => l.excerpt))} karakter`)

const failures = []
if (pairs[0].similarity > 0.12) failures.push(`Túl hasonló pár: ${pairs[0].a} ↔ ${pairs[0].b} (${(pairs[0].similarity * 100).toFixed(1)}%)`)
if (shared.length > 0) failures.push(`${shared.length} közös 10 szavas sor`)
if (selfRepeats > 0) failures.push(`${selfRepeats} cikken belüli ismétlődés`)

console.log(failures.length ? `\nEREDMÉNY: javítás szükséges\n - ${failures.join('\n - ')}` : '\nEREDMÉNY: rendben')
if (failures.length) process.exitCode = 1
