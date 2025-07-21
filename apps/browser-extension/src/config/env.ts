// Environment configuration for browser extension
// This file provides a centralized way to access environment variables

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  API_URL: string;
  APP_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

// Get environment config - will be injected by build process
export const env: EnvConfig = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:4000',
  NODE_ENV: (import.meta.env.MODE as EnvConfig['NODE_ENV']) || 'development'
};

// Validate required environment variables
export function validateEnv() {
  // Skip validation in development mode for easier local testing
  if (env.NODE_ENV === 'development') {
    return;
  }
  
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'] as const;
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}