<template>
  <div class="min-h-screen bg-neutral-50">
    <FigContainer max-width="6xl" class="py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <FigButton 
          variant="ghost" 
          color="neutral"
          size="sm"
          @click="router.push('/settings')"
          class="mb-4"
        >
          <span class="flex items-center gap-2">
            <Icon name="heroicons:arrow-left" class="h-4 w-4" />
            Back to Settings
          </span>
        </FigButton>
        <h1 class="text-3xl font-bold text-neutral-900">Integrations</h1>
        <p class="mt-2 text-neutral-600">
          Connect external services to automate your workflow
        </p>
      </div>

      <!-- No Tenant Selected Warning -->
      <div v-if="!hasTenantSelected" class="mb-6">
        <FigAlert type="warning">
          <template #title>No Organisation Selected</template>
          Please select an organisation from the dropdown above to manage integrations.
        </FigAlert>
      </div>

      <!-- Email Integration Section -->
      <div class="space-y-6">
        <FigCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold">Email Integration</h3>
                <p class="text-sm text-neutral-500 mt-1">Forward invoices and receipts to automatically process them</p>
              </div>
              <FigButton 
                v-if="hasAdminAccess && hasTenantSelected"
                @click="showAddEmailModal = true"
                size="sm"
                variant="solid"
                color="primary"
                :disabled="!hasTenantSelected"
              >
                <Icon name="heroicons:plus" class="h-4 w-4 mr-1" />
                Connect Email
              </FigButton>
            </div>
          </template>

          <!-- No Tenant Selected State -->
          <div v-if="!hasTenantSelected" class="p-12 text-center">
            <Icon name="heroicons:building-office" class="mx-auto h-12 w-12 text-neutral-400 mb-4" />
            <h3 class="text-sm font-semibold text-neutral-900 mb-1">Select an organisation</h3>
            <p class="text-sm text-neutral-500">
              Choose an organisation to view and manage email integrations
            </p>
          </div>

          <!-- Loading State -->
          <div v-else-if="emailLoading" class="space-y-4 p-6">
            <FigSkeleton height="h-20" />
            <FigSkeleton height="h-20" />
          </div>

          <!-- Email Connections -->
          <div v-else-if="emailConnections.length > 0" class="divide-y divide-neutral-200">
            <EmailConnectionCard
              v-for="connection in emailConnections"
              :key="connection.id"
              :connection="connection"
              @sync="handleSync"
              @edit="handleEdit"
              @delete="handleDelete"
            />
          </div>

          <!-- Empty State -->
          <div v-else class="p-12 text-center">
            <Icon name="heroicons:envelope" class="mx-auto h-12 w-12 text-neutral-400 mb-4" />
            <h3 class="text-sm font-semibold text-neutral-900 mb-1">No email connections</h3>
            <p class="text-sm text-neutral-500 mb-4">
              Connect your email accounts to automatically import invoices and receipts
            </p>
            <FigButton
              v-if="hasAdminAccess && hasTenantSelected"
              @click="showAddEmailModal = true"
              size="sm"
              color="primary"
              :disabled="!hasTenantSelected"
            >
              Connect Your First Email
            </FigButton>
          </div>
        </FigCard>

        <!-- Other Integrations Section -->
        <FigCard>
          <template #header>
            <div>
              <h3 class="text-lg font-semibold">Accounting Software</h3>
              <p class="text-sm text-neutral-500 mt-1">Sync processed documents with your accounting system</p>
            </div>
          </template>

          <div class="p-12 text-center">
            <Icon name="heroicons:calculator" class="mx-auto h-12 w-12 text-neutral-400 mb-4" />
            <h3 class="text-sm font-semibold text-neutral-900 mb-1">Coming Soon</h3>
            <p class="text-sm text-neutral-500">
              Xero, QuickBooks, and other accounting integrations will be available soon
            </p>
          </div>
        </FigCard>

        <!-- Government Services Section -->
        <FigCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold">Government Services</h3>
                <p class="text-sm text-neutral-500 mt-1">Connect to HMRC for automated VAT management</p>
              </div>
              <FigButton 
                v-if="hasAdminAccess && hasTenantSelected && companyVatEnabled"
                @click="showHmrcConnectionModal = true"
                size="sm"
                variant="solid"
                color="primary"
                :disabled="!hasTenantSelected || hmrcConnected"
              >
                <Icon name="heroicons:link" class="h-4 w-4 mr-1" />
                {{ hmrcConnected ? 'Connected' : 'Connect HMRC' }}
              </FigButton>
            </div>
          </template>

          <!-- No Tenant Selected State -->
          <div v-if="!hasTenantSelected" class="p-12 text-center">
            <Icon name="heroicons:building-office" class="mx-auto h-12 w-12 text-neutral-400 mb-4" />
            <h3 class="text-sm font-semibold text-neutral-900 mb-1">Select an organisation</h3>
            <p class="text-sm text-neutral-500">
              Choose an organisation to view and manage HMRC connections
            </p>
          </div>

          <!-- VAT Not Enabled State -->
          <div v-else-if="!companyVatEnabled" class="p-12 text-center">
            <Icon name="heroicons:calculator" class="mx-auto h-12 w-12 text-neutral-400 mb-4" />
            <h3 class="text-sm font-semibold text-neutral-900 mb-1">VAT not enabled</h3>
            <p class="text-sm text-neutral-500 mb-4">
              Enable VAT registration in company settings first
            </p>
            <FigButton
              size="sm"
              variant="soft"
              @click="router.push('/settings/company')"
            >
              Go to Company Settings
            </FigButton>
          </div>

          <!-- HMRC Connected State -->
          <div v-else-if="hmrcConnected" class="p-6">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0">
                <div class="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Icon name="heroicons:check-circle" class="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-semibold text-neutral-900">HMRC Connected</h4>
                <p class="text-sm text-neutral-500 mt-1">
                  Your VAT obligations are syncing automatically
                </p>
                <div class="mt-3 flex items-center gap-4 text-xs text-neutral-500">
                  <span>Last synced: {{ hmrcLastSync || 'Never' }}</span>
                  <span>•</span>
                  <button 
                    @click="syncHmrc" 
                    class="text-primary-600 hover:text-primary-700 font-medium"
                    :disabled="hmrcSyncing"
                  >
                    {{ hmrcSyncing ? 'Syncing...' : 'Sync now' }}
                  </button>
                </div>
              </div>
              <FigButton
                size="sm"
                variant="ghost"
                color="neutral"
                @click="router.push('/settings/vat')"
              >
                Manage VAT
              </FigButton>
            </div>
          </div>

          <!-- Not Connected State -->
          <div v-else class="p-12 text-center">
            <Icon name="noto:flag-united-kingdom" class="mx-auto h-12 w-12 mb-4" />
            <h3 class="text-sm font-semibold text-neutral-900 mb-1">Connect to HMRC</h3>
            <p class="text-sm text-neutral-500 mb-4">
              Automatically sync your VAT obligations and submit returns
            </p>
            <FigButton
              v-if="hasAdminAccess && hasTenantSelected"
              @click="showHmrcConnectionModal = true"
              size="sm"
              color="primary"
            >
              Connect HMRC Account
            </FigButton>
          </div>
        </FigCard>

        <!-- Communication Channels Section -->
        <FigCard>
          <template #header>
            <div>
              <h3 class="text-lg font-semibold">Communication Channels</h3>
              <p class="text-sm text-neutral-500 mt-1">Send documents through your preferred channels</p>
            </div>
          </template>

          <div class="p-12 text-center">
            <Icon name="heroicons:chat-bubble-left-right" class="mx-auto h-12 w-12 text-neutral-400 mb-4" />
            <h3 class="text-sm font-semibold text-neutral-900 mb-1">Coming Soon</h3>
            <p class="text-sm text-neutral-500">
              Slack and WhatsApp integrations will be available soon
            </p>
          </div>
        </FigCard>
      </div>

      <!-- Add Email Connection Modal -->
      <AddEmailConnectionModal 
        v-model="showAddEmailModal"
        @success="handleConnectionSuccess"
      />

      <!-- HMRC Connection Modal (placeholder) -->
      <!-- TODO: Create AddOAuthConnectionModal for HMRC -->
      <!-- <AddOAuthConnectionModal 
        v-model="showHmrcConnectionModal"
        provider="hmrc"
        @success="checkHmrcConnection"
      /> -->
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { FigContainer, FigCard, FigButton, FigSkeleton } from '@figgy/ui'
import EmailConnectionCard from '~/components/molecules/EmailConnectionCard.vue'
import AddEmailConnectionModal from '~/components/organisms/AddEmailConnectionModal.vue'

