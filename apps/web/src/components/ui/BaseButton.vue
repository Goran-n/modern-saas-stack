<template>
  <component
    :is="tag"
    :type="buttonType"
    :disabled="disabled || loading"
    :class="buttonClasses"
    class="transition-colors focus:outline-none"
    v-bind="linkAttrs"
    @click="handleClick"
  >
    <!-- Loading spinner -->
    <svg
      v-if="loading"
      :class="iconSizeClasses"
      class="animate-spin -ml-1 mr-2 text-current"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>

    <!-- Leading icon -->
    <component
      v-else-if="leadingIcon && !iconOnly"
      :is="leadingIcon"
      :class="iconSizeClasses"
      class="-ml-1 mr-2"
    />

    <!-- Icon-only mode -->
    <component
      v-else-if="iconOnly && (leadingIcon || trailingIcon)"
      :is="leadingIcon || trailingIcon"
      :class="iconSizeClasses"
    />

    <!-- Button text -->
    <span v-if="!iconOnly">
      <slot>{{ label }}</slot>
    </span>

    <!-- Trailing icon -->
    <component
      v-if="trailingIcon && !iconOnly && !loading"
      :is="trailingIcon"
      :class="iconSizeClasses"
      class="ml-2 -mr-1"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Size, Variant } from '../design-system/tokens'
import { buttonTokens } from '../design-system/tokens'

// Component props
interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'ghost'
  size?: Size
  disabled?: boolean
  loading?: boolean
  iconOnly?: boolean
  leadingIcon?: any
  trailingIcon?: any
  label?: string
  // Link props
  href?: string
  to?: string | object
  target?: string
  rel?: string
  // Button props
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  iconOnly: false,
  type: 'button',
})

// Component events
interface Emits {
  click: [event: MouseEvent]
}

const emit = defineEmits<Emits>()

// Computed properties
const tag = computed(() => {
  if (props.href) return 'a'
  if (props.to) return 'router-link'
  return 'button'
})

const buttonType = computed(() => {
  return tag.value === 'button' ? props.type : undefined
})

const linkAttrs = computed(() => {
  if (props.href) {
    return {
      href: props.href,
      target: props.target,
      rel: props.rel,
    }
  }
  if (props.to) {
    return {
      to: props.to,
    }
  }
  return {}
})

// Size-based classes
const sizeClasses = computed(() => {
  const size = props.size as keyof typeof buttonTokens.sizes
  return buttonTokens.sizes[size]
})

// Variant-based classes  
const variantClasses = computed(() => buttonTokens.variants[props.variant])

// Icon size classes
const iconSizeClasses = computed(() => sizeClasses.value.iconSize)

// Icon-only button padding
const iconOnlyPadding = computed(() => {
  if (!props.iconOnly) return ''
  
  switch (props.size) {
    case 'sm': return 'p-1.5'
    case 'lg': return 'p-3'
    default: return 'p-2'
  }
})

// Combined button classes
const buttonClasses = computed(() => {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'border font-medium rounded-md',
    'focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'select-none',
  ]

  // Add size classes
  if (props.iconOnly) {
    baseClasses.push(iconOnlyPadding.value)
  } else {
    baseClasses.push(sizeClasses.value.padding)
    baseClasses.push(sizeClasses.value.height)
  }
  
  baseClasses.push(sizeClasses.value.fontSize)

  // Add variant classes
  baseClasses.push(variantClasses.value.background)
  baseClasses.push(variantClasses.value.text)
  baseClasses.push(variantClasses.value.border)
  baseClasses.push(variantClasses.value.focus)
  baseClasses.push(variantClasses.value.disabled)

  return baseClasses.join(' ')
})

// Event handlers
const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>