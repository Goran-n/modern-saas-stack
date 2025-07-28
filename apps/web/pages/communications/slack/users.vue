<template>
  <div class="min-h-screen bg-neutral-50">
    <FigContainer max-width="6xl" class="py-8">
      <!-- Header -->
      <div class="mb-6">
        <UBreadcrumb :links="breadcrumbs" class="mb-4" />
        
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-gray-900">Slack Users</h1>
            <p class="mt-1 text-sm text-gray-600">
              Manage user mappings and permissions for {{ workspaceName }}
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
              icon="i-heroicons-arrow-down-tray" 
              variant="soft"
              @click="syncUsers"
            >
              Sync from Slack
            </UButton>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-gray-900">{{ users.length }}</p>
            <p class="text-sm text-gray-600 mt-1">Total Users</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-green-600">{{ mappedCount }}</p>
            <p class="text-sm text-gray-600 mt-1">Mapped</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-yellow-600">{{ unmappedCount }}</p>
            <p class="text-sm text-gray-600 mt-1">Unmapped</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-gray-900">{{ activeCount }}</p>
            <p class="text-sm text-gray-600 mt-1">Active</p>
          </div>
        </UCard>
      </div>

      <!-- Filters -->
      <UCard class="mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <UInput 
            v-model="searchQuery"
            placeholder="Search by name or email..."
            icon="i-heroicons-magnifying-glass"
            class="flex-1"
          />
          
          <USelectMenu
            v-model="statusFilter"
            :options="statusOptions"
            placeholder="Filter by status"
            class="w-full md:w-48"
          />
          
          <USelectMenu
            v-model="mappingFilter"
            :options="mappingOptions"
            placeholder="Filter by mapping"
            class="w-full md:w-48"
          />
          
          <UButton 
            variant="soft"
            icon="i-heroicons-funnel"
            @click="clearFilters"
            :disabled="!searchQuery && statusFilter === 'all' && mappingFilter === 'all'"
          >
            Clear
          </UButton>
        </div>
      </UCard>

      <!-- Users Table -->
      <UCard>
        <UTable
          :columns="columns"
          :rows="filteredUsers"
          :loading="isLoading"
          :empty-state="{ 
            icon: 'i-heroicons-users',
            label: 'No users found'
          }"
        >
          <template #user-data="{ row }">
            <div class="flex items-center gap-3">
              <UAvatar 
                :src="(row as any).avatar" 
                :alt="(row as any).displayName"
                size="sm"
              />
              <div>
                <p class="font-medium text-gray-900">{{ (row as any).displayName }}</p>
                <p class="text-xs text-gray-500">{{ (row as any).email || 'No email' }}</p>
              </div>
            </div>
          </template>

          <template #slackId-data="{ row }">
            <code class="px-2 py-1 bg-gray-100 rounded text-xs">
              {{ (row as any).slackId }}
            </code>
          </template>

          <template #status-data="{ row }">
            <FigStatusBadge
              :status="(row as any).isActive ? 'active' : 'inactive'"
              type="connection"
              variant="soft"
              size="xs"
            />
          </template>

          <template #mapping-data="{ row }">
            <div v-if="(row as any).mappedUserId" class="flex items-center gap-2">
              <UIcon name="i-heroicons-link" class="text-green-500" />
              <span class="text-sm">{{ (row as any).mappedUserName }}</span>
            </div>
            <div v-else class="flex items-center gap-2">
              <UIcon name="i-heroicons-link-slash" class="text-gray-400" />
              <span class="text-sm text-gray-500">Not mapped</span>
            </div>
          </template>

          <template #lastActive-data="{ row }">
            <span class="text-sm text-gray-600">
              {{ formatRelativeTime((row as any).lastActive) }}
            </span>
          </template>

          <template #actions-data="{ row }">
            <div class="flex items-center gap-2">
              <UButton
                v-if="!(row as any).mappedUserId"
                icon="i-heroicons-link"
                size="xs"
                variant="soft"
                @click="mapUser(row as any)"
              >
                Map
              </UButton>
              
              <UButton
                v-else
                icon="i-heroicons-link-slash"
                size="xs"
                color="error"
                variant="ghost"
                @click="unmapUser(row as any)"
              />
              
              <UDropdownMenu :items="getActionItems(row as any)">
                <UButton 
                  icon="i-heroicons-ellipsis-vertical" 
                  size="xs" 
                  variant="ghost"
                />
              </UDropdownMenu>
            </div>
          </template>
        </UTable>

        <!-- Pagination -->
        <div class="mt-4 flex items-center justify-between">
          <p class="text-sm text-gray-600">
            Showing {{ startIndex + 1 }} to {{ endIndex }} of {{ filteredUsers.length }} users
          </p>
          <UPagination 
            v-model="page" 
            :page-count="pageSize"
            :total="filteredUsers.length"
          />
        </div>
      </UCard>

    <!-- Map User Modal -->
    <FigModal v-model="showMapModal">
      <UCard v-if="selectedUser">
        <template #header>
          <h3 class="text-lg font-semibold">Map Slack User</h3>
        </template>

        <div class="space-y-4">
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <UAvatar 
              :src="selectedUser.avatar" 
              :alt="selectedUser.displayName"
            />
            <div>
              <p class="font-medium">{{ selectedUser.displayName }}</p>
              <p class="text-sm text-gray-600">{{ selectedUser.email }}</p>
            </div>
          </div>

          <UFormField label="Map to User" required>
            <USelectMenu
              v-model="mappingForm.userId"
              :options="systemUsers"
              option-attribute="label"
              value-attribute="value"
              placeholder="Select a user"
            />
          </UFormField>

          <UFormField label="Permissions">
            <div class="space-y-2">
              <UCheckbox v-model="mappingForm.canRead" label="Can read messages" />
              <UCheckbox v-model="mappingForm.canWrite" label="Can send messages" />
              <UCheckbox v-model="mappingForm.canManage" label="Can manage workspace" />
            </div>
          </UFormField>

          <div class="flex justify-end gap-3 pt-4">
            <UButton variant="ghost" @click="showMapModal = false">
              Cancel
            </UButton>
            <UButton @click="saveMapping" :loading="isSaving">
              Map User
            </UButton>
          </div>
        </div>
      </UCard>
    </FigModal>
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { FigContainer, FigStatusBadge, FigModal } from '@figgy/ui'

