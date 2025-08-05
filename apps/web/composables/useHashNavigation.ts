export interface FileManagerState {
  view: 'default' | 'supplier' | 'status'
  year?: string
  supplier?: string
  status?: 'processing' | 'failed'
  fileId?: string
}

export function useHashNavigation() {

  // Parse hash to state
  const parseHashToState = (hash: string): FileManagerState => {
    // Remove leading #/ if present
    const cleanHash = hash.replace(/^#\/?/, '')
    
    if (!cleanHash) {
      return { view: 'default' }
    }

    const parts = cleanHash.split('/').filter(part => part.length > 0)
    
    // Handle status routes: /status/processing or /status/failed or /status/processing/file/abc123
    if (parts[0] === 'status' && parts[1]) {
      const status = parts[1] as 'processing' | 'failed'
      if (['processing', 'failed'].includes(status)) {
        // Check for file sub-route
        if (parts[2] === 'file' && parts[3]) {
          return { view: 'status', status, fileId: parts[3] }
        }
        return { view: 'status', status }
      }
    }
    
    // Handle year routes: /year/2024 or /year/2024/supplier/Amazon or /year/2024/supplier/Amazon/file/abc123
    if (parts[0] === 'year' && parts[1]) {
      const year = parts[1]
      
      // Check for supplier sub-route
      if (parts[2] === 'supplier' && parts[3]) {
        try {
          const supplier = decodeURIComponent(parts[3])
          
          // Check for file sub-route
          if (parts[4] === 'file' && parts[5]) {
            return { view: 'supplier', year, supplier, fileId: parts[5] }
          }
          
          return { view: 'supplier', year, supplier }
        } catch (error) {
          console.warn('Failed to decode supplier name from URL:', parts[3], error)
          // Fallback to using the raw string if decoding fails
          const supplier = parts[3]
          
          // Check for file sub-route
          if (parts[4] === 'file' && parts[5]) {
            return { view: 'supplier', year, supplier, fileId: parts[5] }
          }
          
          return { view: 'supplier', year, supplier }
        }
      }
      
      return { view: 'default', year }
    }
    
    // Fallback to default view
    return { view: 'default' }
  }

  // Convert state to hash
  const stateToHash = (state: FileManagerState): string => {
    switch (state.view) {
      case 'status':
        if (state.status) {
          const baseHash = `#/status/${state.status}`
          return state.fileId ? `${baseHash}/file/${state.fileId}` : baseHash
        }
        return '#/'
      
      case 'supplier':
        if (state.year && state.supplier) {
          const baseHash = `#/year/${state.year}/supplier/${encodeURIComponent(state.supplier)}`
          return state.fileId ? `${baseHash}/file/${state.fileId}` : baseHash
        }
        return state.year ? `#/year/${state.year}` : '#/'
      
      case 'default':
        return state.year ? `#/year/${state.year}` : '#/'
      
      default:
        return '#/'
    }
  }

  // Get current state from URL hash
  const getCurrentState = (): FileManagerState => {
    if (process.client) {
      return parseHashToState(window.location.hash)
    }
    return { view: 'default' }
  }

  // Update URL hash without triggering navigation
  const updateHash = (state: FileManagerState) => {
    if (process.client) {
      const newHash = stateToHash(state)
      const currentPath = window.location.pathname + window.location.search
      
      // Use replaceState to avoid adding to browser history for every state change
      window.history.replaceState(null, '', currentPath + newHash)
    }
  }

  // Navigate to new state (adds to browser history)
  const navigateToState = (state: FileManagerState) => {
    if (process.client) {
      const newHash = stateToHash(state)
      const currentPath = window.location.pathname + window.location.search
      
      // Use pushState to add to browser history for navigation
      window.history.pushState(null, '', currentPath + newHash)
      
      // Trigger hashchange event manually since pushState doesn't trigger it
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
  }

  // Listen for hash changes (browser back/forward)
  const onHashChange = (callback: (state: FileManagerState) => void) => {
    if (process.client) {
      const handleHashChange = () => {
        const newState = getCurrentState()
        callback(newState)
      }

      window.addEventListener('hashchange', handleHashChange)
      
      // Return cleanup function
      return () => {
        window.removeEventListener('hashchange', handleHashChange)
      }
    }
    
    return () => {}
  }

  return {
    parseHashToState,
    stateToHash,
    getCurrentState,
    updateHash,
    navigateToState,
    onHashChange
  }
}