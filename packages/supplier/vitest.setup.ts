import { beforeAll } from 'vitest';

beforeAll(async () => {
  // Ensure TEST_DATABASE_URL is set
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL environment variable is required for tests');
  }

  console.log('✅ Test database URL set:', process.env.TEST_DATABASE_URL.replace(/:[^:@]+@/, ':***@'));
});