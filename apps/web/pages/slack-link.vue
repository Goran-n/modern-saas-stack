<template>
  <div class="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
    <FigContainer max-width="md" class="w-full">
      <FigCard padding="xl" variant="elevated" class="text-center">
        <!-- Loading State -->
        <div v-if="loading" class="py-12">
          <FigSpinner size="lg" class="mx-auto mb-4" />
          <h2 class="text-2xl font-semibold text-neutral-900">Verifying your link...</h2>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="py-12">
          <div class="text-4xl mb-4">⚠️</div>
          <h2 class="text-2xl font-semibold text-neutral-900 mb-2">{{ errorTitle }}</h2>
          <p class="text-neutral-600 mb-6">{{ error }}</p>
          <FigButton variant="outline" color="neutral" @click="navigateTo('/')">
            Go to Dashboard
          </FigButton>
        </div>

        <!-- Auth Required -->
        <div v-else-if="!user" class="py-12">
          <SlackIcon class="mx-auto mb-6" />
          <h2 class="text-2xl font-semibold text-neutral-900 mb-2">Link Your Slack Account</h2>
          <p class="text-neutral-600 mb-6">Please sign in to link your Slack account with Figgy.</p>
          <FigButton @click="signIn" size="lg">
            Sign in to Continue
          </FigButton>
        </div>

        <!-- No Tenants -->
        <div v-else-if="!tenants || tenants.length === 0" class="py-12">
          <div class="text-4xl mb-4">🔍</div>
          <h2 class="text-2xl font-semibold text-neutral-900 mb-2">No Organisations Found</h2>
          <p class="text-neutral-600 mb-6">You don't have access to any organisations yet. Please contact your administrator.</p>
          <FigButton variant="outline" color="neutral" @click="navigateTo('/')">
            Go to Dashboard
          </FigButton>
        </div>

        <!-- Linking State -->
        <div v-else-if="slackAuth.linking.value" class="py-12">
          <FigSpinner size="lg" class="mx-auto mb-4" />
          <h2 class="text-2xl font-semibold text-neutral-900 mb-2">Linking your account...</h2>
          <p class="text-neutral-600">Please wait while we connect your Slack account.</p>
        </div>

        <!-- Success State -->
        <div v-else-if="linkingComplete" class="py-12">
          <div class="text-4xl mb-4 text-success-600">✅</div>
          <h2 class="text-2xl font-semibold text-neutral-900 mb-2">Account Linked Successfully!</h2>
          <p class="text-neutral-600 mb-2">Your Slack account has been linked to {{ linkedTenantNames }}.</p>
          <p class="text-success-600 font-medium mb-6">You can now return to Slack and start using Figgy!</p>
          <div class="flex gap-3 justify-center">
            <FigButton @click="slackAuth.openSlackApp">
              Open Slack
            </FigButton>
            <FigButton variant="outline" color="neutral" @click="navigateTo('/')">
              Go to Dashboard
            </FigButton>
          </div>
        </div>

        <!-- Tenant Selection -->
        <div v-else>
          <SlackIcon class="mx-auto mb-6" />
          <h2 class="text-2xl font-semibold text-neutral-900 mb-2">Link Your Slack Account</h2>
          <p v-if="slackAuth.tokenInfo.value?.slackEmail" class="text-neutral-600 mb-2">
            Linking Slack account: <span class="font-semibold">{{ slackAuth.tokenInfo.value.slackEmail }}</span>
          </p>
          <p class="text-neutral-600 mb-6">Select the organisations you want to link:</p>
          
          <FigCard variant="outlined" padding="none" class="mb-6 max-h-80 overflow-y-auto">
            <div class="divide-y divide-neutral-200">
              <label 
                v-for="tenant in tenants" 
                :key="tenant.id"
                class="flex items-center p-4 hover:bg-neutral-50 cursor-pointer transition-colors"
              >
                <FigCheckbox 
                  :model-value="selectedTenants.includes(tenant.id)"
                  @update:model-value="toggleTenant(tenant.id)"
                  :disabled="slackAuth.linking.value"
                />
                <div class="ml-3 flex-1">
                  <span class="font-medium text-neutral-900">{{ tenant.name }}</span>
                  <span class="text-sm text-neutral-500 ml-2">({{ tenant.role }})</span>
                </div>
              </label>
            </div>
          </FigCard>

          <div class="flex gap-3 justify-center">
            <FigButton 
              @click="linkAccount" 
              :disabled="selectedTenants.length === 0"
              :loading="slackAuth.linking.value"
              size="lg"
            >
              Link Selected Organisations
            </FigButton>
            <FigButton 
              @click="selectAll" 
              variant="outline" 
              color="neutral"
              size="lg"
            >
              Select All
            </FigButton>
          </div>
        </div>
      </FigCard>
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { FigButton, FigCard, FigSpinner, FigCheckbox, FigContainer } from '@figgy/ui'
import type { SlackTenant } from '~/composables/useSlackAuth'

const route = useRoute()
const user = useSupabaseUser()
const api = useApi()
const slackAuth = useSlackAuth()

const loading = ref(true)
const linkingComplete = ref(false)
const error = ref('')
const errorTitle = ref('Error')
const tenants = ref<SlackTenant[]>([])
const selectedTenants = ref<string[]>([])

const linkedTenantNames = computed(() => {
  if (!tenants.value || selectedTenants.value.length === 0) return ''
  const selected = tenants.value
    .filter(t => selectedTenants.value.includes(t.id))
    .map(t => t.name)
  
  if (selected.length === 1) return selected[0]
  if (selected.length === 2) return `${selected[0]} and ${selected[1]}`
  return `${selected.slice(0, -1).join(', ')}, and ${selected[selected.length - 1]}`
})

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    error.value = 'No linking token provided. Please return to Slack and request a new link.'
    errorTitle.value = 'Invalid Link'
    loading.value = false
    return
  }

  // If user is not authenticated, show sign in prompt
  if (!user.value) {
    loading.value = false
    return
  }

  // Verify the token
  const isValid = await slackAuth.verifySlackToken(token)
  if (!isValid) {
    error.value = slackAuth.error.value
    errorTitle.value = 'Link Expired'
    loading.value = false
    return
  }

  try {
    // Get user's tenants
    const tenantsResponse = await api.get('/trpc/auth.getUserTenants')
    const userTenants = (tenantsResponse as any).result?.data?.json || []
    
    // Transform to match expected format
    tenants.value = userTenants.map((ut: any) => ({
      id: ut.tenant.id,
      name: ut.tenant.name,
      role: ut.role
    }))

    // Auto-select all tenants by default
    selectedTenants.value = tenants.value.map(t => t.id)

    loading.value = false
  } catch (err) {
    error.value = 'An error occurred while loading your organisations. Please try again.'
    loading.value = false
  }
})

async function signIn() {
  // Store the current URL to return after sign in
  sessionStorage.setItem('slack-link-return', window.location.href)
  await navigateTo('/auth/login')
}

async function linkAccount() {
  const token = route.query.token as string
  const success = await slackAuth.linkSlackAccount(token, selectedTenants.value)
  
  if (success) {
    linkingComplete.value = true
  } else {
    error.value = slackAuth.error.value
    errorTitle.value = 'Linking Failed'
  }
}

function selectAll() {
  selectedTenants.value = tenants.value.map(t => t.id)
}

function toggleTenant(tenantId: string) {
  const index = selectedTenants.value.indexOf(tenantId)
  if (index > -1) {
    selectedTenants.value.splice(index, 1)
  } else {
    selectedTenants.value.push(tenantId)
  }
}
</script>