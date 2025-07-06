# WhatsApp Integration Setup Guide

This guide explains how to set up and test the WhatsApp integration in Kibly.

## Architecture Overview

Kibly uses a **centralized Twilio account** for WhatsApp integration. Users don't need their own Twilio accounts - they simply verify their phone numbers to connect.

## Setup Steps

### 1. Configure Twilio Account

1. Sign up for a [Twilio account](https://www.twilio.com/try-twilio)
2. Set up the WhatsApp Sandbox or get approved for WhatsApp Business API
3. Note down your credentials:
   - Account SID
   - Auth Token  
   - WhatsApp number (format: `whatsapp:+14155238886`)

### 2. Configure Environment Variables

#### API (.env)
```bash
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
TWILIO_WEBHOOK_URL="https://your-domain.com/webhooks/twilio/whatsapp"
```

#### Frontend (.env)
```bash
# WhatsApp Configuration
VITE_KIBLY_WHATSAPP_NUMBER="+14155238886"
```

### 3. Set Up Webhook

Configure your Twilio WhatsApp webhook to point to:
```
https://your-domain.com/webhooks/twilio/whatsapp
```

For local development with ngrok:
```bash
ngrok http 3000
# Use the ngrok URL for TWILIO_WEBHOOK_URL
```

### 4. Run Database Migrations

```bash
cd apps/api
npm run db:migrate
```

## User Flow

1. **Registration**: User enters their WhatsApp phone number
2. **Verification**: System sends a 6-digit code via WhatsApp
3. **Activation**: User enters the code to verify ownership
4. **Usage**: User can now send documents to Kibly's WhatsApp number

## Testing

### Manual Testing

1. Start the services:
   ```bash
   # Terminal 1 - API
   cd apps/api
   doppler run -- npm run dev
   
   # Terminal 2 - Frontend
   cd apps/web
   npm run dev
   ```

2. Navigate to Communications > WhatsApp
3. Click "Connect WhatsApp"
4. Enter your phone number
5. Check WhatsApp for the verification code
6. Enter the code to complete setup

### Automated Testing

Run the end-to-end test script:
```bash
cd apps/api
doppler run -- npx tsx scripts/test-whatsapp-flow.ts
```

## Webhook Testing

Test the webhook endpoint directly:
```bash
curl -X POST http://localhost:3000/webhooks/twilio/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890" \
  -d "To=whatsapp:+14155238886" \
  -d "Body=Test message" \
  -d "MessageSid=SM1234567890" \
  -d "NumMedia=0"
```

## Troubleshooting

### Common Issues

1. **"Twilio is not configured" error**
   - Ensure all Twilio environment variables are set
   - Check that doppler is running with the correct config

2. **Verification code not received**
   - Check Twilio logs for errors
   - Ensure the phone number has WhatsApp installed
   - Verify webhook URL is accessible

3. **Webhook signature validation failing**
   - Ensure TWILIO_WEBHOOK_URL matches exactly
   - Check for trailing slashes
   - Verify ngrok URL is updated if using locally

### Debug Mode

Enable detailed logging:
```bash
LOG_LEVEL=debug doppler run -- npm run dev
```

## Security Considerations

1. **Phone Verification**: All numbers must be verified before use
2. **Rate Limiting**: Verification codes have a 60-second cooldown
3. **Expiration**: Verification codes expire after 10 minutes
4. **Webhook Validation**: Twilio signatures are validated for all webhooks

## Production Checklist

- [ ] Production Twilio account with WhatsApp Business API approval
- [ ] Secure webhook URL with HTTPS
- [ ] Environment variables properly configured
- [ ] Database migrations run
- [ ] Monitoring and alerting set up
- [ ] Rate limiting configured
- [ ] Error handling tested