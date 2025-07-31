<template>
  <div class="min-h-screen bg-neutral-50 flex items-center justify-center">
    <FigCard class="w-full max-w-md">
      <div class="text-center py-8">
        <!-- Loading State -->
        <div v-if="processing">
          <Icon name="heroicons:arrow-path" class="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <h2 class="text-lg font-semibold text-neutral-900 mb-2">Connecting Email Account</h2>
          <p class="text-sm text-neutral-600">Please wait while we complete the setup...</p>
        </div>
        
        <!-- Error State -->
        <div v-else-if="error">
          <Icon name="heroicons:x-circle" class="w-12 h-12 text-error-500 mx-auto mb-4" />
          <h2 class="text-lg font-semibold text-neutral-900 mb-2">Connection Failed</h2>
          <p class="text-sm text-neutral-600 mb-4">{{ error }}</p>
          <FigButton @click="navigateTo('/settings/integrations')" color="primary">
            Back to Integrations
          </FigButton>
        </div>
        
        <!-- Success State -->
        <div v-else>
          <Icon name="heroicons:check-circle" class="w-12 h-12 text-success-500 mx-auto mb-4" />
          <h2 class="text-lg font-semibold text-neutral-900 mb-2">Email Connected!</h2>
          <p class="text-sm text-neutral-600 mb-4">Your email account has been connected successfully.</p>
          <FigButton @click="navigateTo('/settings/integrations')" color="primary">
            Back to Integrations
          </FigButton>
        </div>
      </div>
    </FigCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FigCard, FigButton } from '@figgy/ui'

// Page metadata
definePageMeta({
  middleware: ['auth']
})

// Composables
const route = useRoute()
const $trpc = useTrpc()
const toast = useToast()

// State
const processing = ref(true)
const error = ref<string | undefined>(undefined)

// Handle OAuth callback
onMounted(async () => {
  try {
    const { code, state, error: oauthError } = route.query
    
    if (oauthError) {
      throw new Error('Authorization was denied')
    }
    
    if (!code || !state) {
      throw new Error('Invalid callback parameters')
    }
    
    // Get saved state from session storage
    const savedState = sessionStorage.getItem('email-connection-setup')
    if (!savedState) {
      throw new Error('Session expired. Please try connecting again.')
    }
    
    const { provider } = JSON.parse(savedState)
    
    // Handle OAuth callback
    await $trpc.email.handleOAuthCallback.mutate({
      provider: provider as 'gmail' | 'outlook',
      code: code as string,
      state: state as string
    })
    
    // Clear session storage
    sessionStorage.removeItem('email-connection-setup')
    
    toast.add({
      title: 'Success',
      description: 'Email account connected successfully',
      color: 'success' as const
    })
    
    processing.value = false
  } catch (err: any) {
    console.error('OAuth callback failed:', err)
    error.value = err.message || 'Failed to connect email account'
    processing.value = false
    
    toast.add({
      title: 'Connection Failed',
      description: error.value || 'Unknown error occurred',
      color: 'error' as const
    })
  }
})
</script>