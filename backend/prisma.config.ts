import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const host = process.env.NUXT_DB_HOST || '127.0.0.1'
const port = process.env.NUXT_DB_PORT || '3306'
const database = process.env.NUXT_DB_NAME || 'qr24'
const user = process.env.NUXT_DB_USER || 'root'
const password = process.env.NUXT_DB_PASSWORD || ''

const encodedUser = encodeURIComponent(user)
const encodedPassword = encodeURIComponent(password)
const credentials = password ? `${encodedUser}:${encodedPassword}` : encodedUser
const defaultUrl = `mysql://${credentials}@${host}:${port}/${database}`

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL || defaultUrl,
  },
})
