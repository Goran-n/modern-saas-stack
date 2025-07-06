# WhatsApp Orchestrator Debugging Guide

## Issue Summary
The orchestrator was failing because WhatsApp messages were being queued but the user channel lookup was failing. This was likely due to:
1. No registered WhatsApp channels in the database
2. Phone number format mismatches
3. Unverified channels

## Fixes Applied

### 1. Enhanced Error Logging
- Added detailed logging in conversation processor for orchestration jobs
- Added logging in orchestration service for each step of processing
- Now logs phone number formats and channel lookup results

### 2. Improved Error Handling
- Added try-catch blocks around messaging service calls
- Better error messages for missing channels
- Graceful handling of unverified channels

### 3. Phone Number Format Consistency
- Webhook removes 'whatsapp:' prefix from numbers
- Orchestration service handles both formats
- Messaging service adds prefix back when needed

### 4. Testing Scripts
Created two helper scripts:

#### Check WhatsApp Channels
```bash
bun run src/scripts/check-whatsapp-channels.ts
```
Lists all registered WhatsApp channels in the database.

#### Register Test WhatsApp Channel
```bash
bun run src/scripts/register-test-whatsapp.ts <phoneNumber> <userId> <tenantId>
# Example:
bun run src/scripts/register-test-whatsapp.ts +1234567890 user123 tenant123
```
Registers and auto-verifies a WhatsApp channel for testing.

## Testing Steps

1. **Check Current Channels**:
   ```bash
   doppler run -- bun run src/scripts/check-whatsapp-channels.ts
   ```

2. **Register a Test Channel** (if needed):
   ```bash
   doppler run -- bun run src/scripts/register-test-whatsapp.ts +YOUR_PHONE user123 tenant123
   ```
   Replace:
   - `+YOUR_PHONE` with the phone number sending WhatsApp messages
   - `user123` with a valid user ID from your database
   - `tenant123` with a valid tenant ID from your database

3. **Monitor Logs**:
   When you send a WhatsApp message, you should now see:
   - "Processing orchestration job" - Job started
   - "Processing async orchestration request" - Orchestration service received it
   - "Getting or creating conversation" - Conversation handling
   - "Processing orchestration message" - AI processing
   - "Sent orchestration response" - Response sent

4. **Common Issues**:
   - **"Message from unknown WhatsApp number"**: The phone number isn't registered
   - **"Channel not verified"**: Run the register script with auto-verify
   - **"OrchestrationService not found"**: DI container issue, restart the server

## Configuration Requirements

Ensure these are set in Doppler:
- `PORTKEY_API_KEY` (default: "J72HF+PznENJaQA6xqkaB4zsa51u")
- `PORTKEY_VIRTUAL_KEY` (default: "anthropic-virtu-de63f7")
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `TWILIO_WEBHOOK_URL`

## Next Steps

1. Register your WhatsApp number using the script
2. Send a test message
3. Check the logs for the new detailed output
4. The orchestrator should now process messages successfully

If issues persist, check:
- Database for user and tenant records
- Redis connection for job queuing
- Twilio webhook configuration
- Network connectivity to Portkey AI