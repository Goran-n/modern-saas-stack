/**
 * Centralized notification system for consistent messaging across the application
 * Uses Nuxt UI Pro's toast system with organized message definitions
 */
export const useNotifications = () => {
  const toast = useToast()
  
  return {
    auth: {
      signUpSuccess: () => toast.add({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
        color: 'success'
      }),
      
      signInSuccess: () => toast.add({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
        color: 'success'
      }),
      
      signInFailed: (error?: string) => toast.add({
        title: 'Sign in failed',
        description: error || 'Invalid email or password',
        color: 'error'
      }),
      
      signUpFailed: (error?: string) => toast.add({
        title: 'Sign up failed',
        description: error || 'Failed to create account',
        color: 'error'
      }),
      
      passwordResetSent: () => toast.add({
        title: 'Check your email',
        description: 'We sent you a password reset link.',
        icon: 'i-heroicons-check-circle',
        color: 'success'
      }),
      
      passwordResetFailed: (error?: string) => toast.add({
        title: 'Error',
        description: error || 'Failed to send reset email',
        icon: 'i-heroicons-exclamation-circle',
        color: 'error'
      }),
      
      signOutSuccess: () => toast.add({
        title: 'Signed out successfully',
        icon: 'i-heroicons-check-circle',
        color: 'success'
      }),
      
      signOutFailed: (error?: string) => toast.add({
        title: 'Error signing out',
        description: error || 'An error occurred',
        icon: 'i-heroicons-exclamation-circle',
        color: 'error'
      })
    },
    
    general: {
      comingSoon: (feature: string) => toast.add({
        title: 'Coming soon',
        description: `${feature} will be available soon`,
        color: 'warning'
      }),
      
      error: (message: string, description?: string) => toast.add({
        title: message,
        description: description || 'An error occurred',
        color: 'error'
      }),
      
      success: (message: string, description?: string) => toast.add({
        title: message,
        description,
        color: 'success'
      }),
      
      warning: (message: string, description?: string) => toast.add({
        title: message,
        description,
        color: 'warning'
      }),
      
      info: (message: string, description?: string) => toast.add({
        title: message,
        description,
        color: 'info'
      })
    }
  }
}