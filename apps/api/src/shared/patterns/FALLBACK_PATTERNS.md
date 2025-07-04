# Fallback Patterns Guide

## Overview
This document outlines the standardised fallback patterns used across the platform for resilient data handling and graceful degradation.

## Core Principle
**Always prefer fresh data, but gracefully fallback to cached/existing data when fresh data is unavailable.**

## Standard Patterns

### 1. Token Expiry Fallback
```typescript
// ✅ CORRECT: Use configuration-based fallback
expiresAt: new Date(Date.now() + (tokenSet.expires_in || getTokenConfig().defaultExpirySeconds) * 1000)

// ❌ INCORRECT: Hardcoded fallback
expiresAt: new Date(Date.now() + (tokenSet.expires_in || 1800) * 1000)
```

### 2. Tenant Information Fallback
```typescript
// ✅ CORRECT: Resilient tenant data handling
const newTokens: XeroTokens = {
  tenantId: connectionInfo.tenantId || authData.tenantId,
  tenantName: connectionInfo.tenantName || authData.tenantName,
  tenantType: connectionInfo.tenantType || authData.tenantType
}
```

**Why this pattern is essential:**
- Xero's `updateTenants()` API call can fail during token refresh
- Network issues, rate limits, or temporary API problems occur
- Maintains integration continuity even when fresh connection info is unavailable
- Preserves tenant context across token refresh cycles

### 3. Scope Handling Fallback
```typescript
// ✅ CORRECT: Handle both string and array scope formats
scope: tokenSet.scope?.split(' ') || (Array.isArray(authData.scope) ? authData.scope : authData.scope?.split(' ')) || []

// ❌ INCORRECT: Assumes scope is always an array
scope: tokenSet.scope?.split(' ') || authData.scope || []
```

### 4. Refresh Token Preservation
```typescript
// ✅ CORRECT: Preserve existing refresh token if new one not provided
refreshToken: tokenSet.refresh_token || authData.refreshToken

// ❌ INCORRECT: No fallback for missing refresh token
refreshToken: tokenSet.refresh_token
```

## Implementation Guidelines

### 1. Configuration Over Hardcoding
Always use configuration values for fallbacks:
```typescript
import { getTokenConfig } from '../config/sync.config'

const tokenConfig = getTokenConfig()
const defaultExpiry = tokenConfig.defaultExpirySeconds
```

### 2. Logging Fallback Usage
When using fallbacks, log the reasoning:
```typescript
const useFallback = !connectionInfo.tenantId && authData.tenantId
if (useFallback) {
  logger.info('Using existing tenant info as fallback during token refresh', {
    integrationId: integration.id,
    reason: 'Fresh connection info unavailable'
  })
}
```

### 3. Type Safety with Fallbacks
Ensure fallback types match expected types:
```typescript
// Handle both string and array scope formats
scope: tokenSet.scope?.split(' ') || 
       (Array.isArray(authData.scope) ? authData.scope : authData.scope?.split(' ')) || 
       []
```

## Common Anti-Patterns

### ❌ Hardcoded Fallbacks
```typescript
// Don't do this
expiresIn: tokenSet.expires_in || 1800
```

### ❌ No Fallback for Critical Data
```typescript
// Don't do this - could break integrations
tenantId: connectionInfo.tenantId // No fallback!
```

### ❌ Inconsistent Type Handling
```typescript
// Don't do this - assumes scope format
scope: authData.scope.split(' ') // Could fail if scope is already an array
```

## Testing Fallback Patterns

### Unit Tests
Test both primary and fallback scenarios:
```typescript
describe('Token refresh with fallbacks', () => {
  it('should use connection info when available', () => {
    // Test primary path
  })
  
  it('should fallback to auth data when connection info unavailable', () => {
    // Test fallback path
  })
})
```

### Integration Tests
Test real-world fallback scenarios:
- API timeout during token refresh
- Rate limiting during connection info retrieval
- Network interruptions during tenant data fetch

## Configuration References

All fallback values should reference these configurations:

- `TOKEN_DEFAULT_EXPIRY_SECONDS`: Default token expiry (30 minutes)
- `TOKEN_REFRESH_BUFFER_SECONDS`: When to refresh tokens (5 minutes)
- `TOKEN_CONSECUTIVE_FAILURE_LIMIT`: Max failures before re-auth required

## Monitoring Fallback Usage

Track when fallbacks are used for monitoring purposes:
```typescript
if (useFallback) {
  telemetry.trackBusinessMetric('fallback_pattern_used', 1, {
    pattern: 'tenant_info_fallback',
    reason: 'fresh_connection_info_unavailable',
    integrationId
  })
}
```

This helps identify:
- Frequent API reliability issues
- Patterns that may need improvement
- System resilience effectiveness