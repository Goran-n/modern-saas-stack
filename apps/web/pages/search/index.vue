<template>
  <div class="min-h-screen bg-neutral-50">
    <FigContainer max-width="6xl" class="py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Search Results</h1>
        <p class="mt-2 text-gray-600">
          <span v-if="searchQuery">Results for "{{ searchQuery }}"</span>
          <span v-else>Enter a search query to find files and suppliers</span>
        </p>
      </div>

      <div>
      <!-- Search Bar -->
      <div class="mb-6">
        <FigInput
          v-model="searchQuery"
          size="xl"
          placeholder="Search files, suppliers, documents..."
          clearable
          class="w-full max-w-2xl"
        >
          <template #leading>
            <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-neutral-400" />
          </template>
        </FigInput>
      </div>

      <!-- Filters -->
      <div class="mb-6 flex gap-3">
        <FigSelect
          v-model="filters.type"
          placeholder="All types"
          :options="typeOptions"
          clearable
          size="sm"
        />
        <FigSelect
          v-model="filters.category"
          placeholder="All categories"
          :options="categoryOptions"
          clearable
          size="sm"
        />
      </div>

      <!-- Loading State -->
      <div v-if="isSearching" class="flex justify-center py-12">
        <div class="text-center">
          <Icon name="heroicons:arrow-path" class="h-8 w-8 animate-spin text-neutral-400 mx-auto mb-3" />
          <p class="text-neutral-500">Searching...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-red-800">Failed to search: {{ error.message }}</p>
      </div>

      <!-- No Results -->
      <div v-else-if="!hasResults && searchQuery && !isSearching" class="text-center py-12">
        <Icon name="heroicons:magnifying-glass" class="h-12 w-12 text-neutral-300 mx-auto mb-3" />
        <h3 class="text-lg font-medium text-neutral-900 mb-1">No results found</h3>
        <p class="text-neutral-500">Try adjusting your search query or filters</p>
      </div>

      <!-- Results -->
      <div v-else-if="hasResults" class="space-y-6">
        <!-- Files Section -->
        <section v-if="fileResults.length > 0">
          <h2 class="text-lg font-semibold text-neutral-900 mb-4">Files ({{ fileResults.length }})</h2>
          <div class="grid gap-3">
            <FigCard
              v-for="file in fileResults"
              :key="file.id"
              class="cursor-pointer hover:border-primary-300 transition-colors"
              @click="navigateToFile(file)"
            >
              <div class="flex items-start gap-4">
                <Icon name="heroicons:document" class="h-10 w-10 text-neutral-400 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-neutral-900 truncate">{{ file.metadata.fileName }}</h3>
                  <div class="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                    <span v-if="file.metadata.category" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                      {{ file.metadata.category }}
                    </span>
                    <span v-if="file.metadata.supplierName">{{ file.metadata.supplierName }}</span>
                    <span v-if="file.metadata.createdAt" class="text-xs">
                      {{ formatDate(file.metadata.createdAt) }}
                    </span>
                  </div>
                  <p v-if="file.metadata.extractedText" class="mt-2 text-sm text-neutral-600 line-clamp-2">
                    {{ file.metadata.extractedText }}
                  </p>
                </div>
                <div class="text-sm text-neutral-400">
                  {{ Math.round(file.score * 100) }}%
                </div>
              </div>
            </FigCard>
          </div>
        </section>

        <!-- Suppliers Section -->
        <section v-if="supplierResults.length > 0">
          <h2 class="text-lg font-semibold text-neutral-900 mb-4">Suppliers ({{ supplierResults.length }})</h2>
          <div class="grid gap-3">
            <FigCard
              v-for="supplier in supplierResults"
              :key="supplier.id"
              class="cursor-pointer hover:border-primary-300 transition-colors"
              @click="navigateToSupplier(supplier)"
            >
              <div class="flex items-start gap-4">
                <Icon name="heroicons:building-office" class="h-10 w-10 text-neutral-400 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-neutral-900">{{ supplier.metadata.displayName }}</h3>
                  <p class="text-sm text-neutral-500">{{ supplier.metadata.legalName }}</p>
                  <div class="mt-2 flex items-center gap-4 text-sm text-neutral-500">
                    <span v-if="supplier.metadata.companyNumber">
                      <span class="font-medium">Company:</span> {{ supplier.metadata.companyNumber }}
                    </span>
                    <span v-if="supplier.metadata.vatNumber">
                      <span class="font-medium">VAT:</span> {{ supplier.metadata.vatNumber }}
                    </span>
                  </div>
                </div>
                <div class="text-sm text-neutral-400">
                  {{ Math.round(supplier.score * 100) }}%
                </div>
              </div>
            </FigCard>
          </div>
        </section>
      </div>
      </div>
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FigContainer, FigInput, FigSelect, FigCard } from '@figgy/ui'
import { useSearch } from '~/composables/useSearch'
import { formatDate } from '~/utils/date'

const route = useRoute()
const router = useRouter()

// Initialize search with query from URL
const searchQuery = ref(route.query.q as string || '')

const { results, isSearching, hasResults, error, search, filters } = useSearch({
  limit: 50,
  debounce: 300,
})

// Filter options
const typeOptions = [
  { label: 'Files', value: 'file' },
  { label: 'Suppliers', value: 'supplier' },
  { label: 'Documents', value: 'document' },
]

const categoryOptions = [
  { label: 'Invoice', value: 'invoice' },
  { label: 'Receipt', value: 'receipt' },
  { label: 'Contract', value: 'contract' },
  { label: 'Purchase Order', value: 'purchase_order' },
  { label: 'Other', value: 'other' },
]

// Separate results by type
const fileResults = computed(() => 
  results.value.filter((r: any) => r.metadata.type === 'file')
)

const supplierResults = computed(() => 
  results.value.filter((r: any) => r.metadata.type === 'supplier')
)

// Watch for search query changes
watch(searchQuery, (value) => {
  search(value)
  // Update URL query parameter
  router.push({ query: { ...route.query, q: value } })
})

// Initial search if query exists
if (searchQuery.value) {
  search(searchQuery.value)
}

// Navigation handlers
const navigateToFile = (file: any) => {
  const fileId = file.id.split(':').pop()
  router.push(`/files/${fileId}`)
}

const navigateToSupplier = (supplier: any) => {
  const supplierId = supplier.id.split(':').pop()
  router.push(`/suppliers/${supplierId}`)
}
</script>
