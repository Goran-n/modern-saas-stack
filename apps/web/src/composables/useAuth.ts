import { useAuthStore } from '../stores/auth'

/**
 * Authentication composable that wraps the auth store
 * This provides a convenient API for components to access auth functionality
 */
export const useAuth = () => {
  const authStore = useAuthStore()
  
  return {
    // State
    user: authStore.user,
    session: authStore.session,
    loading: authStore.loading,
    error: authStore.error,
    
    // Computed
    isAuthenticated: authStore.isAuthenticated,
    userEmail: authStore.userEmail,
    userId: authStore.userId,
    authToken: authStore.authToken,
    
    // Actions
    signUp: authStore.signUp,
    signIn: authStore.signIn,
    signOut: authStore.signOut,
    resetPassword: authStore.resetPassword,
    initAuth: authStore.initAuth,
    clearError: authStore.clearError
  }
}