<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>
    
    <DropdownMenuPortal>
      <DropdownMenuContent
        :align="align"
        :side="side"
        :side-offset="sideOffset"
        :class="contentClasses"
      >
        <slot name="header" />
        
        <template v-for="(item, index) in items" :key="item.id || index">
          <DropdownMenuSeparator 
            v-if="item.divider" 
            class="my-1 h-px bg-neutral-200"
          />
          
          <DropdownMenuItem
            v-else
            :disabled="item.disabled || false"
            @select="() => handleSelect(item)"
            :class="itemClasses(item)"
          >
            <FigIcon
              v-if="item.icon"
              :name="item.icon"
              size="sm"
              class="mr-2"
            />
            <span class="flex-1">{{ item.label }}</span>
            <span 
              v-if="item.shortcuts?.length" 
              class="ml-auto text-xs text-neutral-400"
            >
              {{ item.shortcuts.join(' ') }}
            </span>
          </DropdownMenuItem>
        </template>
        
        <slot name="footer" />
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { cn } from '../../../utils/cn'
import { transitions } from '../../../utils/transitions'
import FigIcon from '../../atoms/Icon/Icon.vue'
import type { DropdownProps, DropdownMenuItem as DropdownMenuItemType } from './types'

/**
 * FigDropdown Component
 * 
 * A reusable dropdown menu component built on top of reka-ui's DropdownMenu.
 * Provides consistent styling and behavior across the application.
 * 
 * @example
 * ```vue
 * <FigDropdown :items="menuItems">
 *   <template #trigger>
 *     <FigButton>Open Menu</FigButton>
 *   </template>
 * </FigDropdown>
 * ```
 */

const props = withDefaults(defineProps<DropdownProps>(), {
  align: 'end',
  side: 'bottom',
  sideOffset: 4,
})

// Remove unused emit for now
// const emit = defineEmits<{
//   'update:modelValue': [value: boolean]
// }>()

// Content classes - using your existing animations
const contentClasses = computed(() => {
  return cn(
    'z-50 min-w-[8rem] overflow-hidden rounded-md bg-white p-1',
    'border border-neutral-200 shadow-lg',
    'animate-scale-in', // Using your existing animation
    props.contentClass
  )
})

// Item classes
const itemClasses = (item: DropdownMenuItemType) => {
  const baseClasses = [
    'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5',
    'text-sm outline-none',
    transitions.colors,
    'focus:bg-neutral-100 focus:text-neutral-900',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  ]
  
  // Check if item has variant property (not a divider)
  const variantClasses = 'variant' in item && item.variant === 'destructive' 
    ? 'text-error-600 focus:bg-error-50 focus:text-error-700'
    : 'text-neutral-700'
  
  return cn(baseClasses, variantClasses)
}

// Handle item selection
const handleSelect = (item: DropdownMenuItemType) => {
  if ('onClick' in item && !item.disabled && item.onClick) {
    item.onClick()
  }
}
</script>