import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import { getConfig } from '@kibly/config';

// Load test environment variables
dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  // Validate configuration before running tests
  const config = getConfig();
  await config.validate();
  
  // Setup test database connection or any other global setup
  console.log('Starting test suite...');
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('Test suite completed.');
});