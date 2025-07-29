<template>
  <div class="relative w-full max-w-xl">
    <FigInput
      v-model="internalValue"
      :size="size"
      :placeholder="placeholder"
      :disabled="disabled"
      clearable
      class="w-full"
      @input="handleInput"
    >
      <template #leading>
        <Icon 
          name="heroicons:magnifying-glass" 
          class="h-5 w-5 text-neutral-400" 
        />
      </template>
    </FigInput>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { FigInput } from '@figgy/ui'
import { useDebounceFn } from '@vueuse/core'

interface Props {
  modelValue: string
  placeholder?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  debounce?: number
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'search', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search suppliers by name or ID...',
  size: 'lg',
  disabled: false,
  debounce: 300
})

const emit = defineEmits<Emits>()

const internalValue = ref(props.modelValue)

// Sync internal value with prop
watch(() => props.modelValue, (newValue) => {
  internalValue.value = newValue
})

// Debounced search handler
const debouncedSearch = useDebounceFn((value: string) => {
  emit('search', value)
}, props.debounce)

const handleInput = () => {
  emit('update:modelValue', internalValue.value)
  debouncedSearch(internalValue.value)
}
</script>