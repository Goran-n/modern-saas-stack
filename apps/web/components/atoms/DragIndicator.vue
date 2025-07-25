<template>
  <div 
    class="pointer-events-none"
    :class="containerClass"
    aria-hidden="true"
  >
    <svg 
      :width="svgSize" 
      :height="svgSize" 
      viewBox="0 0 20 20" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M7 4.5C7 5.32843 6.32843 6 5.5 6C4.67157 6 4 5.32843 4 4.5C4 3.67157 4.67157 3 5.5 3C6.32843 3 7 3.67157 7 4.5Z" 
        fill="currentColor"
      />
      <path 
        d="M7 10C7 10.8284 6.32843 11.5 5.5 11.5C4.67157 11.5 4 10.8284 4 10C4 9.17157 4.67157 8.5 5.5 8.5C6.32843 8.5 7 9.17157 7 10Z" 
        fill="currentColor"
      />
      <path 
        d="M7 15.5C7 16.3284 6.32843 17 5.5 17C4.67157 17 4 16.3284 4 15.5C4 14.6716 4.67157 14 5.5 14C6.32843 14 7 14.6716 7 15.5Z" 
        fill="currentColor"
      />
      <path 
        d="M14.5 4.5C14.5 5.32843 13.8284 6 13 6C12.1716 6 11.5 5.32843 11.5 4.5C11.5 3.67157 12.1716 3 13 3C13.8284 3 14.5 3.67157 14.5 4.5Z" 
        fill="currentColor"
      />
      <path 
        d="M14.5 10C14.5 10.8284 13.8284 11.5 13 11.5C12.1716 11.5 11.5 10.8284 11.5 10C11.5 9.17157 12.1716 8.5 13 8.5C13.8284 8.5 14.5 9.17157 14.5 10Z" 
        fill="currentColor"
      />
      <path 
        d="M14.5 15.5C14.5 16.3284 13.8284 17 13 17C12.1716 17 11.5 16.3284 11.5 15.5C11.5 14.6716 12.1716 14 13 14C13.8284 14 14.5 14.6716 14.5 15.5Z" 
        fill="currentColor"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'neutral' | 'current'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'current'
})

const svgSize = computed(() => {
  const sizes = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32
  }
  return sizes[props.size]
})

const containerClass = computed(() => {
  const colorClasses = {
    primary: 'text-primary-500',
    secondary: 'text-secondary-500',
    neutral: 'text-neutral-500',
    current: ''
  }
  return colorClasses[props.color]
})
</script>