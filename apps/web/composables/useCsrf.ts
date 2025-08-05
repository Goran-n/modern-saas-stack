export const useCsrf = () => {
  const csrfToken = useState<string>('csrf-token', () => '')
  
  // Generate a CSRF token if it doesn't exist
  const generateToken = () => {
    if (process.client && !csrfToken.value) {
      // Generate a random token
      const array = new Uint8Array(32)
      crypto.getRandomValues(array)
      csrfToken.value = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
      
      // Store in session storage for persistence across page reloads
      sessionStorage.setItem('csrf-token', csrfToken.value)
    }
  }
  
  // Get token from storage on initialization
  const initializeToken = () => {
    if (process.client) {
      const stored = sessionStorage.getItem('csrf-token')
      if (stored) {
        csrfToken.value = stored
      } else {
        generateToken()
      }
    }
  }
  
  // Initialize on first use
  if (process.client && !csrfToken.value) {
    initializeToken()
  }
  
  return {
    token: readonly(csrfToken),
    generateToken,
    initializeToken
  }
}