// Page metadata
definePageMeta({
  middleware: ['auth']
})

// Composables
const router = useRouter()
const toast = useToast()
const $trpc = useTrpc()
const tenantStore = useTenantStore()

// State
const emailConnections = ref<any[]>([])
const emailLoading = ref(true)
const showAddEmailModal = ref(false)
const showHmrcConnectionModal = ref(false)
const hmrcConnected = ref(false)
const hmrcLastSync = ref<string | null>(null)
const hmrcSyncing = ref(false)
const companyVatEnabled = ref(false)

// Computed
const hasAdminAccess = computed(() => {
  const userTenants = tenantStore.userTenants
  const selectedTenantId = tenantStore.selectedTenantId
  const currentUserTenant = userTenants.find(ut => ut.tenantId === selectedTenantId)
  return currentUserTenant?.role === 'admin' || currentUserTenant?.role === 'owner'
})

const hasTenantSelected = computed(() => {
  return !!tenantStore.selectedTenantId
})

// Methods
async function fetchEmailConnections() {
  // Don't fetch if no tenant is selected
  if (!hasTenantSelected.value) {
    console.log('No tenant selected, skipping email connections fetch')
    return
  }

  try {
    emailLoading.value = true
    const result = await $trpc.email.listConnections.query()
    emailConnections.value = result
  } catch (error) {
    console.error('Failed to fetch email connections:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load email connections',
      color: 'error' as const,
    })
  } finally {
    emailLoading.value = false
  }
}

