<template>
  <div class="min-h-screen bg-gray-50">
    <div class="p-4 md:p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-900">Communications</h1>
        <p class="mt-1 text-sm text-gray-600">
          Monitor WhatsApp and Slack message processing
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Messages</p>
              <p class="mt-1 text-2xl font-semibold text-gray-900">
                {{ stats.totalMessages.toLocaleString() }}
              </p>
            </div>
            <div class="p-3 bg-primary-50 rounded-lg">
              <UIcon name="i-heroicons-chat-bubble-left-right" class="w-6 h-6 text-primary-600" />
            </div>
          </div>
          <div class="mt-4 flex items-center text-sm">
            <span class="text-gray-600">WhatsApp:</span>
            <span class="ml-1 font-medium">{{ stats.whatsappMessages }}</span>
            <span class="ml-3 text-gray-600">Slack:</span>
            <span class="ml-1 font-medium">{{ stats.slackMessages }}</span>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Files Today</p>
              <p class="mt-1 text-2xl font-semibold text-gray-900">
                {{ stats.filesProcessedToday }}
              </p>
            </div>
            <div class="p-3 bg-green-50 rounded-lg">
              <UIcon name="i-heroicons-document-check" class="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div class="mt-4">
            <UProgress :value="75" color="success" size="sm" />
            <p class="mt-1 text-xs text-gray-600">Processing rate</p>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Failed Processing</p>
              <p class="mt-1 text-2xl font-semibold text-gray-900">
                {{ stats.failedProcessing }}
              </p>
            </div>
            <div class="p-3 bg-red-50 rounded-lg">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div class="mt-4">
            <UButton 
              v-if="stats.failedProcessing > 0"
              size="xs" 
              variant="soft" 
              color="error"
              @click="showFailedItems"
            >
              View Failed
            </UButton>
            <span v-else class="text-xs text-gray-600">All clear</span>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Pending Verifications</p>
              <p class="mt-1 text-2xl font-semibold text-gray-900">
                {{ stats.pendingVerifications }}
              </p>
            </div>
            <div class="p-3 bg-yellow-50 rounded-lg">
              <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div class="mt-4">
            <UButton 
              v-if="stats.pendingVerifications > 0"
              size="xs" 
              variant="soft" 
              color="warning"
              to="/communications/whatsapp/verifications"
            >
              Manage
            </UButton>
            <span v-else class="text-xs text-gray-600">None pending</span>
          </div>
        </UCard>
      </div>

      <!-- Recent Activity and Quick Actions -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Activity Feed (2/3 width) -->
        <div class="lg:col-span-2">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <UButton 
                  icon="i-heroicons-arrow-path" 
                  size="xs" 
                  variant="ghost"
                  :loading="isRefreshing"
                  @click="refreshActivity"
                />
              </div>
            </template>

            <div v-if="recentActivity.length > 0" class="space-y-3">
              <div 
                v-for="activity in recentActivity" 
                :key="activity.id"
                class="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <!-- Platform Icon -->
                <div class="flex-shrink-0">
                  <div 
                    class="w-10 h-10 rounded-full flex items-center justify-center"
                    :class="getPlatformIconClass(activity.platform)"
                  >
                    <UIcon 
                      :name="getPlatformIcon(activity.platform)" 
                      class="w-5 h-5"
                    />
                  </div>
                </div>

                <!-- Activity Details -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900">
                    {{ activity.description }}
                  </p>
                  <div class="mt-1 flex items-center space-x-3">
                    <FigStatusBadge
                      :status="activity.status"
                      type="processing"
                      variant="soft"
                      size="xs"
                    />
                    <span class="text-xs text-gray-500">
                      {{ formatRelativeTime(activity.timestamp) }}
                    </span>
                  </div>
                </div>

                <!-- Actions -->
                <div v-if="activity.status === 'failed'" class="flex-shrink-0">
                  <UButton 
                    icon="i-heroicons-arrow-path" 
                    size="xs" 
                    variant="ghost"
                    color="error"
                    @click="retryActivity(activity.id)"
                  />
                </div>
              </div>
            </div>

            <div v-else class="text-center py-8">
              <UIcon name="i-heroicons-inbox" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p class="text-sm text-gray-500">No recent activity</p>
            </div>
          </UCard>
        </div>

        <!-- Quick Actions (1/3 width) -->
        <div class="space-y-4">
          <!-- Quick Actions Card -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </template>

            <div class="space-y-3">
              <UButton 
                block 
                variant="soft"
                icon="i-heroicons-shield-check"
                to="/communications/whatsapp/verifications"
              >
                Manage Verifications
              </UButton>

              <UButton 
                block 
                variant="soft"
                icon="i-heroicons-building-office"
                to="/communications/slack/workspaces"
              >
                Slack Workspaces
              </UButton>

              <UButton 
                block 
                variant="soft"
                icon="i-heroicons-arrow-path"
                @click="retryAllFailed"
                :disabled="failedCount === 0"
              >
                Retry All Failed ({{ failedCount }})
              </UButton>

              <UButton 
                block 
                variant="soft"
                icon="i-heroicons-arrow-down-tray"
                @click="downloadActivityLog"
              >
                Download Activity Log
              </UButton>
            </div>
          </UCard>

          <!-- Platform Status Card -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold text-gray-900">Platform Status</h2>
            </template>

            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <UAvatar size="sm" class="bg-green-100">
                    <UIcon name="i-simple-icons-whatsapp" class="text-green-600" />
                  </UAvatar>
                  <span class="text-sm font-medium">WhatsApp</span>
                </div>
                <FigStatusBadge
                  status="connected"
                  type="connection"
                  variant="soft"
                  size="xs"
                />
              </div>

              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <UAvatar size="sm" class="bg-purple-100">
                    <UIcon name="i-simple-icons-slack" class="text-purple-600" />
                  </UAvatar>
                  <span class="text-sm font-medium">Slack</span>
                </div>
                <FigBadge
                  :color="workspaceCount > 0 ? 'success' : 'neutral'"
                  variant="soft"
                  size="xs"
                >
                  {{ workspaceCount > 0 ? `${workspaceCount} workspaces` : 'Not configured' }}
                </FigBadge>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCommunicationStore } from '~/stores/communication'
