import { defineConfig } from 'drizzle-kit'
import { getDatabaseConfig } from './src/config/config'

const dbConfig = getDatabaseConfig()

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbConfig.url || 'postgresql://localhost:5432/kibly',
  },
})