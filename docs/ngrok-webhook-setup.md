# Setting Up ngrok for Microsoft Graph Webhooks

This guide explains how to set up ngrok for local development with Microsoft Graph webhooks.

## Prerequisites

- ngrok account (free tier is sufficient)
- Local development environment running

## Installation

1. **Install ngrok**
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Sign up and authenticate**
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

## Configuration

1. **Start your local API server**
   ```bash
   cd apps/api
   doppler run -- npm run dev
   # Should be running on port 8020
   ```

2. **Start ngrok tunnel**
   ```bash
   ngrok http 8020
   ```

3. **Copy the HTTPS URL**
   You'll see output like:
   ```
   Forwarding https://abc123.ngrok.io -> http://localhost:8020
   ```
   
   Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. **Update your environment variables**
   Update the BASE_URL in Doppler:
   ```bash
   # Set the variable in Doppler
   doppler secrets set BASE_URL https://abc123.ngrok.io
   
   # Or update it in the Doppler dashboard
   # https://dashboard.doppler.com
   ```

## Azure App Registration Setup

1. **Navigate to Azure Portal**
   - Go to https://portal.azure.com
   - Navigate to "App registrations"
   - Find your application

2. **Update Redirect URIs**
   - Go to "Authentication"
   - Add your ngrok URL to redirect URIs:
     - `https://abc123.ngrok.io/settings/oauth-callback`

3. **Verify API Permissions**
   Ensure these permissions are granted:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `User.Read`
   - `offline_access`

## Testing Webhooks

1. **Initiate OAuth connection**
   - Go to your local web app
   - Navigate to Settings > Integrations
   - Click "Connect" on Outlook
   - Complete the OAuth flow

2. **Verify webhook subscription**
   Check API logs for:
   ```
   Webhook validation for outlook: [validation_token]
   Outlook webhook subscription created: {
     subscriptionId: "...",
     resource: "me/mailFolders('Inbox')/messages",
     ...
   }
   ```

3. **Test webhook notifications**
   - Send an email to the connected account
   - Check API logs for:
     ```
     Webhook received for outlook: {
       hasValue: true,
       valueCount: 1,
       ...
     }
     ```

## Troubleshooting

### Webhook validation fails
- Ensure ngrok is running and forwarding to the correct port
- Check that BASE_URL is set correctly
- Verify the API server is running

### No webhooks received
- Check Azure portal for any error notifications
- Ensure the email account has proper permissions
- Verify the subscription hasn't expired (max 3 days for mail resources)

### ngrok session expires
- Free ngrok sessions expire after 2 hours
- Restart ngrok and update BASE_URL
- Re-initiate OAuth connection to update webhook URL

## Production Deployment

For production:
1. Use a proper domain with SSL certificate
2. Update BASE_URL to your production API URL
3. Add production redirect URIs in Azure
4. Consider implementing webhook subscription renewal (every 3 days)

## Security Notes

- Never commit ngrok URLs to version control
- ngrok URLs are public - ensure proper authentication
- Use environment variables for configuration
- Implement proper webhook signature validation in production