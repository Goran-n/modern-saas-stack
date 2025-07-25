<template>
  <SelectRoot
    v-model="modelValue"
    :disabled="disabled"
    :multiple="multiple"
    :required="required"
  >
    <SelectTrigger
      :id="id"
      :class="triggerClasses"
      :aria-invalid="error"
    >
      <SelectValue :placeholder="placeholder" />
      <SelectIcon class="ml-auto">
        <svg
          class="h-4 w-4 opacity-50"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clip-rule="evenodd"
          />
        </svg>
      </SelectIcon>
    </SelectTrigger>
    
    <SelectPortal>
      <SelectContent
        :class="contentClasses"
        :position="position"
        :side-offset="4"
      >
        <SelectScrollUpButton
          class="flex items-center justify-center py-1"
        >
          <svg
            class="h-4 w-4 opacity-50"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832l-3.71 3.938a.75.75 0 01-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z"
              clip-rule="evenodd"
            />
          </svg>
        </SelectScrollUpButton>
        
        <SelectViewport class="p-1">
          <template v-if="options && options.length > 0">
            <template v-for="(option, index) in processedOptions" :key="`${option.value}-${index}`">
              <SelectLabel
                v-if="option.type === 'label'"
                :class="labelClasses"
              >
                {{ option.label }}
              </SelectLabel>
              
              <SelectItem
                v-else
                :value="option.value"
                :disabled="option.disabled"
                :class="itemClasses"
              >
                <SelectItemIndicator class="absolute left-2 flex items-center justify-center">
                  <svg
                    class="h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </SelectItemIndicator>
                <SelectItemText>{{ option.label }}</SelectItemText>
              </SelectItem>
            </template>
          </template>
          
          <slot v-else />
        </SelectViewport>
        
        <SelectScrollDownButton
          class="flex items-center justify-center py-1"
        >
          <svg
            class="h-4 w-4 opacity-50"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clip-rule="evenodd"
            />
          </svg>
        </SelectScrollDownButton>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectPortal,
  SelectRoot,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { cn } from '../../../utils/cn'
import { focusRing, disabledClasses, transitions } from '../../../utils/transitions'
import type { SelectProps } from './types'

const props = withDefaults(defineProps<SelectProps>(), {
  size: 'md',
  variant: 'outline',
  disabled: false,
  required: false,
  multiple: false,
  position: 'popper',
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

// v-model support
const modelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Process options to handle groups
const processedOptions = computed(() => {
  if (!props.options) return []
  
  const processed: any[] = []
  let currentGroup: string | undefined
  
  props.options.forEach((option) => {
    if (option.group && option.group !== currentGroup) {
      currentGroup = option.group
      processed.push({ type: 'label', label: option.group })
    }
    processed.push({ ...option, type: 'item' })
  })
  
  return processed
})

// Trigger classes
const triggerClasses = computed(() => {
  const baseClasses = [
    'flex items-center justify-between w-full',
    'text-left cursor-default',
    transitions.base,
    focusRing,
    disabledClasses,
    'data-[placeholder]:text-neutral-400',
  ]
  
  const sizeClasses = {
    xs: 'h-7 px-2.5 text-xs rounded-md gap-1',
    sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
    md: 'h-10 px-4 text-sm rounded-lg gap-2',
    lg: 'h-11 px-5 text-base rounded-lg gap-2',
    xl: 'h-12 px-6 text-base rounded-lg gap-2',
  }
  
  const variantClasses = {
    outline: [
      'border',
      props.error
        ? 'border-error-500 text-error-900'
        : 'border-neutral-300 text-neutral-900',
      'bg-white',
    ],
    filled: [
      'border border-transparent',
      props.error
        ? 'bg-error-50 text-error-900'
        : 'bg-neutral-100 text-neutral-900',
    ],
  }
  
  return cn(
    baseClasses,
    sizeClasses[props.size],
    variantClasses[props.variant],
    props.class
  )
})

// Content classes
const contentClasses = computed(() => {
  return cn(
    'relative z-50 min-w-[8rem] overflow-hidden',
    'rounded-lg border border-neutral-200 bg-white',
    'shadow-lg',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
    'data-[side=bottom]:slide-in-from-top-2',
    'data-[side=left]:slide-in-from-right-2',
    'data-[side=right]:slide-in-from-left-2',
    'data-[side=top]:slide-in-from-bottom-2',
  )
})

// Item classes
const itemClasses = computed(() => {
  return cn(
    'relative flex w-full cursor-default select-none items-center',
    'rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
    transitions.colors,
    'focus:bg-neutral-100 focus:text-neutral-900',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  )
})

// Label classes
const labelClasses = computed(() => {
  return 'py-1.5 pl-8 pr-2 text-xs font-semibold text-neutral-500'
})
</script>