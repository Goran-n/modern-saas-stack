/**
 * Simple post-commit hook manager for handling async side effects
 * 
 * This provides a way to execute operations after successful database commits
 * without blocking the main operation or causing rollbacks on failure.
 * 
 * Usage:
 * ```typescript
 * const postCommit = new PostCommitManager()
 * 
 * // Do main business logic
 * const user = await this.userRepo.save(...)
 * 
 * // Register async side effects
 * postCommit.addHook(async () => {
 *   await this.emailService.sendWelcome(user)
 * })
 * 
 * // Execute all hooks
 * await postCommit.execute()
 * ```
 */
export class PostCommitManager {
  private hooks: Array<() => Promise<void>> = []
  private logger: any

  constructor(logger?: any) {
    this.logger = logger || console
  }

  /**
   * Add a hook to be executed after commit
   * Hooks are executed in the order they were added
   */
  addHook(hook: () => Promise<void>): void {
    this.hooks.push(hook)
  }

  /**
   * Execute all registered hooks
   * 
   * - Hooks are executed sequentially
   * - Errors are logged but don't stop execution
   * - Hooks are cleared after execution
   */
  async execute(): Promise<void> {
    if (this.hooks.length === 0) {
      return
    }

    this.logger.info(`Executing ${this.hooks.length} post-commit hooks`)

    for (let i = 0; i < this.hooks.length; i++) {
      try {
        await this.hooks[i]()
      } catch (error) {
        // Log error but continue executing other hooks
        this.logger.error(`Post-commit hook ${i + 1} failed:`, error)
      }
    }

    // Clear hooks after execution
    this.hooks = []
  }

  /**
   * Get the number of registered hooks (useful for testing)
   */
  get hookCount(): number {
    return this.hooks.length
  }

  /**
   * Clear all hooks without executing them
   */
  clear(): void {
    this.hooks = []
  }
}