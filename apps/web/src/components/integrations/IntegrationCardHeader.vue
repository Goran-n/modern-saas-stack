<template>
  <div class="flex items-start justify-between p-6 pb-4">
    <div class="flex items-center space-x-3">
      <ProviderIcon 
        :provider="provider" 
        size="lg"
        :variant="iconVariant"
      />
      
      <div class="min-w-0 flex-1">
        <h3 class="text-lg font-semibold text-neutral-900 truncate">
          {{ name }}
        </h3>
        <p class="text-sm text-neutral-500 truncate">
          {{ providerName }} • {{ typeLabel }}
        </p>
      </div>
    </div>

    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProviderIcon from './ProviderIcon.vue'
import type { IntegrationProvider, IntegrationType } from '@kibly/shared-types'

interface Props {
  provider: IntegrationProvider
  name: string
  type: IntegrationType
  iconVariant?: 'default' | 'error'
}

const props = withDefaults(defineProps<Props>(), {
  iconVariant: 'default'
})

const providerName = computed(() => {
  const names: Record<IntegrationProvider, string> = {
    xero: 'Xero'
  }
  return names[props.provider] || props.provider
})

const typeLabel = computed(() => {
  const labels: Record<IntegrationType, string> = {
    accounting: 'Accounting'
  }
  return labels[props.type] || props.type
})
</script>