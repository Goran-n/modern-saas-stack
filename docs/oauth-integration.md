# OAuth Integration System

## Overview

The OAuth integration system provides a unified, reusable framework for connecting external services like Gmail, Outlook, Slack, GitHub, and more. It handles authentication, token management, and webhook subscriptions automatically.

## Architecture

### Core Components

1. **OAuth Providers** (`packages/oauth/src/providers/`)
   - Base provider interface defining common OAuth operations
   - Provider-specific implementations (Google, Microsoft, Slack, etc.)
   - Provider registry for managing available integrations

2. **Database Schema** (`packages/shared-db/src/schemas/oauth-connections.ts`)
   - Unified `oauth_connections` table storing all OAuth connections
   - Encrypted token storage
   - Connection status tracking
   - Provider-specific metadata support

3. **tRPC Router** (`packages/trpc/src/routers/oauth.ts`)
   - `getAvailableProviders` - List configured OAuth providers
   - `getConnections` - Retrieve existing connections
   - `initiateOAuth` - Start OAuth flow
   - `handleOAuthCallback` - Process OAuth callbacks
   - `revokeConnection` - Remove connections
   - `refreshToken` - Manually refresh tokens

4. **Token Management** (`packages/oauth/src/services/token-manager.ts`)
   - Automatic token refresh before expiration
   - Connection health monitoring
   - Batch token refresh operations
   - Webhook subscription renewal

5. **Cron Service** (`packages/oauth/src/services/cron.ts`)
   - Runs every 5 minutes to refresh expiring tokens
   - Renews webhooks every hour
   - Cleans up expired connections daily

## Adding a New OAuth Provider

### 1. Create Provider Implementation

```typescript
// packages/oauth/src/providers/github.ts
import { OAuthProvider } from "./base";
import type { OAuthTokens } from "../types";

export class GitHubOAuthProvider extends OAuthProvider {
  get name(): string {
    return "github";
  }

  get displayName(): string {
    return "GitHub";
  }

  get icon(): string {
    return "logos:github-icon";
  }

  get authorizationUrl(): string {
    return "https://github.com/login/oauth/authorize";
  }

  get tokenUrl(): string {
    return "https://github.com/login/oauth/access_token";
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokens> {
    // Implementation specific to GitHub's OAuth flow
  }

  async getUserInfo(accessToken: string): Promise<{
    id: string;
    email?: string;
    name?: string;
    metadata?: Record<string, any>;
  }> {
    // Fetch user info from GitHub API
  }
}
```

### 2. Register Provider

Update the provider registry in `packages/oauth/src/providers/registry.ts`:

```typescript
// GitHub OAuth
if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
  this.register(
    new GitHubOAuthProvider({
      clientId: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
      scopes: ["user:email", "repo"],
    }),
  );
}
```

### 3. Add Configuration

Add environment variables to Doppler:
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Update configuration schema if needed in `packages/config/src/schemas/`.

## Frontend Integration

### 1. Add OAuth Connection Modal

```vue
<template>
  <AddOAuthConnectionModal 
    v-model="showModal"
    :filter-provider="gmail"
    @success="handleSuccess"
  />
</template>
```

### 2. OAuth Callback Page

The system includes a generic OAuth callback page at `/settings/integrations/oauth-callback` that handles all provider callbacks automatically.

### 3. Display Connections

```vue
<script setup>
const connections = await $trpc.oauth.getConnections.query({
  provider: 'gmail' // optional filter
})
</script>
```

## Security Considerations

1. **Token Encryption**: All OAuth tokens are encrypted using AES-256-GCM before storage
2. **State Parameter**: OAuth state includes encrypted tenant/user IDs with timestamp validation
3. **HTTPS Required**: All OAuth redirects must use HTTPS in production
4. **Scope Limitation**: Request only necessary scopes for each provider
5. **Token Rotation**: Automatic token refresh prevents long-lived token exposure

## Testing

Run the OAuth test script to validate your implementation:

```bash
bun run scripts/test-oauth.ts
```

This will:
- Check database connectivity
- Validate provider configurations
- Test token manager functionality
- Display OAuth flow URLs

## Common Issues

### Provider Not Available
- Ensure environment variables are set in Doppler
- Check that the provider is registered in the registry
- Verify client ID and secret are correct

### Token Refresh Failures
- Check if refresh token is available (some providers don't provide them)
- Ensure the OAuth app has offline_access scope
- Verify token expiration tracking is accurate

### Webhook Issues
- Ensure BASE_URL is publicly accessible for webhooks
- Check provider-specific webhook configuration
- Validate webhook signatures when implemented

## API Reference

### Initiate OAuth Flow

```typescript
const { authUrl } = await $trpc.oauth.initiateOAuth.mutate({
  provider: 'gmail',
  redirectUrl: 'http://localhost:8010/settings/integrations/oauth-callback',
  additionalScopes: ['https://www.googleapis.com/auth/gmail.send']
});

// Redirect user to authUrl
window.location.href = authUrl;
```

### Handle OAuth Callback

This is handled automatically by the callback page, but can be called manually:

```typescript
await $trpc.oauth.handleOAuthCallback.mutate({
  code: 'auth_code_from_provider',
  state: 'encrypted_state_parameter'
});
```

### Get Access Token

For internal use when making API calls:

```typescript
const { accessToken, provider } = await $trpc.oauth.getAccessToken.mutate({
  connectionId: 'connection-uuid'
});

// Use accessToken to make API calls to the provider
```