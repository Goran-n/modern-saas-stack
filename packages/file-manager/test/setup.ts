import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { config } from 'dotenv';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Load test environment
config({ path: '.env.test' });

let testDb: PostgresJsDatabase<Record<string, never>> | undefined;

beforeAll(async () => {
  // Set minimal environment for tests
  process.env.NODE_ENV = 'test';
  process.env.PORT = process.env.PORT || '3000';
  process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  
  // For unit tests, we'll mock most dependencies
  console.log('🔧 Test environment ready');
});

beforeEach(async () => {
  // Reset mocks
});

afterEach(async () => {
  // Additional cleanup if needed
});

afterAll(async () => {
  console.log('✅ Tests completed');
});