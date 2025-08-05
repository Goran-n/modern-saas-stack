// Environment configuration for browser extension
// This file provides a centralized way to access environment variables

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  API_URL: string;
  APP_URL: string;
  NODE_ENV: "development" | "production" | "test";
}

// Get environment config - will be injected by build process
export const env: EnvConfig = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  APP_URL: import.meta.env.VITE_APP_URL || "http://localhost:4000",
  NODE_ENV: (import.meta.env.MODE as EnvConfig["NODE_ENV"]) || "development",
};

// Validate required environment variables
export function validateEnv() {
  const required = [
    { key: "SUPABASE_URL", description: "Supabase project URL for authentication and data storage" },
    { key: "SUPABASE_ANON_KEY", description: "Supabase anonymous key for client-side authentication" },
    { key: "API_URL", description: "Backend API URL for tRPC communication" },
  ] as const;
  
  const missing = required.filter((item) => !env[item.key as keyof EnvConfig]);

  if (missing.length > 0) {
    const errorMessage = missing.map(item => 
      `  - ${item.key}: ${item.description}`
    ).join("\n");
    
    throw new Error(
      `Missing required environment variables:\n${errorMessage}\n\n` +
      `Please ensure these are set in your .env file with the VITE_ prefix (e.g., VITE_SUPABASE_URL)`
    );
  }
}
