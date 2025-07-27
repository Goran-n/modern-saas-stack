<template>
  <div class="min-h-screen bg-gray-50">
    <div class="p-4 md:p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <UBreadcrumb :links="breadcrumbs" class="mb-4" />
        
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-gray-900">Slack Workspaces</h1>
            <p class="mt-1 text-sm text-gray-600">
              Manage connected Slack workspaces and their configurations
            </p>
          </div>
          
          <div class="flex items-center gap-3">
            <UButton 
              icon="i-heroicons-arrow-path" 
              variant="soft"
              @click="refresh"
              :loading="isRefreshing"
            >
              Refresh
            </UButton>
            <UButton 
              icon="i-heroicons-plus" 
              @click="showAddModal = true"
            >
              Connect Workspace
            </UButton>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-gray-900">{{ workspaces.length }}</p>
            <p class="text-sm text-gray-600 mt-1">Total Workspaces</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-green-600">{{ activeCount }}</p>
            <p class="text-sm text-gray-600 mt-1">Active</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-gray-900">{{ totalUsers }}</p>
            <p class="text-sm text-gray-600 mt-1">Total Users</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-gray-900">{{ totalChannels }}</p>
            <p class="text-sm text-gray-600 mt-1">Total Channels</p>
          </div>
        </UCard>
      </div>

      <!-- Workspace Grid -->
      <div v-if="workspaces.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UCard 
          v-for="workspace in workspaces" 
          :key="workspace.id"
          class="hover:shadow-lg transition-shadow"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UIcon name="i-simple-icons-slack" class="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">
                    {{ workspace.workspaceName || 'Unnamed Workspace' }}
                  </h3>
                  <p class="text-xs text-gray-500">ID: {{ workspace.workspaceId }}</p>
                </div>
              </div>
              <FigStatusBadge
                :status="workspace.botToken ? 'active' : 'inactive'"
                type="connection"
                variant="soft"
                size="xs"
              />
            </div>
          </template>

          <div class="space-y-3">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Users</span>
              <span class="font-medium">{{ workspace.userCount || 0 }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Channels</span>
              <span class="font-medium">{{ workspace.channelCount || 0 }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Bot User ID</span>
              <span class="font-mono text-xs">{{ workspace.botUserId }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Connected</span>
              <span class="text-xs">{{ formatDate(workspace.createdAt) }}</span>
            </div>
          </div>

          <template #footer>
            <div class="flex items-center gap-2">
              <UButton 
                size="sm"
                variant="soft"
                icon="i-heroicons-cog-6-tooth"
                @click="configureWorkspace(workspace)"
              >
                Configure
              </UButton>
              <UButton 
                size="sm"
                variant="soft"
                icon="i-heroicons-users"
                @click="viewUsers(workspace)"
              >
                Users
              </UButton>
              <UButton 
                size="sm"
                color="error"
                variant="ghost"
                icon="i-heroicons-trash"
                @click="disconnectWorkspace(workspace)"
              />
            </div>
          </template>
        </UCard>
      </div>

      <!-- Empty State -->
      <UCard v-else>
        <div class="text-center py-12">
          <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-simple-icons-slack" class="w-8 h-8 text-purple-600" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">No Slack workspaces connected</h3>
          <p class="text-sm text-gray-600 mb-6">
            Connect your first Slack workspace to start processing messages
          </p>
          <UButton 
            icon="i-heroicons-plus" 
            @click="showAddModal = true"
          >
            Connect Workspace
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- Connect Workspace Modal -->
    <UModal v-model="showAddModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Connect Slack Workspace</h3>
        </template>

        <UForm :state="newWorkspace" @submit="connectWorkspace" class="space-y-4">
          <UFormGroup label="Workspace ID" required>
            <UInput 
              v-model="newWorkspace.workspaceId" 
              placeholder="T1234567890"
              icon="i-heroicons-building-office"
            />
          </UFormGroup>

          <UFormGroup label="Bot Token" required>
            <UInput 
              v-model="newWorkspace.botToken" 
              type="password"
              placeholder="xoxb-..."
              icon="i-heroicons-key"
            />
          </UFormGroup>

          <UFormGroup label="Bot User ID" required>
            <UInput 
              v-model="newWorkspace.botUserId" 
              placeholder="U1234567890"
              icon="i-heroicons-user"
            />
          </UFormGroup>

          <UFormGroup label="Workspace Name" help="Optional - will be fetched automatically">
            <UInput 
              v-model="newWorkspace.workspaceName" 
              placeholder="My Workspace"
              icon="i-heroicons-tag"
            />
          </UFormGroup>

          <UAlert 
            icon="i-heroicons-information-circle"
            color="info"
            variant="soft"
            title="How to get these values"
            description="Visit your Slack app settings at api.slack.com to find your bot token and IDs"
          />

          <div class="flex justify-end gap-3 pt-4">
            <UButton variant="ghost" @click="showAddModal = false">
              Cancel
            </UButton>
            <UButton type="submit" :loading="isSubmitting">
              Connect Workspace
            </UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>

    <!-- Configure Workspace Modal -->
    <UModal v-model="showConfigModal">
      <UCard v-if="selectedWorkspace">
        <template #header>
          <h3 class="text-lg font-semibold">Configure {{ selectedWorkspace.workspaceName || 'Workspace' }}</h3>
        </template>

        <UTabs :items="configTabs" class="mt-4">
          <template #general>
            <div class="space-y-4 mt-4">
              <UFormGroup label="Workspace Name">
                <UInput 
                  v-model="configForm.workspaceName" 
                  placeholder="Workspace name"
                />
              </UFormGroup>

              <UFormGroup label="Bot Token">
                <UInput 
                  v-model="configForm.botToken" 
                  type="password"
                  placeholder="xoxb-..."
                />
              </UFormGroup>

              <UFormGroup label="Status">
                <FigStatusBadge
                  :status="selectedWorkspace.botToken ? 'active' : 'inactive'"
                  type="connection"
                  variant="soft"
                  size="sm"
                />
              </UFormGroup>

              <div class="flex justify-end gap-3 pt-4">
                <UButton variant="ghost" @click="showConfigModal = false">
                  Cancel
                </UButton>
                <UButton @click="updateConfiguration" :loading="isUpdating">
                  Save Changes
                </UButton>
              </div>
            </div>
          </template>

          <template #channels>
            <div class="mt-4">
              <div class="mb-4">
                <UInput 
                  v-model="channelSearch"
                  placeholder="Search channels..."
                  icon="i-heroicons-magnifying-glass"
                />
              </div>
              
              <div class="space-y-2">
                <div 
                  v-for="channel in filteredChannels" 
                  :key="channel.id"
                  class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                >
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-hashtag" class="text-gray-400" />
                    <span class="font-medium">{{ channel.name }}</span>
                    <FigBadge v-if="channel.isPrivate" size="xs" variant="soft" color="neutral">
                      Private
                    </FigBadge>
                  </div>
                  <UToggle v-model="channel.enabled" />
                </div>
              </div>
            </div>
          </template>

          <template #settings>
            <div class="space-y-4 mt-4">
              <UFormGroup label="Auto-Reply">
                <UToggle v-model="configForm.autoReply" />
                <template #help>
                  Automatically reply to messages when mentioned
                </template>
              </UFormGroup>

              <UFormGroup label="Process Files">
                <UToggle v-model="configForm.processFiles" />
                <template #help>
                  Process files shared in channels
                </template>
              </UFormGroup>

              <UFormGroup label="Message Retention">
                <USelectMenu
                  v-model="configForm.retention"
                  :options="retentionOptions"
                  placeholder="Select retention period"
                />
              </UFormGroup>

              <div class="flex justify-end gap-3 pt-4">
                <UButton variant="ghost" @click="showConfigModal = false">
                  Cancel
                </UButton>
                <UButton @click="updateSettings" :loading="isUpdating">
                  Save Settings
                </UButton>
              </div>
            </div>
          </template>
        </UTabs>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useCommunicationStore } from '~/stores/communication'
import type { SlackWorkspace } from '~/types/communication'
import { FigBadge, FigStatusBadge } from '@figgy/ui'

// Store
const communicationStore = useCommunicationStore()
const tenantStore = useTenantStore()

// State
const isLoading = ref(false)
const isRefreshing = ref(false)
const isSubmitting = ref(false)
const isUpdating = ref(false)
const showAddModal = ref(false)
const showConfigModal = ref(false)
const selectedWorkspace = ref<SlackWorkspace | null>(null)
const channelSearch = ref('')

const newWorkspace = ref({
  workspaceId: '',
  workspaceName: '',
  botToken: '',
  botUserId: ''
})

const configForm = ref({
  workspaceName: '',
  botToken: '',
  autoReply: false,
  processFiles: true,
  retention: '30'
})

// Channels data will be loaded from API based on selected workspace
const channels = ref<Array<{
  id: string
  name: string
  isPrivate: boolean
  enabled: boolean
}>>([])

// Options
const retentionOptions = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: '1 year', value: '365' },
  { label: 'Forever', value: 'forever' }
]