async function handleSync(connectionId: string) {
  try {
    await $trpc.email.syncConnection.mutate({ connectionId })
    toast.add({
      title: 'Sync Started',
      description: 'Email sync has been initiated',
      color: 'success' as const,
    })
  } catch (error) {
    toast.add({
      title: 'Sync Failed',
      description: 'Failed to start email sync',
      color: 'error' as const,
    })
  }
}

function handleEdit(_connection: any) {
  // TODO: Implement edit functionality
  toast.add({
    title: 'Coming Soon',
    description: 'Edit functionality will be available soon',
    color: 'primary' as const,
  })
}

async function handleDelete(connectionId: string) {
  // TODO: Add confirmation dialog
  try {
    await $trpc.email.deleteConnection.mutate({ connectionId })
    await fetchEmailConnections()
    toast.add({
      title: 'Connection Removed',
      description: 'Email connection has been deleted',
      color: 'success' as const,
    })
  } catch (error) {
    toast.add({
      title: 'Delete Failed',
      description: 'Failed to remove email connection',
      color: 'error' as const,
    })
  }
}

function handleConnectionSuccess() {
  showAddEmailModal.value = false
  fetchEmailConnections()
}

async function checkVatStatus() {
  if (!hasTenantSelected.value) return
  
  try {
    const company = await $trpc.tenant.getCompanyConfig.query()
    companyVatEnabled.value = company?.vat?.isRegistered || false
  } catch (error) {
    console.error('Failed to check VAT status:', error)
  }
}

async function checkHmrcConnection() {
  if (!hasTenantSelected.value) return
  
  try {
    // TODO: Implement HMRC connection check via tRPC
    // const connection = await $trpc.oauth.getConnection.query({ provider: 'hmrc' })
    // hmrcConnected.value = !!connection
    // hmrcLastSync.value = connection?.lastSync || null
  } catch (error) {
    console.error('Failed to check HMRC connection:', error)
  }
}

async function syncHmrc() {
  try {
    hmrcSyncing.value = true
    // TODO: Implement HMRC sync via tRPC
    // await $trpc.vat.syncWithHmrc.mutate()
    toast.add({
      title: 'Sync Started',
      description: 'HMRC VAT sync has been initiated',
      color: 'success' as const,
    })
    await checkHmrcConnection()
  } catch (error) {
    toast.add({
      title: 'Sync Failed',
      description: 'Failed to sync with HMRC',
      color: 'error' as const,
    })
  } finally {
    hmrcSyncing.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Only fetch if tenant is already selected
  if (hasTenantSelected.value) {
    fetchEmailConnections()
    checkVatStatus()
    checkHmrcConnection()
  }
})

// Watch for tenant selection changes
watch(() => tenantStore.selectedTenantId, (newTenantId) => {
  if (newTenantId) {
    // Fetch data when a tenant is selected
    fetchEmailConnections()
    checkVatStatus()
    checkHmrcConnection()
  } else {
    // Clear data if no tenant is selected
    emailConnections.value = []
    companyVatEnabled.value = false
    hmrcConnected.value = false
  }
})
</script>