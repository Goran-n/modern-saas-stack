#!/usr/bin/env bun

import { spawn } from 'child_process';
import { setupTestDatabase } from './src/__tests__/setup-db';

async function runTests() {
  try {
    console.log('Setting up test database...');
    await setupTestDatabase();
    
    console.log('Running tests...');
    const testProcess = spawn('bun', ['test', ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    testProcess.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (error) {
    console.error('Failed to run tests:', error);
    process.exit(1);
  }
}

runTests();