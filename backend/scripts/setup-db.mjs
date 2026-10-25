import { readFile, readdir } from 'node:fs/promises'
import { randomBytes, scrypt } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import mariadb from 'mariadb'

const DB_NAME_PATTERN = /^[A-Za-z0-9_]+$/

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

async function applyMigrations(connection) {
  const migrationsDir = fileURLToPath(new URL('../prisma/migrations', import.meta.url))
  const entries = (await readdir(migrationsDir, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()

  await connection.query(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      finished_at DATETIME(3) NULL,
      migration_name VARCHAR(255) NOT NULL,
      logs TEXT NULL,
      rolled_back_at DATETIME(3) NULL,
      started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      applied_steps_count INT UNSIGNED NOT NULL DEFAULT 0
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)

  const applied = new Set(
    (await connection.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL'))
      .map(row => row.migration_name),
  )

  for (const name of entries) {
    if (applied.has(name)) {
      console.log(`   ↷ ${name} (már alkalmazva)`)
      continue
    }
    const sql = await readFile(`${migrationsDir}/${name}/migration.sql`, 'utf8')
    await connection.beginTransaction()
    try {
      await connection.query(sql)
      await connection.query(
        `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)
         VALUES (UUID(), SHA2(?, 256), NOW(3), ?, 1)`,
        [sql, name],
      )
      await connection.commit()
      console.log(`   ✓ ${name}`)
    } catch (error) {
      await connection.rollback()
      throw error
    }
  }
}

async function main() {
  const host = process.env.NUXT_DB_HOST || '127.0.0.1'
  const port = Number(process.env.NUXT_DB_PORT || 3306)
  const database = process.env.NUXT_DB_NAME || 'qr24'
  const user = process.env.NUXT_DB_USER || ''
  const password = process.env.NUXT_DB_PASSWORD || ''
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const adminPassword = String(process.env.ADMIN_PASSWORD || '')

  if (!user) {
    throw new Error('Hiányzik a NUXT_DB_USER környezeti változó.')
  }
  if (!DB_NAME_PATTERN.test(database)) {
    throw new Error('A NUXT_DB_NAME csak betűket, számokat és aláhúzást tartalmazhat.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error('Az ADMIN_EMAIL nem érvényes e-mail-cím.')
  }
  if (adminPassword.length < 12) {
    throw new Error('Az ADMIN_PASSWORD legalább 12 karakter legyen.')
  }

  const baseConnection = await mariadb.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
    charset: 'utf8mb4',
  })

  try {
    await baseConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
  } finally {
    await baseConnection.end()
  }

  // A mariadb driver MySQL ellen nem támogatja a changeUser()-t, ezért új
  // kapcsolatot nyitunk közvetlenül a létrehozott adatbázisra.
  const connection = await mariadb.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
    charset: 'utf8mb4',
  })

  try {
    console.log('📦 Prisma migrációk alkalmazása:')
    await applyMigrations(connection)

    const passwordHash = await hashPassword(adminPassword)
    await connection.query(
      `INSERT INTO admin_users (email, password_hash, role)
       VALUES (?, ?, 'admin')
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         role = 'admin',
         failed_attempts = 0,
         locked_until = NULL`,
      [adminEmail, passwordHash],
    )

    console.log('✅ Az adatbázis-séma elkészült, az adminisztrátor fiók beállítva.')
    console.log(`   Admin e-mail: ${adminEmail}`)
    console.log('   A jelszót a beállítás során megadott értékre állítottuk (nem jelenítjük meg).')
    console.log('   A titkokat (.env) soha ne commitold.')

    if (!process.env.NUXT_SESSION_SECRET || !process.env.NUXT_HASH_SECRET) {
      console.warn('⚠️  A NUXT_SESSION_SECRET és NUXT_HASH_SECRET nincs beállítva – az admin és a rate limit nem fog működni.')
      console.warn('   Generálás: openssl rand -base64 48')
    }
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error('❌ Az adatbázis inicializálása sikertelen:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
