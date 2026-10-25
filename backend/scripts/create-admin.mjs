/**
 * Admin fiók létrehozása vagy jelszóváltása.
 *
 *   ADMIN_EMAIL=info@pixelweb.hu ADMIN_PASSWORD=... yarn admin:create
 *
 * A jelszó a bejelentkezésnél használt scrypt formátumban tárolódik, ugyanúgy,
 * mint a db:setup szkriptnél. Meglévő e-mail esetén a jelszó frissül.
 */
import { randomBytes, scrypt } from 'node:crypto'
import mariadb from 'mariadb'

const MIN_RECOMMENDED = 12

function scryptAsync(password, salt, keylen) {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      keylen,
      { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    )
  })
}

async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, 64)
  return `scrypt$16384$8$1$${salt.toString('base64')}$${derived.toString('base64')}`
}

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const password = String(process.env.ADMIN_PASSWORD || '')

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('HIBA: az ADMIN_EMAIL nem érvényes e-mail-cím.')
  process.exit(1)
}
if (password.length < 1) {
  console.error('HIBA: add meg az ADMIN_PASSWORD értéket.')
  process.exit(1)
}
if (password.length < MIN_RECOMMENDED) {
  console.warn(`FIGYELEM: a jelszó rövidebb ${MIN_RECOMMENDED} karakternél – éles környezetben használj hosszabbat.`)
}

const connection = await mariadb.createConnection({
  host: process.env.NUXT_DB_HOST || '127.0.0.1',
  port: Number(process.env.NUXT_DB_PORT || 3306),
  user: process.env.NUXT_DB_USER || 'qr24',
  password: process.env.NUXT_DB_PASSWORD || '',
  database: process.env.NUXT_DB_NAME || 'qr24',
  charset: 'utf8mb4',
})

try {
  const passwordHash = await hashPassword(password)
  await connection.query(
    `INSERT INTO admin_users (email, password_hash, role, failed_attempts, created_at, updated_at)
     VALUES (?, ?, 'admin', 0, NOW(3), NOW(3))
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), failed_attempts = 0, locked_until = NULL, updated_at = NOW(3)`,
    [email, passwordHash],
  )
  // Jelszóváltásnál a korábbi munkamenetek érvénytelenek.
  const [{ sessions }] = await connection.query(
    'SELECT COUNT(*) AS sessions FROM admin_sessions WHERE admin_id = (SELECT id FROM admin_users WHERE email = ?)',
    [email],
  )
  await connection.query(
    'DELETE FROM admin_sessions WHERE admin_id = (SELECT id FROM admin_users WHERE email = ?)',
    [email],
  )
  if (Number(sessions) > 0) console.log(`↷ Korábbi munkamenetek törölve: ${sessions}`)
  console.log(`✔ Admin fiók kész: ${email}`)
} finally {
  await connection.end()
}
