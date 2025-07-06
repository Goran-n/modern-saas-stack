<template>
  <div>
    <div class="relative">
      <input
        :id="id"
        ref="inputRef"
        v-bind="$attrs"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :class="inputClasses"
        class="block w-full rounded-md border shadow-sm transition-colors focus:outline-none focus:ring-2"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      >
    </div>
    <p
      v-if="error || helperText"
      :class="helperClasses"
      class="mt-1.5 text-sm"
    >
      {{ error || helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue?: string | number
  type?: string
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  error?: string
  helperText?: string
  disabled?: boolean
  readonly?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md'
})

defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const inputRef = ref<HTMLInputElement>()

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-4 py-3 text-lg'
}

const inputClasses = computed(() => [
  sizeClasses[props.size],
  props.error
    ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500',
  props.disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed',
  props.readonly && 'bg-gray-50 cursor-default'
])

const helperClasses = computed(() =>
  props.error ? 'text-red-600' : 'text-gray-500'
)

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select()
})
</script>