import type { Config } from 'drizzle-kit';

export default {
  schema: './packages/shared-db/src/schemas/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/kibly_test',
  },
} satisfies Config;