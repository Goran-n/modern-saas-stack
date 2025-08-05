export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  // Check required environment variables
  const requiredEnvVars = {
    SUPABASE_URL: config.public.supabase?.url,
    SUPABASE_ANON_KEY: config.public.supabase?.key,
  }
  
  const missingVars: string[] = []
  
  for (const [name, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missingVars.push(name)
    }
  }
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`
    
    // Show error in development
    if (process.dev) {
      console.error('🚨 Environment Configuration Error:')
      console.error(errorMessage)
      console.error('\nMake sure you are running the app with Doppler:')
      console.error('  bun run dev:web (from root)')
      console.error('  OR')
      console.error('  doppler run --project figgy-web -- bun run dev (from apps/web)')
      
      // Create a full-screen error overlay
      if (typeof document !== 'undefined') {
        const errorDiv = document.createElement('div')
        errorDiv.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #fff;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: system-ui, -apple-system, sans-serif;
        `
        errorDiv.innerHTML = `
          <div style="max-width: 600px; padding: 2rem; text-align: center;">
            <h1 style="color: #dc2626; margin-bottom: 1rem; font-size: 2rem;">Environment Configuration Error</h1>
            <p style="color: #374151; margin-bottom: 2rem; font-size: 1.125rem;">
              Missing required environment variables:
              <strong style="display: block; margin-top: 0.5rem; color: #dc2626;">
                ${missingVars.join(', ')}
              </strong>
            </p>
            <div style="background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; text-align: left; font-family: monospace; font-size: 0.875rem;">
              <p style="margin: 0 0 0.5rem 0; color: #6b7280;">Run the app with Doppler:</p>
              <code style="color: #1f2937;">bun run dev:web</code>
              <span style="color: #6b7280;"> (from root)</span>
              <br>
              <span style="color: #6b7280;">OR</span>
              <br>
              <code style="color: #1f2937;">doppler run --project figgy-web -- bun run dev</code>
              <span style="color: #6b7280;"> (from apps/web)</span>
            </div>
          </div>
        `
        document.body.appendChild(errorDiv)
      }
    }
    
    // Throw error to stop app initialization
    throw new Error(errorMessage)
  }
})