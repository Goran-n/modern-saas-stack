# Figgy Slack Installation Guide

## For Workspace Admins

### Step 1: Install Figgy to Your Slack Workspace

1. Visit your Figgy instance installation URL:
   ```
   https://YOUR_DOMAIN/oauth/slack/install?tenantId=YOUR_TENANT_ID
   ```

2. You'll be redirected to Slack to authorize Figgy
3. Click "Allow" to grant the necessary permissions
4. You'll be redirected back and see a success message

### Step 2: Invite Team Members

Once installed, team members can start using Figgy by:
- Direct messaging @Figgy Accounting
- Mentioning @Figgy Accounting in channels

## For End Users

### Getting Started

1. **First Time Setup**
   - Send a DM to @Figgy Accounting
   - Figgy will try to automatically link your Slack account if your email matches a Figgy account
   - If automatic linking fails, you'll receive a secure link to manually connect your account
   - Click the link to sign in to Figgy and select which organizations to connect
   - If you have access to multiple organizations, you can choose which ones to link

2. **Switching Organizations** (if you have access to multiple)
   ```
   @acme          - Switch to ACME organization
   @contoso hello - Switch to Contoso and send "hello"
   @@             - Show current organization
   @?             - List all your organizations
   ```

3. **Start Asking Questions**
   - "Show me this month's revenue"
   - "What's our cash position?"
   - "List unpaid invoices"

## Troubleshooting

### "Figgy app isn't properly configured"
- Contact your workspace admin to complete the installation
- Admin needs to visit the installation URL with proper tenant ID

### "No Figgy account found for your email"
- If automatic linking fails, click the provided link to manually connect your account
- Make sure you're signed in to Figgy with the correct account
- If you still can't connect, contact your Figgy administrator to grant access

### Manual Account Linking
1. Click the secure link provided by Figgy in Slack
2. Sign in to your Figgy account
3. Select which organizations you want to connect to Slack
4. Click "Link Selected Organizations"
5. Return to Slack and start using Figgy!

### Need Help?
Type `help` in a DM to @Figgy Accounting for available commands.