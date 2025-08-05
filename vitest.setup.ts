import { beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { setupCustomMatchers } from '@figgy/shared-testing/assertions';

// Setup custom matchers globally
setupCustomMatchers();

// Global test configuration
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  
  // Disable console output during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    // Keep console.error for debugging test failures
  }
  
  // Set global timeout for async operations
  process.env.ASYNC_TIMEOUT = '30000';
});

// Clean up between tests
beforeEach(() => {
  // Reset any global state
  if (typeof vi !== 'undefined') {
    vi.clearAllMocks?.();
  }
});

afterEach(() => {
  // Clean up any resources
  // Force garbage collection if available (helps with memory leak detection)
  if (global.gc) {
    global.gc();
  }
});

afterAll(async () => {
  // Global cleanup
  // Close any persistent connections
  await new Promise(resolve => setTimeout(resolve, 100)); // Allow cleanup to complete
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log the error
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in tests, just log the error
});

// Extend global types for custom matchers
declare global {
  namespace Vi {
    interface AsymmetricMatchersContaining {
      toBeValidUUID(): any;
      toBeValidVATNumber(): any;
      toBeValidMimeType(expectedTypes?: string[]): any;
      toBeWithinRange(min: number, max: number): any;
      toHaveProcessingStatus(status: string): any;
      toContainMetadata(key: string, value?: any): any;
    }
  }
}