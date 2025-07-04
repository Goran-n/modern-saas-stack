import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, type User, type Session } from '../lib/supabase'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()
  
  // State
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // Computed
  const isAuthenticated = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email ?? null)
  const userId = computed(() => user.value?.id ?? null)
  const authToken = computed(() => session.value?.access_token ?? null)

  // Actions
  const signUp = async (email: string, password: string, fullName?: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (signUpError) throw signUpError

      return { user: data.user, session: data.session }
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  const signIn = async (email: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      user.value = data.user
      session.value = data.session

      return { user: data.user, session: data.session }
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  const signOut = async () => {
    loading.value = true
    error.value = null

    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError

      user.value = null
      session.value = null
      
      // Redirect to login
      router.push('/auth/login')
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  const resetPassword = async (email: string) => {
    loading.value = true
    error.value = null

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
      if (resetError) throw resetError
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  const initAuth = async () => {
    if (initialized.value) return
    
    loading.value = true

    try {
      // Get initial session
      const { data: { session: initialSession } } = await supabase.auth.getSession()
      
      if (initialSession) {
        session.value = initialSession
        user.value = initialSession.user
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        console.debug('Auth state change:', { event, hasSession: !!newSession })
        
        session.value = newSession
        user.value = newSession?.user ?? null

        if (event === 'SIGNED_OUT') {
          user.value = null
          session.value = null
        } else if (event === 'TOKEN_REFRESHED') {
          // Token was successfully refreshed
          if (newSession) {
            session.value = newSession
            user.value = newSession.user
          }
        } else if (event === 'SIGNED_IN') {
          // User signed in
          if (newSession) {
            session.value = newSession
            user.value = newSession.user
          }
        }
        
        // Handle session expiry/invalid session
        if (!newSession && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT')) {
          console.warn('Session expired or invalid - clearing auth state')
          user.value = null
          session.value = null
        }
      })

      // Store subscription for cleanup if needed
      // subscription.unsubscribe() can be called later
      
      initialized.value = true
    } catch (err) {
      error.value = (err as Error).message
    } finally {
      loading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    user: computed(() => user.value),
    session: computed(() => session.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    initialized: computed(() => initialized.value),
    
    // Computed
    isAuthenticated,
    userEmail,
    userId,
    authToken,
    
    // Actions
    signUp,
    signIn,
    signOut,
    resetPassword,
    initAuth,
    clearError
  }
})