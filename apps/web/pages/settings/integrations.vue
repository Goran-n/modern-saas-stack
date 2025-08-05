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

// Lifecycle
onMounted(() => {
  // Only fetch if tenant is already selected
  if (hasTenantSelected.value) {
    fetchEmailConnections()
  }
})

// Watch for tenant selection changes
watch(() => tenantStore.selectedTenantId, (newTenantId) => {
  if (newTenantId) {
    // Fetch email connections when a tenant is selected
    fetchEmailConnections()
  } else {
    // Clear connections if no tenant is selected
    emailConnections.value = []
  }
})
</script>