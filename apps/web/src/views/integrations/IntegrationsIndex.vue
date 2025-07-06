<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b border-neutral-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-2xl font-bold text-neutral-900">
              Integrations
            </h1>
            <p class="mt-1 text-sm text-neutral-500">
              Connect your accounting and business tools to sync data automatically
            </p>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Search -->
            <SearchInput
              v-model="searchQuery"
              placeholder="Search integrations..."
              size="sm"
              class="w-64"
            />

            <!-- Add Integration Button -->
            <BaseButton
              v-if="canCreate"
              variant="primary"
              size="sm"
              :leading-icon="PlusIcon"
              @click="showAddModal = true"
            >
              Add Integration
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading state -->
      <div
        v-if="loading && !hasIntegrations"
        class="flex justify-center py-12"
      >
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="rounded-md bg-red-50 p-4 mb-6"
      >
        <div class="flex">
          <XCircleIcon class="h-5 w-5 text-red-400" />
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">
              Error loading integrations
            </h3>
            <div class="mt-2 text-sm text-red-700">
              <p>{{ error }}</p>
            </div>
            <div class="mt-3">
              <button
                class="text-sm font-medium text-red-800 hover:text-red-700"
                @click="refresh"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!hasIntegrations && !loading"
        class="text-center py-12"
      >
        <div class="mx-auto h-24 w-24 text-neutral-400 mb-4">
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m0 0l1.102-1.102a4 4 0 015.656-5.656l-4-4z"
            />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-neutral-900 mb-2">
          No integrations yet
        </h3>
        <p class="text-neutral-500 mb-6 max-w-md mx-auto">
          Get started by connecting your first accounting or business tool to automatically sync your data.
        </p>
        <BaseButton
          v-if="canCreate"
          variant="primary"
          size="lg"
          :leading-icon="PlusIcon"
          @click="showAddModal = true"
        >
          Add Your First Integration
        </BaseButton>
      </div>

      <!-- Integrations grid -->
      <div v-else>
        <!-- Status filter tabs -->
        <div class="border-b border-neutral-200 mb-6">
          <nav class="-mb-px flex space-x-8">
            <button
              v-for="tab in statusTabs"
              :key="tab.key"
              :class="[
                'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors',
                selectedStatus === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              ]"
              @click="selectedStatus = tab.key"
            >
              {{ tab.label }}
              <span
                v-if="tab.count > 0"
                :class="[
                  'ml-2 py-0.5 px-2 rounded-full text-xs',
                  selectedStatus === tab.key
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-neutral-100 text-neutral-600'
                ]"
              >
                {{ tab.count }}
              </span>
            </button>
          </nav>
        </div>

        <!-- Action messages -->
        <div class="space-y-4 mb-6">
          <div
            v-for="integration in filteredIntegrations"
            v-show="actionMessages[integration.id]"
            :key="`message-${integration.id}`"
            :class="[
              'rounded-md p-4 transition-all duration-300',
              actionMessages[integration.id]?.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            ]"
          >
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <svg
                  v-if="actionMessages[integration.id]?.type === 'success'"
                  class="h-5 w-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
                <svg
                  v-else
                  class="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3 flex-1">
                <p
                  :class="[
                    'text-sm font-medium',
                    actionMessages[integration.id]?.type === 'success' ? 'text-green-800' : 'text-red-800'
                  ]"
                >
                  {{ integration.name }}
                </p>
                <p
                  :class="[
                    'mt-1 text-sm',
                    actionMessages[integration.id]?.type === 'success' ? 'text-green-700' : 'text-red-700'
                  ]"
                >
                  {{ actionMessages[integration.id]?.message }}
                </p>
              </div>
              <button
                :class="[
                  'ml-3 inline-flex rounded-md p-1.5 transition-colors',
                  actionMessages[integration.id]?.type === 'success' 
                    ? 'text-green-500 hover:bg-green-100' 
                    : 'text-red-500 hover:bg-red-100'
                ]"
                @click="actionMessages[integration.id] = null"
              >
                <svg
                  class="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Integration cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <IntegrationCard
            v-for="integration in filteredIntegrations"
            :key="integration.id"
            :integration="integration"
            :loading="actionLoading[integration.id]"
            @test-connection="handleTestConnection(integration.id)"
            @sync="handleSync(integration.id, $event)"
            @view-sync-jobs="handleViewSyncJobs(integration.id)"
            @reconnect="handleReconnect(integration)"
            @edit="handleEdit(integration)"
            @delete="handleDelete(integration)"
            @click="handleIntegrationClick(integration)"
          />
        </div>

        <!-- Load more button -->
        <div
          v-if="hasMoreIntegrations"
          class="text-center mt-8"
        >
          <button
            :disabled="loading"
            class="inline-flex items-center px-6 py-3 border border-neutral-300 shadow-sm text-base font-medium rounded-lg text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="loadMore"
          >
            <span v-if="loading">Loading...</span>
            <span v-else>Load More</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Add Integration Modal -->
    <IntegrationModal
      v-if="showAddModal"
      :is-open="showAddModal"
      @close="showAddModal = false"
      @created="handleIntegrationCreated"
    />

    <!-- Edit Integration Modal -->
    <IntegrationModal
      v-if="showEditModal && editingIntegration"
      :is-open="showEditModal"
      :integration="editingIntegration"
      @close="handleEditClose"
      @updated="handleIntegrationUpdated"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmationModal
      v-if="showDeleteModal && deletingIntegration"
      :is-open="showDeleteModal"
      :title="`Remove ${deletingIntegration.name}?`"
      :message="`Are you sure you want to remove this integration? This will stop all data syncing and cannot be undone.`"
      :confirm-text="'Remove Integration'"
      :confirm-variant="'danger'"
      :loading="deleteLoading"
      @close="handleDeleteClose"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { 
  PlusIcon, 
  XCircleIcon 
} from '@heroicons/vue/24/outline'

