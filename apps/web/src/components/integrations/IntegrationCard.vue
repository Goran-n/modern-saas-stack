<template>
  <div 
    :class="[
      'bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer',
      integration.status === 'error' ? 'border-red-200' : 
      ['pending', 'setup_pending'].includes(integration.status) ? 'border-yellow-200' : 
      'border-neutral-200'
    ]"
    @click="$emit('click')"
  >
    <!-- Header -->
    <div class="px-6 pt-6 pb-4">
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-3">
          <div
            :class="[
              'p-2 rounded-lg',
              integration.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
            ]"
          >
            <component
              :is="getProviderIcon(integration.provider)"
              class="h-6 w-6"
            />
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-900">
              {{ integration.name }}
            </h3>
            <p class="text-xs text-gray-500 capitalize">
              {{ integration.integrationType }}
            </p>
          </div>
        </div>
        
        <!-- Actions dropdown -->
        <Menu
          v-if="showActions"
          as="div"
          class="relative"
        >
          <MenuButton class="p-1 rounded hover:bg-gray-100">
            <EllipsisVerticalIcon class="h-5 w-5 text-gray-400" />
          </MenuButton>
          <MenuItems class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
            <MenuItem
              v-if="canManage"
              v-slot="{ active }"
            >
              <button
                :class="[active ? 'bg-gray-100' : '', 'block w-full text-left px-4 py-2 text-sm text-gray-700']"
                @click.stop="$emit('edit')"
              >
                Edit
              </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
              <button
                :class="[active ? 'bg-gray-100' : '', 'block w-full text-left px-4 py-2 text-sm text-gray-700']"
                @click.stop="$emit('test-connection')"
              >
                Test Connection
              </button>
            </MenuItem>
            <MenuItem
              v-if="canManage"
              v-slot="{ active }"
            >
              <button
                :class="[active ? 'bg-gray-100' : '', 'block w-full text-left px-4 py-2 text-sm text-red-700']"
                @click.stop="$emit('delete')"
              >
                Delete
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>
    </div>

    <!-- Status -->
    <div class="px-6 pb-4">
      <div class="flex items-center space-x-2">
        <div
          :class="[
            'h-2 w-2 rounded-full',
            statusColors[connectionStatus]
          ]"
        />
        <span class="text-sm text-gray-600">{{ healthMessage }}</span>
      </div>
    </div>

    <!-- Stats -->
    <div class="px-6 pb-4 grid grid-cols-2 gap-4 text-sm">
      <div>
        <p class="text-gray-500">
          Last sync
        </p>
        <p class="font-medium">
          {{ formatLastSync(integration.lastSyncAt) }}
        </p>
      </div>
      <div>
        <p class="text-gray-500">
          Total syncs
        </p>
        <p class="font-medium">
          {{ integration.syncCount || 0 }}
        </p>
      </div>
    </div>

    <!-- Capabilities -->
    <div
      v-if="hasCapabilities"
      class="px-6 pb-4"
    >
      <div class="flex flex-wrap gap-2">
        <span
          v-for="capability in allCapabilities"
          :key="capability"
          class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
        >
          {{ formatCapability(capability) }}
        </span>
      </div>
    </div>

    <!-- Footer -->
    <div
      v-if="showFooterActions"
      class="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500">
          Created {{ formatDate(integration.createdAt) }}
        </span>
        <div class="flex items-center space-x-2">
          <button
            v-if="needsReconnection"
            class="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
            @click.stop="$emit('reconnect')"
          >
            Reconnect
          </button>
          <button
            v-else-if="integration.status === 'active'"
            class="px-3 py-1 text-xs font-medium text-primary-600 border border-primary-600 rounded hover:bg-primary-50"
            :disabled="loading"
            @click.stop="$emit('sync', 'incremental')"
          >
            {{ loading ? 'Syncing...' : 'Sync Now' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { EllipsisVerticalIcon } from '@heroicons/vue/24/outline'
import { useIntegrations } from '@/composables/useIntegrations'
import { formatRelativeDate, formatDate } from '@/utils/date'
import type { Integration } from '@kibly/shared-types'

interface Props {
  integration: Integration
  loading?: boolean
  showActions?: boolean
  showFooterActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true,
  showFooterActions: true
})

defineEmits<{
  'test-connection': []
  'sync': [type: 'full' | 'incremental']
  'reconnect': []
  'edit': []
  'delete': []
  'click': []
}>()

const { canUpdate, canManage, getHealth } = useIntegrations()

const statusColors = {
  healthy: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  syncing: 'bg-blue-500 animate-pulse',
  unknown: 'bg-gray-500'
}

const connectionStatus = computed(() => {
  if (props.loading) return 'syncing'
  
  const health = getHealth(props.integration)
  
  switch (health.status) {
    case 'healthy': return 'healthy'
    case 'warning': return 'warning'
    case 'error': return 'error'
    case 'stale': return 'warning'
    default: return 'unknown'
  }
})

const healthMessage = computed(() => {
  const health = getHealth(props.integration)
  return health.message
})

const needsReconnection = computed(() => {
  const health = props.integration.health
  const hasAuthIssue = health?.issues?.some(issue => 
    ['authentication_expired', 'authentication_error'].includes(issue.type)
  ) || false
  
  const errorMessage = props.integration.lastError || ''
  const hasAuthError = ['re-authenticate', 'authentication', 'token', 'expired']
    .some(term => errorMessage.includes(term))
  
  return (props.integration.status === 'setup_pending' && hasAuthError) || hasAuthIssue
})

function getProviderIcon(provider: string) {
  // Return appropriate icon component based on provider
  // This is a simplified version - you'd import actual icons
  return 'div'
}

function formatLastSync(date: Date | string | null | undefined) {
  return date ? formatRelativeDate(date) : 'Never'
}

const hasCapabilities = computed(() => {
  const caps = props.integration.capabilities
  return caps && (caps.read?.length > 0 || caps.write?.length > 0)
})

const allCapabilities = computed(() => {
  const caps = props.integration.capabilities
  if (!caps) return []
  return [...(caps.read || []), ...(caps.write || [])]
})

function formatCapability(capability: string) {
  return capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
</script>