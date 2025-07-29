# @figgy/email-ingestion

Email attachment ingestion system for Figgy. Automatically reads emails from Gmail, Outlook, and IMAP providers, extracts attachments, and processes invoices/receipts through the document pipeline.

## Features

- **Multi-provider support**: Gmail (OAuth), Outlook (OAuth), IMAP (credentials)
- **Real-time processing**: Webhooks for Gmail (Pub/Sub) and Outlook (Graph)
- **Secure credential storage**: AES-256 encryption for tokens and passwords
- **Attachment filtering**: MIME type and size validation
- **Rate limiting**: Per-tenant limits on processing
- **Deduplication**: Prevents processing the same email multiple times
- **Background processing**: Async jobs via Trigger.dev

## Architecture

```
Email Provider → Webhook/Polling → Message Queue → Attachment Processor → File Manager
                                                           ↓
                                                   Document Extraction
```

## Usage

### 1. Create Email Connection

```typescript
import { createEmailProvider, EmailProvider } from "@figgy/email-ingestion";

// Via API
const connection = await trpc.email.createConnection.mutate({
  provider: "gmail",
  emailAddress: "receipts@company.com",
  folderFilter: ["INBOX"],
  senderFilter: ["*@supplier.com"],
  subjectFilter: ["invoice", "receipt"],
});
```

### 2. OAuth Authentication

```typescript
// Get OAuth URL
const { authUrl } = await trpc.email.getOAuthUrl.mutate({
  connectionId: connection.connectionId,
  redirectUri: `${window.location.origin}/settings/email/callback`,
});

// Redirect user to authUrl
window.location.href = authUrl;

// Handle callback
await trpc.email.handleOAuthCallback.mutate({
  provider: "gmail",
  code: searchParams.get("code"),
  state: searchParams.get("state"),
});
```

### 3. IMAP Configuration

```typescript
// Set IMAP credentials
await trpc.email.setIMAPCredentials.mutate({
  connectionId: connection.connectionId,
  host: "imap.gmail.com",
  port: 993,
  username: "user@gmail.com",
  password: "app-specific-password",
});
```

## Providers

### Gmail
- OAuth 2.0 authentication
- Real-time webhooks via Google Pub/Sub
- Supports labels and advanced search

### Outlook/Office 365
- OAuth 2.0 with Microsoft Identity
- Microsoft Graph webhooks
- Works with personal and business accounts

### IMAP
- Standard IMAP protocol
- Supports any IMAP server
- Requires app-specific passwords for Gmail/Outlook

## Configuration

### Environment Variables

```bash
# Gmail
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_PUBSUB_TOPIC=projects/your-project/topics/gmail-push

# Outlook
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=common

# Security
JWT_SECRET=your-32-char-min-secret
```

### Database Schema

The package creates these tables:
- `email_connections` - Stores connection config and encrypted credentials
- `email_processing_log` - Tracks processed emails and attachments
- `email_rate_limits` - Per-tenant processing limits

## Security

- **Encryption**: All credentials encrypted with AES-256-GCM
- **Token refresh**: Automatic OAuth token refresh
- **Rate limiting**: Prevents abuse and overload
- **Audit trail**: Complete log of all operations
- **GDPR compliant**: Minimal data retention, encrypted storage

## Processing Flow

1. **Email Detection**
   - Webhook notification or polling trigger
   - Filter by folder, sender, subject

2. **Attachment Extraction**
   - Download attachments matching criteria
   - Validate MIME type and size
   - Optional virus scanning

3. **File Upload**
   - Upload to Supabase storage
   - Create file record with metadata
   - Trigger document extraction

4. **Status Update**
   - Mark email as read
   - Update processing log
   - Track success/failure

## API Reference

### TRPC Routes

- `email.listConnections` - List all email connections
- `email.createConnection` - Create new connection
- `email.getOAuthUrl` - Get OAuth authorization URL
- `email.handleOAuthCallback` - Complete OAuth flow
- `email.setIMAPCredentials` - Configure IMAP
- `email.updateConnection` - Update filters/settings
- `email.deleteConnection` - Remove connection
- `email.getConnectionStats` - Get processing statistics
- `email.syncConnection` - Trigger manual sync

### Webhook Endpoints

- `POST /email/webhook/gmail` - Gmail push notifications
- `POST /email/webhook/outlook` - Microsoft Graph notifications
- `GET /email/oauth/callback` - OAuth callback handler

## Development

### Testing Email Providers

```typescript
// Test connection
const provider = createEmailProvider(EmailProvider.GMAIL);
await provider.connect(config, tokens);
const folders = await provider.listFolders();
const messages = await provider.listMessages("INBOX", { limit: 10 });
await provider.disconnect();
```

### Manual Processing

```typescript
const processor = new AttachmentProcessor();
const result = await processor.processEmail(
  connectionConfig,
  emailMessage,
  tokens
);
```

## Troubleshooting

### Common Issues

1. **OAuth errors**: Check redirect URI matches exactly
2. **IMAP connection failed**: Enable app-specific passwords
3. **Webhooks not working**: Verify BASE_URL is publicly accessible
4. **Rate limits hit**: Adjust limits in email_rate_limits table

### Debug Logging

```bash
LOG_LEVEL=debug bun run dev
```

Logs include:
- Provider connections
- OAuth flows
- Webhook receipts
- Processing steps
- Error details