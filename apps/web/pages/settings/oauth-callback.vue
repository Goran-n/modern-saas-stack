<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full bg-white shadow rounded-lg p-6">
      <!-- Loading State -->
      <div v-if="status === 'loading'" class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <h3 class="mt-4 text-lg font-medium">Processing OAuth callback...</h3>
        <p class="mt-2 text-sm text-gray-500">Please wait while we complete the connection.</p>
      </div>

      <!-- Success State -->
      <div v-else-if="status === 'success'" class="text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="mt-4 text-lg font-medium">Successfully Connected!</h3>
        <p class="mt-2 text-sm text-gray-500">
          Your {{ providerName }} account has been connected successfully.
        </p>
        <div class="mt-6">
          <button
            @click="goToIntegrations"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Continue to Integrations
          </button>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="status === 'error'" class="text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h3 class="mt-4 text-lg font-medium">Connection Failed</h3>
        <p class="mt-2 text-sm text-gray-500">{{ errorMessage }}</p>
        <div class="mt-6 space-y-3">
          <button
            @click="goToIntegrations"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Back to Integrations
          </button>
        </div>
      </div>

      <!-- Debug Info -->
      <div v-if="showDebug" class="mt-6 p-4 bg-gray-100 rounded text-xs">
        <h4 class="font-bold mb-2">Debug Information:</h4>
        <p>Status: {{ status }}</p>
        <p>Code: {{ route.query.code ? 'Present' : 'Missing' }}</p>
        <p>State: {{ route.query.state ? 'Present' : 'Missing' }}</p>
        <p>Error: {{ route.query.error || 'None' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Don't require auth for OAuth callback
definePageMeta({
  auth: false,
  layout: false
})

const route = useRoute()
const router = useRouter()
const $trpc = useTrpc()

// State
const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref('')
const providerName = ref('')
const showDebug = ref(true) // Show debug info for now

async function processOAuthCallback() {
  console.log('OAuth Callback: Processing callback')
  console.log('OAuth Callback: Query params:', route.query)
  
  try {
    const { code, state, error, error_description } = route.query
    
    // Check for OAuth errors from provider
    if (error) {
      throw new Error(error_description as string || error as string || 'OAuth provider returned an error')
    }
    
    // Validate required parameters
    if (!code || !state) {
      throw new Error('Missing required OAuth parameters (code or state)')
    }
    
    console.log('OAuth Callback: Calling TRPC endpoint')
    
    // Call the backend to complete OAuth flow
    const result = await $trpc.oauth.handleOAuthCallback.mutate({
      code: code as string,
      state: state as string,
      error: error as string,
      error_description: error_description as string
    })
    
    console.log('OAuth Callback: Success!', result)
    
    providerName.value = result.provider || 'OAuth'
    status.value = 'success'
    
  } catch (err: any) {
    console.error('OAuth Callback: Error occurred', err)
    status.value = 'error'
    errorMessage.value = err.message || 'An unexpected error occurred'
  }
}

function goToIntegrations() {
  router.push('/settings/integrations')
}

onMounted(() => {
  console.log('OAuth Callback: Component mounted')
  processOAuthCallback()
})
</script>