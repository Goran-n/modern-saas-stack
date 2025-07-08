import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  let supabase: SupabaseClient | null = null
  
  // Validate that Supabase config is present
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    console.error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.')
  } else {
    supabase = createClient(
      config.public.supabaseUrl,
      config.public.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          storageKey: 'kibly-auth',
          storage: {
            getItem: (key: string) => {
              if (import.meta.client) {
                return localStorage.getItem(key)
              }
              return null
            },
            setItem: (key: string, value: string) => {
              if (import.meta.client) {
                localStorage.setItem(key, value)
              }
            },
            removeItem: (key: string) => {
              if (import.meta.client) {
                localStorage.removeItem(key)
              }
            }
          }
        }
      }
    )
  }

  return {
    provide: {
      supabase: supabase as SupabaseClient | null
    }
  }
})