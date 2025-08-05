export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  // Check required environment variables on server
  const requiredEnvVars = {
    SUPABASE_URL: config.public.supabase?.url || process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: config.public.supabase?.key || process.env.SUPABASE_ANON_KEY,
  }
  
  const missingVars: string[] = []
  
  for (const [name, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missingVars.push(name)
    }
  }
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`
    
    console.error('🚨 Environment Configuration Error:')
    console.error(errorMessage)
    console.error('\nMake sure you are running the app with Doppler:')
    console.error('  bun run dev:web (from root)')
    console.error('  OR')
    console.error('  doppler run --project figgy-web -- bun run dev (from apps/web)')
    
    // Exit the process in development
    if (process.dev) {
      process.exit(1)
    }
    
    // Throw error in production
    throw new Error(errorMessage)
  }
})