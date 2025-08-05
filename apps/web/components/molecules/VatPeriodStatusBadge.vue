<template>
  <FigBadge :color="badgeColor" size="sm">
    <Icon :name="iconName" class="h-3 w-3 mr-1" />
    {{ statusLabel }}
  </FigBadge>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FigBadge } from '@figgy/ui'
import type { VatPeriodStatus } from '@figgy/vat'

interface Props {
  status: VatPeriodStatus
}

const props = defineProps<Props>()

const statusConfig = computed(() => {
  const configs: Record<VatPeriodStatus, { label: string; color: string; icon: string }> = {
    upcoming: {
      label: 'Upcoming',
      color: 'neutral',
      icon: 'heroicons:clock'
    },
    current: {
      label: 'Current',
      color: 'primary',
      icon: 'heroicons:arrow-path'
    },
    overdue: {
      label: 'Overdue',
      color: 'error',
      icon: 'heroicons:exclamation-triangle'
    },
    submitted: {
      label: 'Submitted',
      color: 'success',
      icon: 'heroicons:check-circle'
    },
    paid: {
      label: 'Paid',
      color: 'success',
      icon: 'heroicons:check-badge'
    }
  }
  
  return configs[props.status] || configs.upcoming
})

const statusLabel = computed(() => statusConfig.value.label)
const badgeColor = computed(() => statusConfig.value.color as any)
const iconName = computed(() => statusConfig.value.icon)
</script>