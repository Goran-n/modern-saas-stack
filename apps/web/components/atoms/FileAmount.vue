<template>
  <span 
    :class="amountClass"
    :title="formattedAmount"
  >
    {{ formattedAmount }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  amount: string | number | null | undefined
  currency?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'primary' | 'success' | 'error' | 'muted'
  showCurrency?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'default',
  showCurrency: true,
  currency: undefined
})

const { formatCurrency } = useFileFormatters()

const formattedAmount = computed(() => {
  if (!props.amount && props.amount !== 0) return '—'
  
  // If we have currency info, use the formatter
  if (props.showCurrency) {
    return formatCurrency(props.amount, props.currency || undefined)
  }
  
  // Otherwise just format the number
  const num = typeof props.amount === 'string' ? parseFloat(props.amount) : props.amount
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
})

const amountClass = computed(() => {
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }
  
  const variants = {
    default: 'text-neutral-900 font-semibold',
    primary: 'text-primary-600 font-semibold',
    success: 'text-success-600 font-semibold',
    error: 'text-error-600 font-semibold',
    muted: 'text-neutral-600 font-medium'
  }
  
  return `${sizes[props.size]} ${variants[props.variant]}`
})
</script>