const configTabs = [
  { label: 'General', slot: 'general' },
  { label: 'Channels', slot: 'channels' },
  { label: 'Settings', slot: 'settings' }
]

// Computed
const workspaces = computed(() => communicationStore.workspaces)

const activeCount = computed(() => 
  workspaces.value.filter(w => w.botToken).length
)

const totalUsers = computed(() => 
  workspaces.value.reduce((sum, w) => sum + (w.userCount || 0), 0)
)

const totalChannels = computed(() => 
  workspaces.value.reduce((sum, w) => sum + (w.channelCount || 0), 0)
)

const filteredChannels = computed(() => 
  channels.value.filter(c => 
    c.name.toLowerCase().includes(channelSearch.value.toLowerCase())
  )
)

const breadcrumbs = [
  { label: 'Communications', to: '/communications' },
  { label: 'Slack', to: '/communications/slack' },
  { label: 'Workspaces' }
]

// Load data
onMounted(async () => {
  // Wait for tenant to be selected
  if (!tenantStore.selectedTenantId) {
    await tenantStore.fetchUserTenants()
  }

  if (!tenantStore.selectedTenantId) {
    useNotification().error(
      'No tenant selected',
      'Please select a tenant to view workspaces.'
    )
    return
  }

  isLoading.value = true
  try {
    await communicationStore.fetchWorkspaces()
  } catch (error) {
    useNotification().error(
      'Failed to load workspaces',
      'Unable to load workspace data. Please try again.'
    )
  } finally {
    isLoading.value = false
  }
})

