<template>
  <BaseInput
    v-model="searchValue"
    type="search"
    :placeholder="placeholder"
    :size="size"
    :disabled="disabled"
    :clearable="clearable"
    :leading-icon="MagnifyingGlassIcon"
    v-bind="$attrs"
    @update:model-value="handleSearch"
    @clear="handleClear"
    @keydown="handleKeydown"
  >
    <!-- Pass through slots -->
    <template v-if="$slots.trailing" #trailing>
      <slot name="trailing" />
    </template>
    
    <template v-if="$slots.help" #help>
      <slot name="help" />
    </template>
  </BaseInput>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/20/solid'
import BaseInput from './BaseInput.vue'
import type { Size } from '../design-system/tokens'

// Component props
interface Props {
  modelValue?: string
  placeholder?: string
  size?: Size
  disabled?: boolean
  clearable?: boolean
  debounceMs?: number
  minLength?: number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search...',
  size: 'md',
  disabled: false,
  clearable: true,
  debounceMs: 300,
  minLength: 0,
})

// Component events
interface Emits {
  'update:modelValue': [value: string]
  search: [query: string]
  clear: []
  'keydown:enter': [query: string]
  'keydown:escape': []
}

const emit = defineEmits<Emits>()

// Local state
const searchValue = ref(props.modelValue || '')
const debounceTimer = ref<NodeJS.Timeout>()

// Computed properties
const shouldEmitSearch = computed(() => {
  return searchValue.value.length >= props.minLength
})

// Watch for external model value changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== searchValue.value) {
    searchValue.value = newValue || ''
  }
})

// Debounced search handler
const handleSearch = (value: string | number) => {
  const stringValue = String(value)
  searchValue.value = stringValue
  emit('update:modelValue', stringValue)

  // Clear existing timer
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }

  // Set up debounced search
  if (props.debounceMs > 0) {
    debounceTimer.value = setTimeout(() => {
      if (shouldEmitSearch.value) {
        emit('search', searchValue.value)
      }
    }, props.debounceMs)
  } else {
    // Immediate search if no debounce
    if (shouldEmitSearch.value) {
      emit('search', searchValue.value)
    }
  }
}

// Clear handler
const handleClear = () => {
  searchValue.value = ''
  emit('update:modelValue', '')
  emit('clear')
  emit('search', '')
  
  // Clear any pending debounced search
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
}

// Keyboard event handler
const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      emit('keydown:enter', searchValue.value)
      // Immediately emit search on Enter, bypassing debounce
      if (shouldEmitSearch.value) {
        if (debounceTimer.value) {
          clearTimeout(debounceTimer.value)
        }
        emit('search', searchValue.value)
      }
      break
    
    case 'Escape':
      event.preventDefault()
      emit('keydown:escape')
      if (searchValue.value) {
        handleClear()
      }
      break
  }
}

// Cleanup on unmount
const cleanup = () => {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
}

// Vue lifecycle
import { onUnmounted } from 'vue'
onUnmounted(cleanup)
</script>