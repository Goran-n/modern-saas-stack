<template>
  <div class="space-y-6">
    <div class="text-center">
      <div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      
      <h1 class="text-2xl font-semibold text-slate-900">
        Authorise Browser Extension
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        The Figgy browser extension is requesting access to your account
      </p>
      
      <div class="mt-4 p-4 bg-slate-50 rounded-lg">
        <div class="flex items-center justify-center space-x-2">
          <div class="w-8 h-8 bg-white rounded border flex items-center justify-center">
            <svg class="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
          </div>
          <span class="text-sm font-medium text-slate-700">{{ user?.email }}</span>
        </div>
      </div>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 class="font-medium text-blue-900 mb-2">Extension Access Permissions</h3>
      <ul class="space-y-2 text-sm text-blue-800">
        <li class="flex items-center">
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
          Access your files and documents
        </li>
        <li class="flex items-center">
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
          Enable drag-and-drop file transfers to Xero
        </li>
        <li class="flex items-center">
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
          Sync authentication with browser extension
        </li>
      </ul>
    </div>

    <div class="flex space-x-3">
      <UButton 
        block 
        size="lg" 
        @click="handleApprove"
        :loading="isLoading"
        :disabled="isLoading"
      >
        Approve Access
      </UButton>
      
      <UButton 
        block 
        size="lg" 
        color="neutral"
        variant="outline"
        @click="handleReject"
        :disabled="isLoading"
      >
        Deny
      </UButton>
    </div>

    <p class="text-xs text-center text-slate-500">
      By approving, you allow the Figgy browser extension to access your account on this device.
      You can revoke this access at any time from your account settings.
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'auth' // Ensure user is authenticated to see this page
})

const user = useSupabaseUser()
const route = useRoute()
const { general } = useNotifications()

const isLoading = ref(false)
const callbackUrl = route.query.callback as string

// Debug the callback URL
console.log('Extension consent page loaded with callback:', {
  callbackUrl,
  allQuery: route.query,
  isValidExtensionUrl: callbackUrl?.startsWith('chrome-extension://')
})

// Validate that we have the required callback URL
if (!callbackUrl || !callbackUrl.startsWith('chrome-extension://')) {
  console.error('Invalid callback URL received:', callbackUrl)
  throw createError({
    statusCode: 400,
    statusMessage: `Invalid extension callback URL: ${callbackUrl}`
  })
}

async function handleApprove() {
  try {
    isLoading.value = true
    
    // Get current session to pass to extension
    const supabaseClient = useSupabaseClient()
    const { data: sessionResponse } = await supabaseClient.auth.getSession()
    const currentSession = sessionResponse?.session
    
    if (!currentSession) {
      general.error('Error', 'No active session found. Please try again.')
      return
    }
    
    const sessionData = {
      access_token: currentSession.access_token,
      refresh_token: currentSession.refresh_token,
      expires_at: currentSession.expires_at,
      user: currentSession.user
    }
    
    general.success('Success!', 'Redirecting to browser extension...')
    
    // Small delay to show success message
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Store session data and approval status for the extension to pick up
    try {
      const authResult = {
        sessionData,
        timestamp: Date.now(),
        approved: true,
        callbackUrl: callbackUrl
      }
      
      window.sessionStorage.setItem('figgy_extension_auth_result', JSON.stringify(authResult))
      console.log('Auth result stored for extension pickup')
      
      // Also store in localStorage as backup (extension can access this)
      window.localStorage.setItem('figgy_extension_auth_result', JSON.stringify(authResult))
      
    } catch (error) {
      console.warn('Could not store auth result:', error)
    }
    
    // Instead of redirecting, show success message and instruct user to close tab
    general.success('Success!', 'Authentication approved! You can now close this tab and return to the extension.')
    
    // Try to close this tab after a delay (if opened by extension)
    setTimeout(() => {
      try {
        window.close()
      } catch (error) {
        console.log('Could not auto-close tab (normal if not opened by script)')
      }
    }, 3000)
    
  } catch (error) {
    console.error('Approval error:', error)
    general.error('Error', error instanceof Error ? error.message : 'Failed to approve access')
  } finally {
    isLoading.value = false
  }
}

async function handleReject() {
  try {
    general.error('Access Denied', 'Extension access was denied')
    
    // Redirect to extension callback with rejection
    const redirectUrl = `${callbackUrl}?auth_success=false&error=access_denied&timestamp=${Date.now()}`
    window.location.href = redirectUrl
    
  } catch (error) {
    // If redirect fails, just close the tab or go back
    window.close()
  }
}
</script>