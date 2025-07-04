<template>
  <div class="relative">
    <!-- Leading icon -->
    <div
      v-if="$slots.leading || leadingIcon"
      class="absolute inset-y-0 left-0 flex items-center pointer-events-none"
      :class="leadingIconClasses"
    >
      <slot name="leading">
        <component 
          :is="leadingIcon" 
          :class="iconSizeClasses"
          class="text-neutral-400"
        />
      </slot>
    </div>

    <!-- Input element -->
    <input
      :id="inputId"
      ref="inputRef"
      v-bind="$attrs"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :autocomplete="autocomplete"
      :class="inputClasses"
      class="transition-colors"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="handleKeydown"
    />

    <!-- Trailing content -->
    <div
      v-if="$slots.trailing || trailingIcon || showClearButton"
      class="absolute inset-y-0 right-0 flex items-center"
      :class="trailingContentClasses"
    >
      <!-- Clear button -->
      <button
        v-if="showClearButton"
        type="button"
        class="p-1 text-neutral-400 hover:text-neutral-600 transition-colors rounded"
        @click="clearInput"
        :tabindex="-1"
      >
        <XMarkIcon :class="iconSizeClasses" />
      </button>

      <!-- Trailing icon or slot -->
      <div v-if="$slots.trailing || trailingIcon" class="pointer-events-none">
        <slot name="trailing">
          <component 
            :is="trailingIcon" 
            :class="iconSizeClasses"
            class="text-neutral-400"
          />
        </slot>
      </div>
    </div>
  </div>

  <!-- Helper text or error message -->
  <div v-if="helperText || errorMessage || $slots.help" class="mt-1.5">
    <p
      :class="helperTextClasses"
      class="text-2xs"
    >
      <slot name="help">
        {{ errorMessage || helperText }}
      </slot>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useAttrs, useSlots, nextTick } from 'vue'
import { XMarkIcon } from '@heroicons/vue/20/solid'
import type { Size, Variant } from '../design-system/tokens'
import { inputTokens } from '../design-system/tokens'

// Component props
interface Props {
  modelValue?: string | number
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search' | 'number'
  placeholder?: string
  size?: Size
  variant?: 'default' | 'error'
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  autocomplete?: string
  helperText?: string
  errorMessage?: string
  clearable?: boolean
  leadingIcon?: any
  trailingIcon?: any
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  variant: 'default',
  disabled: false,
  readonly: false,
  required: false,
  clearable: false,
})

// Component events
interface Emits {
  'update:modelValue': [value: string | number]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  clear: []
  keydown: [event: KeyboardEvent]
}

const emit = defineEmits<Emits>()

// Template refs
const inputRef = ref<HTMLInputElement>()

// Composables
const attrs = useAttrs()
const slots = useSlots()

// Reactive state
const isFocused = ref(false)

// Computed properties
const inputId = computed(() => props.id || `input-${Math.random().toString(36).substring(7)}`)

const hasValue = computed(() => {
  return props.modelValue !== undefined && props.modelValue !== null && props.modelValue !== ''
})

const showClearButton = computed(() => {
  return props.clearable && hasValue.value && !props.disabled && !props.readonly
})

const effectiveVariant = computed(() => {
  return props.errorMessage ? 'error' : props.variant
})

// Size-based classes
const sizeClasses = computed(() => {
  const size = props.size as keyof typeof inputTokens.sizes
  return inputTokens.sizes[size]
})

// Variant-based classes  
const variantClasses = computed(() => inputTokens.variants[effectiveVariant.value])

// Icon size classes
const iconSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-4 w-4'
    case 'lg': return 'h-5 w-5'
    default: return 'h-4 w-4'
  }
})

// Leading icon positioning
const leadingIconClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'pl-2'
    case 'lg': return 'pl-3'
    default: return 'pl-3'
  }
})

// Trailing content positioning
const trailingContentClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'pr-2 space-x-1'
    case 'lg': return 'pr-3 space-x-1'
    default: return 'pr-3 space-x-1'
  }
})

// Input padding adjustments for icons
const inputPaddingClasses = computed(() => {
  const hasLeading = slots.leading || props.leadingIcon
  const hasTrailing = slots.trailing || props.trailingIcon || showClearButton.value
  
  let classes = []
  
  if (hasLeading) {
    switch (props.size) {
      case 'sm': classes.push('pl-8')
        break
      case 'lg': classes.push('pl-10')
        break
      default: classes.push('pl-9')
    }
  }
  
  if (hasTrailing) {
    switch (props.size) {
      case 'sm': classes.push('pr-8')
        break
      case 'lg': classes.push('pr-10')
        break
      default: classes.push('pr-9')
    }
  }
  
  return classes.join(' ')
})

// Combined input classes
const inputClasses = computed(() => {
  const baseClasses = [
    'block w-full rounded-md border shadow-sm',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    sizeClasses.value.height,
    sizeClasses.value.padding,
    sizeClasses.value.fontSize,
    variantClasses.value.border,
    variantClasses.value.background,
    variantClasses.value.text,
    variantClasses.value.placeholder,
    variantClasses.value.focus,
    inputPaddingClasses.value,
  ]

  // Add disabled styles
  if (props.disabled) {
    baseClasses.push('disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed')
  }

  // Add readonly styles
  if (props.readonly) {
    baseClasses.push('bg-neutral-50 cursor-default')
  }

  return baseClasses.filter(Boolean).join(' ')
})

// Helper text classes
const helperTextClasses = computed(() => {
  if (props.errorMessage) {
    return 'text-error-600'
  }
  return 'text-neutral-500'
})

// Event handlers
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
}

const handleKeydown = (event: KeyboardEvent) => {
  emit('keydown', event)
}

const clearInput = () => {
  emit('update:modelValue', '')
  emit('clear')
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// Public methods
const focus = () => {
  inputRef.value?.focus()
}

const blur = () => {
  inputRef.value?.blur()
}

const select = () => {
  inputRef.value?.select()
}

// Expose public methods
defineExpose({
  focus,
  blur,
  select,
  inputRef,
})
</script>