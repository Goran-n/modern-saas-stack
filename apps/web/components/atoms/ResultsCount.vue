<template>
  <p :class="countClasses">
    <span v-if="isFiltered">
      Showing <span class="font-semibold text-neutral-900">{{ resultsCount }}</span> 
      of <span class="font-semibold text-neutral-900">{{ totalCount }}</span> 
      {{ pluralize('supplier', totalCount) }}
    </span>
    <span v-else>
      <span class="font-semibold text-neutral-900">{{ totalCount }}</span> 
      {{ pluralize('supplier', totalCount) }}
    </span>
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@figgy/ui'

interface Props {
  resultsCount: number
  totalCount: number
  class?: string
}

const props = defineProps<Props>()

const isFiltered = computed(() => props.resultsCount !== props.totalCount)

const countClasses = computed(() => 
  cn(
    'text-sm text-neutral-600',
    props.class
  )
)

const pluralize = (word: string, count: number) => {
  return count === 1 ? word : `${word}s`
}
</script>