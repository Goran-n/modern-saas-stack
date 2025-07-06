import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, type User, type Session } from '../lib/supabase'
import { useRouter } from 'vue-router'
import { getErrorMessage } from '@/utils/error'

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
  async function signUp(email: string, password: string, fullName?: string) {
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
      error.value = getErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function signIn(email: string, password: string) {
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
      error.value = getErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
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
      error.value = getErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(email: string) {
    loading.value = true
    error.value = null

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
      if (resetError) throw resetError
    } catch (err) {
      error.value = getErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function initAuth() {
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
        session.value = newSession
        user.value = newSession?.user ?? null

        // Handle session expiry/invalid session
        if (!newSession && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT')) {
          user.value = null
          session.value = null
        }
      })

      initialized.value = true
      
      // Return unsubscribe function for cleanup
      return () => subscription.unsubscribe()
    } catch (err) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    user,
    session,
    loading,
    error,
    initialized,
    
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