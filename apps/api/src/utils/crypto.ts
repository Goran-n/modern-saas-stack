/**
 * Generate a secure random invitation token
 */
export function generateInvitationToken(): string {
  // Generate 32 random bytes and convert to hex
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a secure API key
 */
export function generateApiKey(prefix = 'kibly'): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const key = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${prefix}_${key}`
}

/**
 * Generate a random UUID-like string
 */
export function generateId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join('-')
}

/**
 * Generate a secure state hash for OAuth flows
 */
export function generateStateHash(data: string): string {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data + Date.now().toString())
  const hashArray = new Uint8Array(32)
  crypto.getRandomValues(hashArray)
  
  // Simple hash by XORing the data with random bytes
  for (let i = 0; i < dataBuffer.length; i++) {
    hashArray[i % hashArray.length] ^= dataBuffer[i]
  }
  
  return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate a state hash
 */
export function validateStateHash(state: string, _expectedData: string): boolean {
  // For now, just check if state exists and has the right format
  // In production, you'd want to store and validate the state properly
  return state.length === 64 && /^[0-9a-f]+$/.test(state)
}