interface SlackUser {
  id: string
  slackId: string
  displayName: string
  email?: string
  avatar?: string
  isActive: boolean
  mappedUserId?: string
  mappedUserName?: string
  lastActive: string
}

// Route
const route = useRoute()
const workspaceId = computed(() => route.query.workspace as string)
const workspaceName = ref('Workspace')

// Load workspace name on mount
onMounted(async () => {
  if (!workspaceId.value) {
    await navigateTo('/communications/slack/workspaces')
    return
  }
  
  isLoading.value = true
  try {
    // TODO: Fetch workspace details and users from API
    // const workspace = await $fetch(`/api/slack/workspaces/${workspaceId.value}`)
    // workspaceName.value = workspace.name
    // users.value = await $fetch(`/api/slack/workspaces/${workspaceId.value}/users`)
    // systemUsers.value = await $fetch('/api/users')
  } catch (error) {
    useNotification().error('Failed to load workspace data', error instanceof Error ? error.message : 'Unknown error occurred')
  } finally {
    isLoading.value = false
  }
})

// State
const isLoading = ref(false)
const isRefreshing = ref(false)
const isSaving = ref(false)
const showMapModal = ref(false)
const selectedUser = ref<SlackUser | null>(null)
const searchQuery = ref('')
const statusFilter = ref('all')
const mappingFilter = ref('all')
const page = ref(1)
const pageSize = 20

const mappingForm = ref({
  userId: '',
  canRead: true,
  canWrite: true,
  canManage: false
})

// Data will be loaded from API
const users = ref<SlackUser[]>([])
const systemUsers = ref<Array<{
  value: string
  label: string
  email: string
  avatar?: string
}>>([])

// Options
const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
]

const mappingOptions = [
  { label: 'All', value: 'all' },
  { label: 'Mapped', value: 'mapped' },
  { label: 'Unmapped', value: 'unmapped' }
]

// Columns
const columns = [
  {
    id: 'user',
    key: 'user',
    label: 'User',
    sortable: true
  },
  {
    id: 'slackId',
    key: 'slackId',
    label: 'Slack ID'
  },
  {
    id: 'status',
    key: 'status',
    label: 'Status',
    sortable: true
  },
  {
    id: 'mapping',
    key: 'mapping',
    label: 'Mapping'
  },
  {
    id: 'lastActive',
    key: 'lastActive',
    label: 'Last Active',
    sortable: true
  },
  {
    id: 'actions',
    key: 'actions',
    label: 'Actions'
  }
]

// Computed
const filteredUsers = computed(() => {
  let filtered = users.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(u => 
      u.displayName.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.slackId.toLowerCase().includes(query)
    )
  }

  // Status filter
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(u => 
      statusFilter.value === 'active' ? u.isActive : !u.isActive
    )
  }

  // Mapping filter
  if (mappingFilter.value !== 'all') {
    filtered = filtered.filter(u => 
      mappingFilter.value === 'mapped' ? u.mappedUserId : !u.mappedUserId
    )
  }

  return filtered
})

