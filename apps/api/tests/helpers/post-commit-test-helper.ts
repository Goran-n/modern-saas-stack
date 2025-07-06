/**
 * Test helper for PostCommitManager
 * Provides utilities for testing async operations with post-commit hooks
 */

import { PostCommitManager } from '../../src/core/application/base/post-commit-manager'

/**
 * Test implementation of PostCommitManager
 * Allows for synchronous execution in tests and hook inspection
 */
export class TestPostCommitManager extends PostCommitManager {
  public executedHooks: number = 0
  public executedSuccessfully: number = 0
  public executedWithError: number = 0
  public errors: Error[] = []
  private executeSync: boolean = false

  constructor(logger?: any, options?: { executeSync?: boolean }) {
    super(logger)
    this.executeSync = options?.executeSync || false
  }

  /**
   * Execute hooks with test tracking
   */
  async execute(): Promise<void> {
    this.executedHooks = this.hookCount
    
    // In test mode, we might want to skip execution entirely
    if (process.env.SKIP_POST_COMMIT === 'true') {
      return
    }
    
    // In sync mode, execute immediately
    if (this.executeSync) {
      await this.executeWithTracking()
      return
    }
    
    // Otherwise execute normally
    await super.execute()
  }

  /**
   * Execute hooks with detailed tracking
   */
  private async executeWithTracking(): Promise<void> {
    const hooks = this.getHooks()
    
    for (const hook of hooks) {
      try {
        await hook()
        this.executedSuccessfully++
      } catch (error) {
        this.executedWithError++
        this.errors.push(error as Error)
      }
    }
    
    this.clear()
  }

  /**
   * Get the registered hooks (for testing inspection)
   */
  private getHooks(): Array<() => Promise<void>> {
    // Access private hooks property
    return (this as any).hooks
  }

  /**
   * Reset all tracking counters
   */
  reset(): void {
    this.clear()
    this.executedHooks = 0
    this.executedSuccessfully = 0
    this.executedWithError = 0
    this.errors = []
  }

  /**
   * Assert that expected number of hooks were registered
   */
  expectHookCount(expected: number): void {
    if (this.hookCount !== expected) {
      throw new Error(`Expected ${expected} hooks, but got ${this.hookCount}`)
    }
  }

  /**
   * Assert that all hooks executed successfully
   */
  expectAllSuccess(): void {
    if (this.executedWithError > 0) {
      throw new Error(`${this.executedWithError} hooks failed with errors: ${this.errors.map(e => e.message).join(', ')}`)
    }
  }
}

/**
 * Create a mock logger for testing
 */
export function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}

/**
 * Helper to test post-commit hooks in isolation
 */
export async function testPostCommitHook(
  hook: () => Promise<void>,
  options?: { shouldThrow?: boolean }
): Promise<{ success: boolean; error?: Error }> {
  try {
    await hook()
    return { success: true }
  } catch (error) {
    if (options?.shouldThrow) {
      throw error
    }
    return { success: false, error: error as Error }
  }
}