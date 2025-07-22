# Browser Extension Authentication with Supabase

This guide explains how the Figgy browser extension integrates with Supabase Auth for seamless authentication between the web app and extension.

## Architecture Overview

The browser extension uses a custom storage adapter to work with Supabase Auth, as browser extensions cannot use localStorage. The implementation includes:

1. **Custom Storage Adapter** - Uses `chrome.storage.local` API instead of localStorage
2. **Supabase Client** - Configured with the custom storage adapter
3. **Auth Synchronization** - Automatically syncs auth state between web app and extension
4. **Session Management** - Handles token refresh and session persistence

## Key Components

### Storage Adapter (`src/utils/storage-adapter.ts`)

Implements the Supabase storage interface using Chrome's storage API:

```typescript
const storageAdapter = {
  getItem: async (key: string) => {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  },
  setItem: async (key: string, value: string) => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string) => {
    await chrome.storage.local.remove(key);
  }
};
```

### Supabase Client (`src/utils/supabase.ts`)

Creates a Supabase client instance with the custom storage adapter:

```typescript
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storageAdapter,
    storageKey: 'supabase.auth.token',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
```

### Auth Bridge Content Script (`src/entrypoints/auth-bridge.content.ts`)

Runs on Figgy web app pages to synchronize authentication:

- Listens for auth state changes in the web app
- Forwards auth updates to the extension's background script
- Requests current auth state on page load

## Authentication Flow

### 1. Direct Extension Login

Users can log in directly from the extension popup:

1. User enters credentials in the extension popup
2. Extension authenticates with Supabase
3. Session is stored in `chrome.storage.local`
4. Auth state updates trigger UI changes

### 2. Web App to Extension Sync

When users log in via the web app:

1. Web app authenticates with Supabase
2. Auth bridge content script detects the change
3. Session is forwarded to the extension
4. Extension stores the session locally

### 3. Extension to Web App Sync

The extension maintains its own auth state but doesn't push changes back to the web app to avoid conflicts.

## Session Management

### Token Refresh

The extension automatically refreshes tokens when:

- Extension starts up (background script initialization)
- Token is close to expiry (< 60 seconds)
- API calls receive 401 responses

### Session Persistence

Sessions persist across:

- Browser restarts (using `chrome.storage.local`)
- Extension updates
- Multiple tabs/windows

## Environment Configuration

Required environment variables in `.env`:

```bash
# Browser Extension (VITE_ prefix required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:5000
VITE_APP_URL=http://localhost:4000
```

## OAuth Setup

For OAuth providers (Google, GitHub):

1. Get redirect URL: `chrome.identity.getRedirectURL()`
2. Add to Supabase Auth settings
3. Use `signInWithOAuth()` method in the extension

## Security Considerations

1. **Storage Security**: Chrome storage is encrypted at rest
2. **Token Handling**: Access tokens are never exposed to content scripts
3. **Cross-Origin**: Only trusted Figgy domains can sync auth
4. **Permissions**: Minimal permissions requested (storage, identity)

## Development Tips

### Testing Auth Flow

1. Install extension in development mode
2. Open the popup and check auth status
3. Log in via web app and verify sync
4. Check Chrome DevTools for storage contents

### Debugging

Enable debug logging:

```typescript
const logger = createLogger('auth', { level: 'debug' });
```

Check auth state in Chrome DevTools:

```javascript
// In extension context
chrome.storage.local.get(['supabase.auth.token'], console.log);
```

### Common Issues

1. **Session not syncing**: Ensure auth bridge content script is loaded
2. **OAuth redirect fails**: Check redirect URL in Supabase dashboard
3. **Token expired**: Verify auto-refresh is enabled
4. **Storage quota**: Chrome storage has limits; implement cleanup

## API Integration

When making authenticated API calls:

```typescript
const session = await getSession();
if (!session) {
  throw new Error('Not authenticated');
}

const response = await fetch(apiUrl, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'X-Tenant-Id': tenantId
  }
});
```

## Future Enhancements

1. **Biometric Authentication**: Use WebAuthn for passwordless login
2. **Session Sharing**: Share sessions across multiple extensions
3. **Offline Support**: Cache auth state for offline usage
4. **Multi-Account**: Support switching between multiple accounts