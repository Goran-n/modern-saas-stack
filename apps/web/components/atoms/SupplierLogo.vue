<template>
  <div 
    :class="logoClasses"
    :style="logoUrl && !imageError ? `background-image: url(${logoUrl})` : undefined"
  >
    <img 
      v-if="logoUrl && !imageError"
      :src="logoUrl"
      :alt="`${name} logo`"
      class="invisible"
      @error="handleImageError"
    />
    <span v-else class="font-semibold uppercase">
      {{ initials }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { cn } from '@figgy/ui'

interface Props {
  name: string
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const imageError = ref(false)

const initials = computed(() => {
  const words = props.name.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase()
})

const logoClasses = computed(() => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-base',
    xl: 'h-20 w-20 text-lg'
  }
  
  const baseClasses = [
    'rounded-lg',
    'flex items-center justify-center',
    'bg-primary-100 text-primary-700',
    'overflow-hidden',
    'bg-cover bg-center bg-no-repeat'
  ]
  
  return cn(
    baseClasses,
    sizeClasses[props.size],
    props.class
  )
})

const handleImageError = () => {
  imageError.value = true
}
</script>