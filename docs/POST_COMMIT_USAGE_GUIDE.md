# Post-Commit Hook Usage Guide

## Overview

The PostCommitManager provides a simple way to handle async operations that should run after your main business logic completes successfully. This is perfect for operations like:

- Sending emails
- Updating caches
- Tracking analytics
- Triggering webhooks
- Any operation that shouldn't block or rollback the main transaction

## Basic Usage

```typescript
import { PostCommitManager } from '../core/application/base/post-commit-manager'

async function createUser(data: CreateUserDto) {
  const postCommit = new PostCommitManager(logger)
  
  // Main business logic
  const user = await userRepository.save(new User(data))
  
  // Register async side effects
  postCommit.addHook(async () => {
    await emailService.sendWelcomeEmail(user.email)
  })
  
  postCommit.addHook(async () => {
    await analytics.track('user.created', { userId: user.id })
  })
  
  // Execute all hooks (errors are logged but don't throw)
  await postCommit.execute()
  
  return user
}
```

## Key Benefits

1. **No Blocking**: Side effects don't slow down the main operation
2. **No Rollback**: Email failures don't rollback user creation
3. **Simple Testing**: Easy to mock or disable in tests
4. **Clear Intent**: Makes it obvious what's core logic vs side effects

## Testing

In tests, you can:

```typescript
// Skip all post-commit hooks
process.env.SKIP_POST_COMMIT = 'true'

// Or use the test helper
import { TestPostCommitManager } from '../tests/helpers/post-commit-test-helper'

// Mock the PostCommitManager
jest.mock('../core/application/base/post-commit-manager', () => ({
  PostCommitManager: TestPostCommitManager
}))
```

## When to Use

✅ **Use PostCommit for:**
- Sending notifications (email, SMS, Slack)
- Updating caches or search indexes
- Tracking analytics events
- Triggering webhooks to external systems
- Any async operation that can fail independently

❌ **Don't Use PostCommit for:**
- Critical business logic
- Operations that must succeed together
- Data that needs immediate consistency
- User-facing synchronous operations

## Examples in Our Codebase

### ConversationService
- Processes media files asynchronously
- Sends auto-reply messages without blocking

### TenantService  
- Sends welcome emails after tenant creation
- Tracks analytics events

## Migration from Direct Calls

Before:
```typescript
// Everything blocks and can fail together
const user = await userRepository.save(...)
await emailService.sendWelcome(user) // Blocks!
await analytics.track('user.created') // Blocks!
```

After:
```typescript
// Core logic completes fast, side effects run async
const user = await userRepository.save(...)

postCommit.addHook(async () => {
  await emailService.sendWelcome(user)
})
postCommit.addHook(async () => {
  await analytics.track('user.created')
})

await postCommit.execute()
```

## Best Practices

1. **Keep hooks independent** - One hook's failure shouldn't affect others
2. **Log meaningful errors** - Include context about what failed
3. **Make hooks idempotent** - Safe to retry if needed
4. **Test both success and failure** - Ensure failures don't break main flow
5. **Document side effects** - Make it clear what happens after commit