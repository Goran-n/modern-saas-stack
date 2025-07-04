<template>
  <div :class="cardClasses" @click="$emit('click')">
    <!-- Header -->
    <IntegrationCardHeader
      :provider="integration.provider"
      :name="integration.name"
      :type="integration.integrationType"
      :icon-variant="integration.status === 'error' ? 'error' : 'default'"
    >
      <template #actions v-if="showActions">
        <IntegrationCardActions
          :can-manage="canManage"
          :can-update="canUpdate"
          :is-active="integration.status === 'active'"
          :loading="loading"
          @test-connection="$emit('test-connection')"
          @sync="$emit('sync', $event)"
          @view-sync-jobs="$emit('view-sync-jobs')"
          @edit="$emit('edit')"
          @delete="$emit('delete')"
        />
      </template>
    </IntegrationCardHeader>

    <!-- Status -->
    <div class="px-6 pb-4">
      <ConnectionStatus 
        :status="connectionStatus"
        :message="healthMessage"
        size="sm"
        variant="default"
        :show-message="true"
      />
    </div>

    <!-- Stats -->
    <IntegrationCardStats
      :last-sync-at="integration.lastSyncAt"
      :sync-count="integration.syncCount"
      :status="integration.status"
      :sync-status="integration.syncStatus"
    />

    <!-- Capabilities -->
    <IntegrationCardCapabilities
      :capabilities="integration.capabilities"
    />

    <!-- Footer actions -->
    <IntegrationCardFooter
      v-if="showFooterActions"
      :status="integration.status"
      :can-manage="canManage"
      :needs-reconnection="needsReconnection"
      :created-at="integration.createdAt"
      :loading="loading"
      @sync="$emit('sync', 'incremental')"
      @reconnect="$emit('reconnect')"
      @test-connection="$emit('test-connection')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IntegrationCardHeader from './IntegrationCardHeader.vue'
import IntegrationCardStats from './IntegrationCardStats.vue'
import IntegrationCardActions from './IntegrationCardActions.vue'
import IntegrationCardCapabilities from './IntegrationCardCapabilities.vue'
import IntegrationCardFooter from './IntegrationCardFooter.vue'
import ConnectionStatus from './ConnectionStatus.vue'
import { useIntegrations } from '../../composables/useIntegrations'
import type { Integration } from '@kibly/shared-types'

interface Props {
  integration: Integration
  loading?: boolean
  showActions?: boolean
  showFooterActions?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

interface Emits {
  (e: 'test-connection'): void
  (e: 'sync', type: 'full' | 'incremental'): void
  (e: 'view-sync-jobs'): void
  (e: 'reconnect'): void
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'click'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true,
  showFooterActions: true,
  variant: 'default'
})

const emit = defineEmits<Emits>()

const { canUpdate, canManage, getHealth } = useIntegrations()

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
  // Check if integration needs re-authentication
  const errorMessage = props.integration.lastError || ''
  const health = props.integration.health
  
  // Check for authentication-related errors in health issues
  const hasAuthIssue = health?.issues?.some(issue => 
    issue.type === 'authentication_expired' || 
    issue.type === 'authentication_error'
  ) || false
  
  // Check for authentication-related errors in error message
  const hasAuthError = errorMessage.includes('re-authenticate') ||
                       errorMessage.includes('authentication') ||
                       errorMessage.includes('token') ||
                       errorMessage.includes('expired')
  
  return (props.integration.status === 'setup_pending' && hasAuthError) || hasAuthIssue
})

const cardClasses = computed(() => {
  const baseClasses = 'bg-white rounded-lg shadow-sm border border-neutral-200 hover:shadow-md transition-shadow cursor-pointer'
  
  if (props.integration.status === 'error') {
    return `${baseClasses} border-red-200`
  }
  
  if (props.integration.status === 'pending' || props.integration.status === 'setup_pending') {
    return `${baseClasses} border-yellow-200`
  }
  
  return baseClasses
})
</script>