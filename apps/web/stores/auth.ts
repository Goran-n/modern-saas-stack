import type { User, SupabaseClient } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()
  
  const user = ref<User | null>(null)
  const isLoading = ref(true)
  const isAuthenticated = computed(() => !!user.value)
  
  // Store the subscription for cleanup
  let authSubscription: any = null

  // Get Supabase client when needed, not at module level
  function getSupabaseClient(): SupabaseClient | null {
    const { $supabase } = useNuxtApp()
    return $supabase as SupabaseClient | null
  }

  async function initialize() {
    try {
      isLoading.value = true
      
      const supabase = getSupabaseClient()
      if (!supabase) {
        console.warn('Supabase client not available. Authentication features will be disabled.')
        return
      }
      
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      user.value = session?.user || null

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
        user.value = session?.user || null
        
        if (event === 'SIGNED_OUT') {
          await router.push('/auth/login')
        }
      })
      
      // Store subscription for cleanup
      authSubscription = subscription
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Clean up subscription when store is disposed
  function dispose() {
    if (authSubscription) {
      authSubscription.unsubscribe()
      authSubscription = null
    }
  }

  async function signIn(email: string, password: string) {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Authentication service is not available')
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    
    user.value = data.user
    return data
  }

  async function signUp(email: string, password: string) {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Authentication service is not available')
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) throw error
    
    return data
  }

  async function signOut() {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Authentication service is not available')
    }
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    user.value = null
  }

  async function resetPassword(email: string) {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Authentication service is not available')
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) throw error
  }

  async function updatePassword(newPassword: string) {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Authentication service is not available')
    }
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    initialize,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    dispose
  }
})