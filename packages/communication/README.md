# Communication Package

This package provides business logic for processing messages from WhatsApp (via Twilio) and Slack.

## Installation

```bash
bun add @kibly/communication
```

## Setup

### Environment Variables

For Twilio WhatsApp integration, set these environment variables:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token  
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Your Twilio WhatsApp number
```

## Usage in API Server

### Setting up WhatsApp Webhook Endpoint

In your API server (using Hono), add the webhook endpoint:

```typescript
import { Hono } from 'hono';
import { handleTwilioWhatsAppWebhook, handleWhatsAppVerification } from '@kibly/communication';

const app = new Hono();

// WhatsApp webhook endpoint
app.post('/webhooks/whatsapp', async (c) => {
  try {
    // Get the authenticated tenant/user from your auth middleware
    const tenantId = c.get('tenantId');
    const userId = c.get('userId');
    
    // Get the request body
    const body = await c.req.parseBody();
    
    // Process the webhook
    const result = await handleTwilioWhatsAppWebhook(body, tenantId, userId);
    
    if (result.success) {
      return c.json({ status: 'success', fileId: result.fileId });
    } else {
      return c.json({ status: 'error', error: result.error }, 400);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ status: 'error' }, 500);
  }
});

// WhatsApp webhook verification (GET request from Twilio)
app.get('/webhooks/whatsapp', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');
  
  const result = handleWhatsAppVerification(
    mode,
    token,
    challenge,
    'your-verify-token' // Set this to a secret value
  );
  
  if (result.verified && result.challenge) {
    return c.text(result.challenge);
  }
  
  return c.text('Forbidden', 403);
});
```

### Webhook Signature Verification

For production, add Twilio signature verification middleware:

```typescript
import { TwilioService } from '@kibly/communication';

// Create middleware for signature verification
const verifyTwilioSignature = async (c: Context, next: Next) => {
  const signature = c.req.header('X-Twilio-Signature');
  if (!signature) {
    return c.text('Unauthorized', 401);
  }
  
  const twilioService = new TwilioService();
  const url = c.req.url;
  const params = await c.req.parseBody();
  
  const isValid = twilioService.validateWebhookSignature(
    signature,
    url,
    params as Record<string, string>
  );
  
  if (!isValid) {
    return c.text('Unauthorized', 401);
  }
  
  await next();
};

// Use the middleware
app.post('/webhooks/whatsapp', verifyTwilioSignature, async (c) => {
  // ... webhook handler
});
```

## Testing with Twilio

1. Set up ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```

2. Configure your Twilio WhatsApp webhook URL:
   - Go to your Twilio Console
   - Navigate to Messaging > Settings > WhatsApp Sandbox Settings
   - Set webhook URL to: `https://your-ngrok-url.ngrok.io/webhooks/whatsapp`

3. Send a test message with a PDF to your Twilio WhatsApp number

## Architecture

The package is structured as follows:

- `services/` - External service integrations (Twilio, Slack)
- `parsers/` - Webhook payload parsers
- `operations.ts` - Core business logic for processing messages
- `handlers.ts` - High-level functions for API integration
- `types/` - TypeScript type definitions

## Message Processing Flow

1. Webhook received at API server
2. Payload parsed using platform-specific parser
3. Message processed:
   - Text messages: Logged only
   - Documents/Images: Downloaded and uploaded to file-manager
4. Processing job triggered via job queue
5. Result returned to API