import BaseButton from '../../components/ui/BaseButton.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import IntegrationCard from '../../components/integrations/IntegrationCard.vue'
import IntegrationModal from '../../components/integrations/IntegrationModal.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'

import { useIntegrations } from '../../composables/useIntegrations'
import type { Integration, SyncType, TestConnectionResponse, TriggerSyncResponse } from '@kibly/shared-types'

// Router
const route = useRoute()

// Composables
const {
  integrations,
  activeIntegrations,
  errorIntegrations,
  hasIntegrations,
  loading,
  error,
  canCreate,
  refresh,
  testConnection,
  triggerSync,
  reconnectIntegration,
  updateIntegration,
  deleteIntegration,
  searchIntegrations
} = useIntegrations()

// Local state
const searchQuery = ref('')
const selectedStatus = ref('all')
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const editingIntegration = ref<Integration | null>(null)
const deletingIntegration = ref<Integration | null>(null)
const actionLoading = ref<Record<string, boolean>>({})
const deleteLoading = ref(false)
const hasMoreIntegrations = ref(false)
const actionMessages = ref<Record<string, { type: 'success' | 'error', message: string } | null>>({})
const messageTimeouts = ref<Record<string, NodeJS.Timeout>>({})

// Computed
const statusTabs = computed(() => {
  const setupPendingCount = integrations.value.filter(i => i.status === 'setup_pending').length
  const pendingCount = integrations.value.filter(i => i.status === 'pending' || i.status === 'setup_pending').length
  
  return [
    { key: 'all', label: 'All', count: integrations.value.length },
    { key: 'active', label: 'Active', count: activeIntegrations.value.length },
    { key: 'setup_pending', label: 'Needs Setup', count: setupPendingCount },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'error', label: 'Issues', count: errorIntegrations.value.length },
  ].filter(tab => tab.key === 'all' || tab.count > 0) // Only show tabs with items or 'all'
})

