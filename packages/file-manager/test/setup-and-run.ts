#!/usr/bin/env bun
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

console.log('🚀 Setting up test environment...\n');

// Check if Docker is running
try {
  execSync('docker info', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Docker is not running. Please start Docker Desktop.');
  process.exit(1);
}

// Start test database
console.log('📦 Starting test database...');
try {
  execSync('docker compose -f ../docker-compose.test.yml up -d', { 
    stdio: 'inherit',
    cwd: path.dirname(import.meta.url).replace('file://', '')
  });
  
  // Wait for database to be ready
  console.log('⏳ Waiting for database to be ready...');
  let retries = 30;
  while (retries > 0) {
    try {
      execSync('docker exec figgy-test-db pg_isready -U test -d figgy_test', { 
        stdio: 'ignore' 
      });
      console.log('✅ Database is ready!\n');
      break;
    } catch (e) {
      retries--;
      if (retries === 0) {
        console.error('❌ Database failed to start');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
} catch (error) {
  console.error('❌ Failed to start test database:', error);
  process.exit(1);
}

// Run tests based on argument
const testType = process.argv[2] || 'all';

console.log(`🧪 Running ${testType} tests...\n`);

const testCommands: Record<string, string> = {
  'unit': 'SKIP_DB_SETUP=true vitest run test/unit',
  'integration': 'TEST_DATABASE_URL=postgresql://test:test@localhost:5433/figgy_test vitest run test/integration',
  'all': 'TEST_DATABASE_URL=postgresql://test:test@localhost:5433/figgy_test vitest run',
  'validate': 'SKIP_DB_SETUP=true vitest run test/unit/invoice-validation.test.ts',
  'simple': 'SKIP_DB_SETUP=true vitest run test/unit/simple-format.test.ts'
};

const command = testCommands[testType];
if (!command) {
  console.error(`❌ Unknown test type: ${testType}`);
  console.log('Available types: unit, integration, all, validate, simple');
  process.exit(1);
}

try {
  execSync(command, { stdio: 'inherit' });
  console.log('\n✅ Tests completed successfully!');
} catch (error) {
  console.error('\n❌ Tests failed');
  process.exit(1);
} finally {
  // Optionally stop database
  if (process.env.STOP_DB_AFTER_TEST === 'true') {
    console.log('\n🛑 Stopping test database...');
    execSync('docker compose -f ../docker-compose.test.yml down', { 
      stdio: 'inherit',
      cwd: path.dirname(import.meta.url).replace('file://', '')
    });
  } else {
    console.log('\n💡 Test database is still running. Stop with: docker compose -f ../docker-compose.test.yml down');
  }
}