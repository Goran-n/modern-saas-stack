import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    
    // Timeout configuration
    testTimeout: 30000, // 30 seconds
    hookTimeout: 10000, // 10 seconds
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },
    
    // Test file patterns
    include: [
      'packages/**/test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'apps/**/test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      'packages/shared-testing/**', // Testing utilities themselves
    ],
    
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test-helpers/**',
        '**/test-utils/**',
        'packages/shared-testing/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    
    // Reporter configuration
    reporter: process.env.CI ? ['junit', 'github-actions'] : ['verbose'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
    
    // Retry configuration
    retry: process.env.CI ? 2 : 0,
    
    // Watch mode configuration
    watch: !process.env.CI,
    
    // Isolation configuration
    isolate: true,
    
    // Sequence configuration for deterministic test runs
    sequence: {
      shuffle: false,
      concurrent: true,
    },
    
    // Performance options
    maxConcurrency: 4,
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/figgy_test',
    },
  },
  
  // Resolve configuration for imports
  resolve: {
    alias: {
      '@figgy/shared-testing': path.resolve(__dirname, 'packages/shared-testing/src'),
      '@figgy/config': path.resolve(__dirname, 'packages/config/src'),
      '@figgy/shared-db': path.resolve(__dirname, 'packages/shared-db/src'),
      '@figgy/file-manager': path.resolve(__dirname, 'packages/file-manager/src'),
      '@figgy/utils': path.resolve(__dirname, 'packages/utils/src'),
      '@figgy/supplier': path.resolve(__dirname, 'packages/supplier/src'),
      '@figgy/jobs': path.resolve(__dirname, 'packages/jobs/src'),
    },
  },
  
  // Define configuration
  define: {
    __TEST__: true,
  },
});