const filteredIntegrations = computed(() => {
  let filtered = integrations.value

  // Filter by status
  if (selectedStatus.value === 'active') {
    filtered = activeIntegrations.value
  } else if (selectedStatus.value === 'error') {
    filtered = errorIntegrations.value
  } else if (selectedStatus.value === 'setup_pending') {
    filtered = integrations.value.filter(i => i.status === 'setup_pending')
  } else if (selectedStatus.value === 'pending') {
    filtered = integrations.value.filter(i => i.status === 'pending' || i.status === 'setup_pending')
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(i => 
      i.name.toLowerCase().includes(query) ||
      i.provider.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Methods
const showActionMessage = (integrationId: string, type: 'success' | 'error', message: string) => {
  // Clear any existing timeout for this integration
  if (messageTimeouts.value[integrationId]) {
    clearTimeout(messageTimeouts.value[integrationId])
  }
  
  // Set the message
  actionMessages.value[integrationId] = { type, message }
  
  // Auto-clear after 5 seconds
  messageTimeouts.value[integrationId] = setTimeout(() => {
    actionMessages.value[integrationId] = null
    delete messageTimeouts.value[integrationId]
  }, 5000)
}

const handleTestConnection = async (integrationId: string) => {
  actionLoading.value[integrationId] = true
  actionMessages.value[integrationId] = null // Clear any existing message
  
  try {
    const result = await testConnection(integrationId) as TestConnectionResponse
    console.log('Connection test result:', result)
    
    if (result && result.success) {
      const integration = integrations.value.find(i => i.id === integrationId)
      const wasSetupPending = integration?.status === 'setup_pending'
      
      if (wasSetupPending) {
        showActionMessage(integrationId, 'success', 'Setup completed successfully! Your integration is now active and ready to sync.')
      } else {
        showActionMessage(integrationId, 'success', 'Connection test successful! Integration is working properly.')
      }
      
      // Update the integration status optimistically
      if (integration) {
        integration.status = 'active'
      }
    } else {
      showActionMessage(integrationId, 'error', result?.error || result?.message || 'Connection test failed. Please check your integration settings.')
    }
  } catch (error) {
    console.error('Failed to test connection:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to test connection'
    
    // Check if this is an authentication error
    if (error instanceof Error && error.name === 'AuthenticationRequiredError') {
      showActionMessage(integrationId, 'error', 'Your connection has expired. Please click "Reconnect" to re-authenticate with your provider.')
    } else {
      showActionMessage(integrationId, 'error', `Connection test failed: ${errorMessage}`)
    }
  } finally {
    actionLoading.value[integrationId] = false
  }
}

const handleSync = async (integrationId: string, syncType: 'full' | 'incremental') => {
  actionLoading.value[integrationId] = true
  actionMessages.value[integrationId] = null // Clear any existing message
  
  try {
    const response = await triggerSync(integrationId, syncType)
    console.log('Sync result:', response)
    
    // Transform response to match expected structure
    const result: TriggerSyncResponse = {
      success: true,
      message: 'Sync triggered successfully',
      syncJob: (response as any).syncJob,
      jobId: (response as any).jobId
    }
    
    if (result && result.success !== false) {
      showActionMessage(integrationId, 'success', `${syncType === 'full' ? 'Full' : 'Incremental'} sync triggered successfully! Data synchronisation is in progress.`)
    } else {
      showActionMessage(integrationId, 'error', result?.message || 'Failed to trigger sync. Please try again.')
    }
  } catch (error) {
    console.error('Failed to trigger sync:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to trigger sync'
    showActionMessage(integrationId, 'error', `Sync failed: ${errorMessage}`)
  } finally {
    actionLoading.value[integrationId] = false
  }
}

const handleViewSyncJobs = (integrationId: string) => {
  // Navigate to sync jobs view for this integration
  // For now, we'll show a simple alert with the integration ID
  // In a full implementation, this would navigate to a detailed sync jobs page
  const integration = integrations.value.find(i => i.id === integrationId)
  console.log(`Viewing sync jobs for integration: ${integration?.name} (${integrationId})`)
  
  // TODO: Implement sync jobs modal or navigate to sync jobs page
  // router.push(`/integrations/${integrationId}/sync-jobs`)
  alert(`Sync jobs view for ${integration?.name} - This would show detailed sync history and status.`)
}

const handleReconnect = async (integration: Integration) => {
  actionLoading.value[integration.id] = true
  actionMessages.value[integration.id] = null // Clear any existing message
  
  try {
    const result = await reconnectIntegration(integration)
    
    if (result && (result as any).authUrl) {
      showActionMessage(integration.id, 'success', `Reconnection started for ${integration.name}. Please complete the authentication in the new window.`)
    } else {
      showActionMessage(integration.id, 'error', 'Failed to start reconnection process. Please try again.')
    }
  } catch (error) {
    console.error('Failed to reconnect integration:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to start reconnection'
    showActionMessage(integration.id, 'error', `Reconnection failed: ${errorMessage}`)
  } finally {
    actionLoading.value[integration.id] = false
  }
}

const handleEdit = (integration: Integration) => {
  editingIntegration.value = integration
  showEditModal.value = true
}

const handleEditClose = () => {
  showEditModal.value = false
  editingIntegration.value = null
}

const handleDelete = (integration: Integration) => {
  deletingIntegration.value = integration
  showDeleteModal.value = true
}

const handleDeleteClose = () => {
  showDeleteModal.value = false
  deletingIntegration.value = null
  deleteLoading.value = false
}

const confirmDelete = async () => {
  if (!deletingIntegration.value) return

  deleteLoading.value = true
  try {
    await deleteIntegration(deletingIntegration.value.id)
    handleDeleteClose()
    // Show success notification
  } catch (error) {
    console.error('Failed to delete integration:', error)
    deleteLoading.value = false
    // Show error notification
  }
}

const handleIntegrationClick = (integration: Integration) => {
  // Navigate to integration detail view
  // router.push(`/integrations/${integration.id}`)
}

const handleIntegrationCreated = (integration: Integration) => {
  showAddModal.value = false
  refresh()
  // Show success notification
}

const handleIntegrationUpdated = (integration: Integration) => {
  handleEditClose()
  refresh()
  // Show success notification
}

const loadMore = () => {
  // Implement pagination if needed
}

// Lifecycle
onMounted(() => {
  console.log('🔍 IntegrationsIndex mounted, checking route query:', route.query)
  
  // Check if we're returning from OAuth callback
  if (route.query.step === 'select-organisation') {
    console.log('✅ OAuth callback detected, opening modal')
    showAddModal.value = true
  } else {
    console.log('ℹ️ No OAuth callback query parameter found')
  }
  
  // Note: Integration loading is now handled by the app store
  // No need for manual loading here
})

onUnmounted(() => {
  // Clear all message timeouts
  Object.values(messageTimeouts.value).forEach(timeout => {
    if (timeout) clearTimeout(timeout)
  })
})

// Watch for query parameter changes
watch(() => route.query, (newQuery) => {
  console.log('🔍 Route query changed:', newQuery)
  if (newQuery.step === 'select-organisation') {
    console.log('✅ OAuth callback detected in watcher, opening modal')
    showAddModal.value = true
  }
}, { immediate: true })
</script>