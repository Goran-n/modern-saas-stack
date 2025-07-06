<template>
  <div class="min-h-screen bg-neutral-50 flex items-center justify-center">
    <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
      <!-- Loading state -->
      <div
        v-if="isProcessing"
        class="text-center"
      >
        <div class="animate-spin mx-auto h-12 w-12 border-b-2 border-blue-600 rounded-full mb-4" />
        <h2 class="text-xl font-semibold text-neutral-900 mb-2">
          Completing connection...
        </h2>
        <p class="text-neutral-600">
          Please wait while we finalise your integration.
        </p>
      </div>

      <!-- Success state -->
      <div
        v-else-if="success"
        class="text-center"
      >
        <div class="mx-auto h-12 w-12 text-green-600 mb-4">
          <CheckCircleIcon class="w-full h-full" />
        </div>
        <h2 class="text-xl font-semibold text-neutral-900 mb-2">
          Integration connected!
        </h2>
        <p class="text-neutral-600 mb-6">
          Your {{ providerName }} integration has been successfully set up.
        </p>
        <button
          class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          @click="goToIntegrations"
        >
          View Integrations
        </button>
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="text-center"
      >
        <div class="mx-auto h-12 w-12 text-red-600 mb-4">
          <XCircleIcon class="w-full h-full" />
        </div>
        <h2 class="text-xl font-semibold text-neutral-900 mb-2">
          Connection failed
        </h2>
        <p class="text-neutral-600 mb-6">
          {{ errorMessage }}
        </p>
        <div class="space-y-3">
          <button
            class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            @click="retry"
          >
            Try Again
          </button>
          <button
            class="w-full inline-flex justify-center items-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50 transition-colors"
            @click="goToIntegrations"
          >
            Back to Integrations
          </button>
        </div>
      </div>

      <!-- Cancelled state -->
      <div
        v-else
        class="text-center"
      >
        <div class="mx-auto h-12 w-12 text-neutral-400 mb-4">
          <XMarkIcon class="w-full h-full" />
        </div>
        <h2 class="text-xl font-semibold text-neutral-900 mb-2">
          Connection cancelled
        </h2>
        <p class="text-neutral-600 mb-6">
          The integration setup was cancelled or interrupted.
        </p>
        <button
          class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          @click="goToIntegrations"
        >
          Back to Integrations
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useOAuth } from '../../composables/useOAuth'

const route = useRoute()
const router = useRouter()
const { handleOAuthCallback, fetchAvailableOrganisations } = useOAuth()

// State
const isProcessing = ref(true)
const success = ref(false)
const error = ref(false)
const errorMessage = ref('')
const integration = ref<any>(null)

// Computed
const providerName = computed(() => {
  if (!integration.value) return ''
  
  const names: Record<string, string> = {
    xero: 'Xero',
    quickbooks: 'QuickBooks',
    sage: 'Sage',
    freshbooks: 'FreshBooks'
  }
  
  return names[integration.value.provider] || integration.value.provider
})

// Methods
const processOAuthCallback = async () => {
  const code = route.query.code as string
  const state = route.query.state as string
  const errorParam = route.query.error as string

  console.log('🔍 OAuth Callback Debug Info:')
  console.log('Full route query:', route.query)
  console.log('Code parameter:', code)
  console.log('State parameter:', state)
  console.log('Error parameter:', errorParam)
  console.log('Current URL:', window.location.href)

  if (errorParam) {
    console.error('❌ OAuth error parameter received:', errorParam)
    error.value = true
    errorMessage.value = getErrorMessage(errorParam)
    isProcessing.value = false
    return
  }

  if (!code || !state) {
    console.error('❌ Missing OAuth parameters:', { code: !!code, state: !!state })
    error.value = true
    errorMessage.value = 'Missing required OAuth parameters. Please try the integration setup again.'
    isProcessing.value = false
    return
  }

  try {
    console.log('✅ Both code and state received, fetching organisations...')
    
    // Fetch available organisations instead of completing OAuth immediately
    await fetchAvailableOrganisations(code, state)
    
    console.log('✅ Organisations fetched successfully, redirecting to integrations page...')
    
    // Redirect back to integrations page where the modal can show organisation selection
    const redirectQuery = { 
      step: 'select-organisation',
      code,
      state 
    }
    console.log('🔗 Redirecting with query:', redirectQuery)
    
    await router.push({ 
      name: 'Integrations', 
      query: redirectQuery
    })
    
    console.log('✅ Redirect completed, current route:', router.currentRoute.value)
  } catch (err) {
    console.error('❌ OAuth callback failed:', err)
    error.value = true
    errorMessage.value = err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    isProcessing.value = false
  }
}

const getErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    access_denied: 'You cancelled the authorisation process. Please try again if you want to connect this integration.',
    invalid_request: 'There was an issue with the authorisation request. Please try again.',
    unauthorized_client: 'This application is not authorised to connect to the selected provider.',
    unsupported_response_type: 'The provider returned an unsupported response type.',
    invalid_scope: 'The requested permissions are not available.',
    server_error: 'The provider encountered an error. Please try again later.',
    temporarily_unavailable: 'The provider is temporarily unavailable. Please try again later.'
  }
  
  return errorMessages[errorCode] || `OAuth error: ${errorCode}. Please try again.`
}

const goToIntegrations = () => {
  router.push({ name: 'Integrations' })
}

const retry = () => {
  // Clear error state and redirect to integrations to start over
  error.value = false
  errorMessage.value = ''
  goToIntegrations()
}

// Lifecycle
onMounted(() => {
  console.log('🔍 OAuth Callback Component Mounted')
  console.log('Current route path:', route.path)
  console.log('Full URL:', window.location.href)
  console.log('Route query object:', route.query)
  console.log('Raw query string:', window.location.search)
  
  // Add a small delay to show the loading state
  setTimeout(() => {
    processOAuthCallback()
  }, 1000)
})
</script>