import { FigBadge, FigStatusBadge } from '@figgy/ui'

// Store
const communicationStore = useCommunicationStore()
const tenantStore = useTenantStore()

// State
const isRefreshing = ref(false)

// Computed
const stats = computed(() => communicationStore.stats)
const recentActivity = computed(() => communicationStore.recentActivity.slice(0, 10))
const failedCount = computed(() => communicationStore.failedActivities.length)
const workspaceCount = computed(() => communicationStore.activeWorkspaces.length)

// Load data
onMounted(async () => {
  // Wait for tenant to be selected
  if (!tenantStore.selectedTenantId) {
    console.log('Waiting for tenant selection...')
    await tenantStore.fetchUserTenants()
  }

  if (!tenantStore.selectedTenantId) {
    console.error('No tenant selected')
    useNotification().error(
      'No tenant selected',
      'Please select a tenant to view communications.'
    )
    return
  }

  try {
    await Promise.all([
      communicationStore.fetchStats(),
      communicationStore.fetchRecentActivity(),
      communicationStore.fetchWorkspaces()
    ])
  } catch (error) {
    console.error('Failed to load communication data:', error)
    useNotification().error(
      'Failed to load data',
      'Unable to load communication data. Please try again.'
    )
  }
})

// Methods
const refreshActivity = async () => {
  isRefreshing.value = true
  try {
    await communicationStore.fetchRecentActivity()
  } finally {
    isRefreshing.value = false
  }
}

const retryActivity = async (activityId: string) => {
  try {
    await communicationStore.retryFailedProcessing(activityId)
    useNotification().success('Retry initiated', 'Processing has been restarted')
  } catch (error) {
    useNotification().error('Retry failed', 'Could not restart processing')
  }
}

const retryAllFailed = async () => {
  // Implementation for retrying all failed items
  useNotification().info('Retrying all failed items', `Processing ${failedCount.value} items`)
}

const showFailedItems = () => {
  // Navigate to failed items view
  navigateTo('/communications/failed')
}

const downloadActivityLog = () => {
  // Implementation for downloading activity log
  useNotification().info('Preparing download', 'Your activity log will download shortly')
}

const getPlatformIcon = (platform: string) => {
  return platform === 'whatsapp' ? 'i-simple-icons-whatsapp' : 'i-simple-icons-slack'
}

const getPlatformIconClass = (platform: string) => {
  return platform === 'whatsapp' 
    ? 'bg-green-100 text-green-600' 
    : 'bg-purple-100 text-purple-600'
}

// Status color logic is now handled by FigStatusBadge component

const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// SEO
useSeoMeta({
  title: 'Communications | Figgy',
  description: 'Monitor WhatsApp and Slack message processing and file handling',
})
</script>