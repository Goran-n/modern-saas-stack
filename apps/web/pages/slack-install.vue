<template>
  <div class="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
    <FigContainer max-width="md" class="w-full">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-neutral-900">Install Figgy for Slack</h1>
      </div>
      
      <FigCard padding="xl" variant="elevated">
        <!-- Not Logged In State -->
        <div v-if="!user" class="text-center py-8">
          <p class="text-neutral-600 mb-6">
            To install Figgy in your Slack workspace, you need to be logged in to Figgy first.
          </p>
          <FigButton 
            @click="navigateTo('/auth/login')"
            size="lg"
          >
            Log in to Figgy
          </FigButton>
        </div>
        
        <!-- No Tenant Selected -->
        <div v-else-if="!tenantId" class="text-center py-8">
          <p class="text-neutral-600 mb-6">
            No organisation selected. Please select an organisation from your dashboard first.
          </p>
          <FigButton 
            @click="navigateTo('/dashboard')"
            size="lg"
            variant="outline"
            color="neutral"
          >
            Go to Dashboard
          </FigButton>
        </div>
        
        <!-- Ready to Install -->
        <div v-else class="space-y-6">
          <div class="text-center">
            <SlackIcon class="mx-auto mb-4" />
            <h2 class="text-xl font-semibold text-neutral-900">Ready to install Figgy!</h2>
            <p class="mt-2 text-neutral-600">
              Click the button below to add Figgy to your Slack workspace for 
              <span class="font-semibold text-neutral-900">{{ tenantName }}</span>.
            </p>
          </div>
          
          <FigCard variant="outlined" padding="md" class="bg-primary-50 border-primary-200">
            <h3 class="text-sm font-semibold text-primary-900 mb-3">
              What Figgy will be able to do:
            </h3>
            <ul class="space-y-2 text-sm text-primary-700">
              <li class="flex items-start">
                <span class="mr-2">•</span>
                <span>Read messages sent directly to @Figgy</span>
              </li>
              <li class="flex items-start">
                <span class="mr-2">•</span>
                <span>Respond to your financial queries</span>
              </li>
              <li class="flex items-start">
                <span class="mr-2">•</span>
                <span>Process invoices and receipts you share</span>
              </li>
              <li class="flex items-start">
                <span class="mr-2">•</span>
                <span>Send you notifications about important updates</span>
              </li>
            </ul>
          </FigCard>
          
          <FigButton
            @click="installSlack"
            :loading="installing"
            size="lg"
            class="w-full"
          >
            <template v-if="!installing">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.53 1.53a1.5 1.5 0 0 0-2.12 0L9.88 4.06a1.5 1.5 0 0 0 0 2.12l7.07 7.07a1.5 1.5 0 0 0 2.12 0l2.53-2.53a1.5 1.5 0 0 0 0-2.12L14.53 1.53zM4.06 9.88a1.5 1.5 0 0 0 0 2.12l7.07 7.07a1.5 1.5 0 0 0 2.12 0l2.53-2.53a1.5 1.5 0 0 0 0-2.12L8.71 7.35a1.5 1.5 0 0 0-2.12 0L4.06 9.88z"/>
              </svg>
              Add to Slack
            </template>
            <template v-else>
              Redirecting to Slack...
            </template>
          </FigButton>
          
          <p class="text-center text-xs text-neutral-500">
            You'll be redirected to Slack to authorise the installation
          </p>
        </div>
      </FigCard>
      
      <!-- After Installation Info -->
      <FigCard variant="flat" padding="md" class="mt-6">
        <h3 class="text-sm font-semibold text-neutral-900 mb-3 text-center">
          After installation:
        </h3>
        <ol class="space-y-2 text-sm text-neutral-600">
          <li class="flex items-start">
            <span class="font-medium text-neutral-900 mr-2">1.</span>
            <span>Team members can DM @Figgy to get started</span>
          </li>
          <li class="flex items-start">
            <span class="font-medium text-neutral-900 mr-2">2.</span>
            <span>Figgy will automatically link their accounts</span>
          </li>
          <li class="flex items-start">
            <span class="font-medium text-neutral-900 mr-2">3.</span>
            <span>Start asking financial questions right away!</span>
          </li>
        </ol>
      </FigCard>
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { FigContainer, FigCard, FigButton } from '@figgy/ui'

const config = useRuntimeConfig()
const user = useSupabaseUser()
const tenantStore = useTenantStore()
const { general } = useNotifications()

const installing = ref(false)

// Ensure tenant data is loaded
await tenantStore.fetchUserTenants()

const tenantId = computed(() => tenantStore.selectedTenantId)
const tenantName = computed(() => tenantStore.selectedTenant?.name || 'your organisation')

async function installSlack() {
  if (!user.value) {
    await navigateTo('/auth/login')
    return
  }
  
  if (!tenantId.value) {
    general.warning('No Organisation', 'Please select an organisation first')
    return
  }
  
  installing.value = true
  
  try {
    // Use the OAuth-specific API URL from runtime config
    const oauthApiUrl = config.public.oauthApiUrl || config.public.apiUrl
    if (!oauthApiUrl) {
      general.error('Configuration Error', 'OAuth API URL not configured. Please contact support.')
      return
    }
    
    const installUrl = `${oauthApiUrl}/oauth/slack/install?tenantId=${tenantId.value}`
    window.location.href = installUrl
  } catch (error) {
    general.error('Installation Error', 'Failed to redirect to Slack. Please try again.')
  } finally {
    // Reset in case they come back
    setTimeout(() => {
      installing.value = false
    }, 5000)
  }
}

// Handle OAuth callback success message
onMounted(() => {
  window.addEventListener('message', (event) => {
    if (event.data.type === 'slack-oauth-success') {
      general.success('Installation Complete', 'Figgy has been successfully installed to your Slack workspace!')
      setTimeout(() => {
        navigateTo('/dashboard')
      }, 2000)
    }
  })
})
</script>