// Remove paginatedUsers as we're showing all filtered users in the table

const startIndex = computed(() => (page.value - 1) * pageSize)
const endIndex = computed(() => Math.min(startIndex.value + pageSize, filteredUsers.value.length))

const mappedCount = computed(() => users.value.filter(u => u.mappedUserId).length)
const unmappedCount = computed(() => users.value.filter(u => !u.mappedUserId).length)
const activeCount = computed(() => users.value.filter(u => u.isActive).length)

const breadcrumbs = [
  { label: 'Communications', to: '/communications' },
  { label: 'Slack', to: '/communications/slack' },
  { label: 'Workspaces', to: '/communications/slack/workspaces' },
  { label: 'Users' }
]

// Methods
const refresh = async () => {
  isRefreshing.value = true
  try {
    // Implementation for refreshing users
    await new Promise(resolve => setTimeout(resolve, 1000))
    useNotification().success('Data refreshed')
  } catch (error) {
    useNotification().error('Failed to refresh data', error instanceof Error ? error.message : 'Unknown error occurred')
  } finally {
    isRefreshing.value = false
  }
}

const syncUsers = async () => {
  try {
    // Implementation for syncing users from Slack
    await new Promise(resolve => setTimeout(resolve, 2000))
    useNotification().success('Users synced', 'Successfully synced users from Slack')
  } catch (error) {
    useNotification().error('Sync failed', error instanceof Error ? error.message : 'Could not sync users from Slack')
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
  mappingFilter.value = 'all'
  page.value = 1
}

const mapUser = (user: SlackUser) => {
  selectedUser.value = user
  mappingForm.value = {
    userId: '',
    canRead: true,
    canWrite: true,
    canManage: false
  }
  showMapModal.value = true
}

const unmapUser = async (user: SlackUser) => {
  const confirmed = confirm(`Remove mapping for ${user.displayName}?`)
  
  if (confirmed) {
    try {
      // Implementation for unmapping user
      await new Promise(resolve => setTimeout(resolve, 500))
      
      user.mappedUserId = undefined
      user.mappedUserName = undefined
      
      useNotification().success('User unmapped', 'User mapping has been removed')
    } catch (error) {
      useNotification().error('Failed to unmap user', error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }
}

const saveMapping = async () => {
  isSaving.value = true
  try {
    // Implementation for saving user mapping
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (selectedUser.value) {
      const systemUser = systemUsers.value.find(u => u.value === mappingForm.value.userId)
      if (systemUser) {
        selectedUser.value.mappedUserId = mappingForm.value.userId
        selectedUser.value.mappedUserName = systemUser.label
      }
    }
    
    useNotification().success('User mapped', 'Slack user has been mapped successfully')
    showMapModal.value = false
  } catch (error) {
    useNotification().error('Mapping failed', error instanceof Error ? error.message : 'Could not map the user')
  } finally {
    isSaving.value = false
  }
}

const getActionItems = (user: SlackUser) => [
  [{
    label: 'View Details',
    icon: 'i-heroicons-eye',
    click: () => viewUserDetails(user)
  }],
  [{
    label: 'View Messages',
    icon: 'i-heroicons-chat-bubble-left-right',
    click: () => viewUserMessages(user)
  }],
  [{
    label: user.isActive ? 'Deactivate' : 'Activate',
    icon: user.isActive ? 'i-heroicons-x-circle' : 'i-heroicons-check-circle',
    click: () => toggleUserStatus(user)
  }]
]

const viewUserDetails = (_user: SlackUser) => {
  // TODO: Implementation for viewing user details
}

const viewUserMessages = (user: SlackUser) => {
  // Implementation for viewing user messages
  navigateTo(`/communications/messages?user=${user.slackId}`)
}

const toggleUserStatus = async (user: SlackUser) => {
  try {
    // Implementation for toggling user status
    await new Promise(resolve => setTimeout(resolve, 500))
    user.isActive = !user.isActive
    useNotification().success(
      user.isActive ? 'User activated' : 'User deactivated',
      `${user.displayName} has been ${user.isActive ? 'activated' : 'deactivated'}`
    )
  } catch (error) {
    useNotification().error('Status update failed', error instanceof Error ? error.message : 'Unknown error occurred')
  }
}

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
  title: 'Slack Users | Figgy',
  description: 'Manage Slack user mappings and permissions',
})
</script>