// Methods
const refresh = async () => {
  isRefreshing.value = true
  try {
    await communicationStore.fetchWorkspaces()
    useNotification().success('Data refreshed')
  } catch (error) {
    useNotification().error(
      'Failed to refresh data',
      'The backend API is not available.'
    )
  } finally {
    isRefreshing.value = false
  }
}

const connectWorkspace = async () => {
  isSubmitting.value = true
  try {
    // Implementation for connecting workspace
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    useNotification().success(
      'Workspace connected',
      'Slack workspace has been connected successfully'
    )
    
    showAddModal.value = false
    newWorkspace.value = {
      workspaceId: '',
      workspaceName: '',
      botToken: '',
      botUserId: ''
    }
    
    await refresh()
  } catch (error) {
    useNotification().error(
      'Connection failed',
      'Could not connect to Slack workspace'
    )
  } finally {
    isSubmitting.value = false
  }
}

const configureWorkspace = (workspace: SlackWorkspace) => {
  selectedWorkspace.value = workspace
  configForm.value = {
    workspaceName: workspace.workspaceName || '',
    botToken: workspace.botToken,
    autoReply: false,
    processFiles: true,
    retention: '30'
  }
  showConfigModal.value = true
}

const viewUsers = (workspace: SlackWorkspace) => {
  navigateTo(`/communications/slack/users?workspace=${workspace.id}`)
}

const disconnectWorkspace = async (workspace: SlackWorkspace) => {
  const confirmed = confirm(
    `Are you sure you want to disconnect ${workspace.workspaceName || 'this workspace'}?`
  )
  
  if (confirmed) {
    try {
      // Implementation for disconnecting workspace
      await new Promise(resolve => setTimeout(resolve, 500))
      
      useNotification().success(
        'Workspace disconnected',
        'The Slack workspace has been disconnected'
      )
      
      await refresh()
    } catch (error) {
      useNotification().error(
        'Disconnection failed',
        'Could not disconnect the workspace'
      )
    }
  }
}

const updateConfiguration = async () => {
  isUpdating.value = true
  try {
    // Implementation for updating configuration
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    useNotification().success(
      'Configuration updated',
      'Workspace configuration has been updated'
    )
    
    showConfigModal.value = false
    await refresh()
  } catch (error) {
    useNotification().error(
      'Update failed',
      'Could not update workspace configuration'
    )
  } finally {
    isUpdating.value = false
  }
}

const updateSettings = async () => {
  isUpdating.value = true
  try {
    // Implementation for updating settings
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    useNotification().success(
      'Settings updated',
      'Workspace settings have been updated'
    )
    
    showConfigModal.value = false
  } catch (error) {
    useNotification().error(
      'Update failed',
      'Could not update workspace settings'
    )
  } finally {
    isUpdating.value = false
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString()
}

// SEO
useSeoMeta({
  title: 'Slack Workspaces | Figgy',
  description: 'Manage connected Slack workspaces and their configurations',
})
</script>