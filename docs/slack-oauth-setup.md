# Slack OAuth Setup Guide

This guide explains how to configure Slack OAuth for FIGGY in different environments.

## Environment Variables

Before setting up Slack OAuth, ensure you have the following environment variables configured:

```bash
# Required for OAuth callbacks
BASE_URL=https://your-api-domain.com  # Your API's public URL

# Required for Slack integration
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret

# For the web app
NUXT_PUBLIC_API_URL=https://your-api-domain.com  # Should match BASE_URL
```

## Development Setup

### 1. Using ngrok for local development

When developing locally, you'll need a public URL for Slack to send callbacks to. We recommend using ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start your API server (usually on port 5001)
npm run dev:api

# In another terminal, expose your API
ngrok http 5001

# You'll get a URL like: https://abc123.ngrok-free.app
```

### 2. Update your environment variables

```bash
# .env.local
BASE_URL=https://abc123.ngrok-free.app
NUXT_PUBLIC_API_URL=https://abc123.ngrok-free.app
```

### 3. Update Slack App Configuration

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your FIGGY app
3. Update the following settings:

#### OAuth & Permissions
- **Redirect URLs**: Add `https://abc123.ngrok-free.app/oauth/slack/callback`

#### Event Subscriptions
- **Request URL**: `https://abc123.ngrok-free.app/webhooks/slack`
- Slack will verify this URL immediately, so make sure your server is running

#### App Manifest (Alternative Method)
1. Go to "App Manifest" in the sidebar
2. Update the manifest with your ngrok URL:
   - Replace `https://50ebd208c219.ngrok-free.app` with your ngrok URL
3. Save changes

## Production Setup

### 1. Set environment variables

```bash
# Production environment variables
BASE_URL=https://api.yourdomain.com
NUXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 2. Update Slack App Configuration

Follow the same steps as development, but use your production URLs:
- **Redirect URLs**: `https://api.yourdomain.com/oauth/slack/callback`
- **Request URL**: `https://api.yourdomain.com/webhooks/slack`

## Testing the OAuth Flow

1. Start your servers:
   ```bash
   npm run dev:api  # API server
   npm run dev:web  # Web application
   ```

2. Navigate to the Slack installation page in your web app
3. Click "Add to Slack"
4. You should be redirected to Slack's OAuth consent page
5. After authorizing, you'll be redirected back to your app

## Troubleshooting

### "BASE_URL environment variable is required" error
- Make sure BASE_URL is set in your environment variables
- Restart your server after updating .env files

### Slack OAuth redirect fails
- Verify the redirect URL in Slack matches your BASE_URL exactly
- Check that your ngrok tunnel is still active (free tier has time limits)
- Ensure your API server is running and accessible

### Webhook verification fails
- Make sure SLACK_SIGNING_SECRET is correctly set
- Verify the webhook URL is accessible from the internet
- Check server logs for specific error messages

## Security Considerations

1. **Never commit sensitive values**: Keep SLACK_CLIENT_SECRET and SLACK_SIGNING_SECRET secure
2. **Use HTTPS in production**: BASE_URL should always use HTTPS in production
3. **Validate webhooks**: The app validates Slack signatures to ensure webhooks are authentic
4. **Scope limitations**: Only request the OAuth scopes your app actually needs