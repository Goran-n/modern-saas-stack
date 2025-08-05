export default defineNuxtPlugin((_nuxtApp) => {
  // This plugin runs before all others due to the 00. prefix
  // Validate critical environment variables on startup
  
  const config = useRuntimeConfig();
  const errors: string[] = [];

  // Validate Supabase configuration
  if (!config.public.supabase?.url) {
    errors.push("SUPABASE_URL: Required for authentication and file storage");
  }
  
  if (!config.public.supabase?.key) {
    errors.push("SUPABASE_ANON_KEY: Required for client-side authentication");
  }

  // Validate API configuration
  if (!config.public.apiUrl) {
    errors.push("NUXT_PUBLIC_API_URL: Required for backend API communication");
  }

  // If there are any errors, throw with a detailed message
  if (errors.length > 0) {
    const errorMessage = `Missing required environment variables:
${errors.map(err => `  - ${err}`).join('\n')}

Please ensure these environment variables are set in your .env file.
For local development, copy .env.example to .env and fill in the values.`;

    // In development, log to console with styling
    if (process.dev) {
      console.error('%c⚠️ Environment Configuration Error', 'color: red; font-size: 16px; font-weight: bold;');
      console.error(errorMessage);
    }

    // Throw error to prevent app from starting
    throw new Error(errorMessage);
  }

  // Log successful validation in development
  if (process.dev) {
    console.log('%c✅ Environment validation passed', 'color: green; font-weight: bold;');
  }
});