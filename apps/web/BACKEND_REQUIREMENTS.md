# Backend Requirements for Communication UI

This document lists all the TRPC endpoints that need to be implemented for the Communication UI to function properly.

## Required TRPC Endpoints

### 1. Communication Statistics
```typescript
// Endpoint: /trpc/communication.getStats
// Returns: CommunicationStats
{
  totalMessages: number
  whatsappMessages: number
  slackMessages: number
  filesProcessedToday: number
  failedProcessing: number
  pendingVerifications: number
}
```

### 2. Recent Activity
```typescript
// Endpoint: /trpc/communication.getRecentActivity
// Returns: RecentActivity[]
{
  id: string
  platform: 'whatsapp' | 'slack'
  type: 'message' | 'file' | 'verification'
  description: string
  status: 'success' | 'pending' | 'failed'
  timestamp: string
  metadata?: Record<string, any>
}[]
```

### 3. WhatsApp Verifications
```typescript
// Endpoint: /trpc/communication.getVerifications
// Returns: WhatsAppVerification[]
{
  id: string
  phoneNumber: string
  tenantId: string
  userId: string
  verificationCode: string
  verified: boolean
  expiresAt: string
  createdAt: string
}[]
```

### 4. Update Verification
```typescript
// Endpoint: /trpc/communication.updateVerification
// Input: { id: string, verified: boolean }
// Returns: success boolean
```

### 5. Slack Workspaces
```typescript
// Endpoint: /trpc/communication.getWorkspaces
// Returns: SlackWorkspace[]
{
  id: string
  workspaceId: string
  workspaceName?: string
  tenantId: string
  botToken: string
  botUserId: string
  createdAt: string
  updatedAt: string
  userCount?: number
  channelCount?: number
}[]
```

### 6. Retry Failed Processing
```typescript
// Endpoint: /trpc/communication.retryProcessing
// Input: { activityId: string }
// Returns: success boolean
```

## Database Queries Needed

These endpoints will need to query the following tables:
- `whatsapp_verifications` - For verification management
- `whatsapp_mappings` - For verified phone numbers
- `slack_workspaces` - For Slack workspace info
- `slack_user_mappings` - For Slack user counts
- `files` - For processing statistics
- Activity logs (may need a new table for tracking communication events)

## Implementation Notes

1. **Statistics Calculation**:
   - `totalMessages`: Count of all processed messages
   - `filesProcessedToday`: Count files where `createdAt` is today and `source` is 'whatsapp' or 'slack'
   - `failedProcessing`: Count files where `processingStatus` is 'failed'
   - `pendingVerifications`: Count from `whatsapp_verifications` where `verified = false` and `expiresAt > now()`

2. **Recent Activity**:
   - This might require a new `communication_activity` table to track events
   - Or aggregate from multiple sources (files, verifications, etc.)

3. **Security**:
   - All endpoints must check tenant access
   - Use the existing TRPC context for authentication
   - Filter results by `tenantId`

4. **Real-time Updates**:
   - Consider using TRPC subscriptions for real-time activity updates
   - Or implement polling on the frontend