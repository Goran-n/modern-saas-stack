<template>
  <header class="bg-white border-b border-neutral-200">
    <FigContainer max-width="6xl" class="py-6">
      <div class="space-y-4">
        <!-- Title and Results Count -->
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-semibold text-neutral-900">Suppliers</h1>
          <ResultsCount 
            v-if="showResultsCount && resultsCount !== undefined && totalCount !== undefined"
            :results-count="resultsCount"
            :total-count="totalCount"
          />
        </div>
        
        <!-- Search Bar -->
        <SearchBar
          :model-value="search"
          @update:model-value="$emit('update:search', $event)"
          @search="$emit('search', $event)"
          placeholder="Search suppliers by name, ID, or company number..."
          :disabled="disabled"
        />
        
        <!-- Filters (future enhancement) -->
        <div v-if="$slots.filters" class="flex items-center gap-4">
          <slot name="filters" />
        </div>
      </div>
    </FigContainer>
  </header>
</template>

<script setup lang="ts">
import { FigContainer } from '@figgy/ui'
import SearchBar from '../molecules/SearchBar.vue'
import ResultsCount from '../atoms/ResultsCount.vue'

interface Props {
  search: string
  resultsCount?: number
  totalCount?: number
  showResultsCount?: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'update:search', value: string): void
  (e: 'search', value: string): void
}

withDefaults(defineProps<Props>(), {
  showResultsCount: true,
  disabled: false
})

defineEmits<Emits>()
</script>