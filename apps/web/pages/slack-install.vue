<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center">
        <h2 class="text-3xl font-bold text-gray-900">Install Figgy for Slack</h2>
      </div>
      
      <div class="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div v-if="!user" class="text-center">
          <p class="text-gray-600 mb-4">
            To install Figgy in your Slack workspace, you need to be logged in to Figgy first.
          </p>
          <NuxtLink 
            to="/login" 
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            Log in to Figgy
          </NuxtLink>
        </div>
        
        <div v-else-if="!tenantId" class="text-center">
          <p class="text-gray-600 mb-4">
            No organization selected. Please select an organization from your dashboard first.
          </p>
          <NuxtLink 
            to="/dashboard" 
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            Go to Dashboard
          </NuxtLink>
        </div>
        
        <div v-else>
          <div class="space-y-6">
            <div>
              <h3 class="text-lg font-medium text-gray-900">Ready to install Figgy!</h3>
              <p class="mt-2 text-sm text-gray-600">
                Click the button below to add Figgy to your Slack workspace for <span class="font-semibold">{{ tenantName }}</span>.
              </p>
            </div>
            
            <div class="bg-purple-50 p-4 rounded-md">
              <h4 class="text-sm font-medium text-purple-800 mb-2">What Figgy will be able to do:</h4>
              <ul class="text-sm text-purple-700 space-y-1">
                <li>• Read messages sent directly to @Figgy</li>
                <li>• Respond to your financial queries</li>
                <li>• Process invoices and receipts you share</li>
                <li>• Send you notifications about important updates</li>
              </ul>
            </div>
            
            <div>
              <button
                @click="installSlack"
                :disabled="installing"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                <svg v-if="!installing" class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.53 1.53a1.5 1.5 0 0 0-2.12 0L9.88 4.06a1.5 1.5 0 0 0 0 2.12l7.07 7.07a1.5 1.5 0 0 0 2.12 0l2.53-2.53a1.5 1.5 0 0 0 0-2.12L14.53 1.53zM4.06 9.88a1.5 1.5 0 0 0 0 2.12l7.07 7.07a1.5 1.5 0 0 0 2.12 0l2.53-2.53a1.5 1.5 0 0 0 0-2.12L8.71 7.35a1.5 1.5 0 0 0-2.12 0L4.06 9.88z"/>
                </svg>
                {{ installing ? 'Redirecting to Slack...' : 'Add to Slack' }}
              </button>
            </div>
            
            <div class="text-center">
              <p class="text-xs text-gray-500">
                You'll be redirected to Slack to authorize the installation
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mt-6 text-center">
        <h3 class="text-sm font-medium text-gray-900 mb-2">After installation:</h3>
        <ol class="text-sm text-gray-600 text-left max-w-sm mx-auto space-y-1">
          <li>1. Team members can DM @Figgy to get started</li>
          <li>2. Figgy will automatically link their accounts</li>
          <li>3. Start asking financial questions right away!</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup>
const { $trpc } = useNuxtApp()
const config = useRuntimeConfig()
const user = useSupabaseUser()
const tenantStore = useTenantStore()

const installing = ref(false)

// Ensure tenant data is loaded
await tenantStore.fetchUserTenants()

const tenantId = computed(() => tenantStore.selectedTenantId)
const tenantName = computed(() => tenantStore.selectedTenant?.name || 'your organization')

async function installSlack() {
  if (!user.value) {
    await navigateTo('/login')
    return
  }
  
  if (!tenantId.value) {
    // No tenant selected
    alert('Please select an organization first')
    return
  }
  
  installing.value = true
  
  // Use the OAuth-specific API URL from runtime config
  const oauthApiUrl = config.public.oauthApiUrl || config.public.apiUrl || 'http://localhost:5001'
  const installUrl = `${oauthApiUrl}/oauth/slack/install?tenantId=${tenantId.value}`
  window.location.href = installUrl
}

// Handle OAuth callback success message
onMounted(() => {
  window.addEventListener('message', (event) => {
    if (event.data.type === 'slack-oauth-success') {
      // Show success message
      alert('Figgy has been successfully installed to your Slack workspace!')
      navigateTo('/dashboard')
    }
  })
})
</script>