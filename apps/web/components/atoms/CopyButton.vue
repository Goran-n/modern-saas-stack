<template>
  <button
    :class="buttonClasses"
    :title="copied ? 'Copied!' : 'Copy to clipboard'"
    @click="handleCopy"
  >
    <Transition mode="out-in" name="fade">
      <FigIcon 
        v-if="!copied" 
        name="i-heroicons-clipboard-document" 
        class="h-4 w-4"
      />
      <FigIcon 
        v-else 
        name="i-heroicons-check" 
        class="h-4 w-4 text-success-600"
      />
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FigIcon, cn } from '@figgy/ui'

interface Props {
  text: string
  class?: string
}

const props = defineProps<Props>()

const copied = ref(false)

const buttonClasses = computed(() => 
  cn(
    'inline-flex items-center justify-center p-1 rounded transition-colors',
    'hover:bg-neutral-100 active:bg-neutral-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
    props.class
  )
)

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    
    // Reset after 2 seconds
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>