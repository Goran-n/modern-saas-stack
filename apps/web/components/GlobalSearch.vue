<template>
  <div class="relative w-full max-w-2xl">
    <!-- Search Input -->
    <FigInput
      v-model="searchQuery"
      size="lg"
      placeholder="Search files, suppliers, documents..."
      clearable
      class="w-full"
      @focus="isOpen = true"
      @blur="handleBlur"
    >
      <template #leading>
        <Icon 
          name="heroicons:magnifying-glass" 
          class="h-5 w-5 text-neutral-400" 
        />
      </template>
      <template #trailing>
        <div v-if="isSearching" class="flex items-center">
          <Icon name="heroicons:arrow-path" class="h-4 w-4 animate-spin text-neutral-400" />
        </div>
      </template>
    </FigInput>

    <!-- Search Results Dropdown -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen && (hasResults || isSearching || searchQuery)"
        class="absolute z-50 mt-1 w-full rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5"
      >
        <!-- Loading State -->
        <div v-if="isSearching && !hasResults" class="px-4 py-8 text-center">
          <Icon name="heroicons:arrow-path" class="h-6 w-6 animate-spin text-neutral-400 mx-auto mb-2" />
          <p class="text-sm text-neutral-500">Searching...</p>
        </div>

        <!-- No Results -->
        <div v-else-if="!hasResults && searchQuery && !isSearching" class="px-4 py-8 text-center">
          <Icon name="heroicons:magnifying-glass" class="h-6 w-6 text-neutral-400 mx-auto mb-2" />
          <p class="text-sm text-neutral-500">No results found for "{{ searchQuery }}"</p>
        </div>

        <!-- Results List -->
        <div v-else-if="hasResults" class="max-h-96 overflow-y-auto">
          <div class="p-2">
            <!-- Files Section -->
            <div v-if="fileResults.length > 0" class="mb-2">
              <h3 class="px-3 py-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Files</h3>
              <button
                v-for="file in fileResults"
                :key="file.id"
                @click="handleFileClick(file)"
                class="w-full text-left px-3 py-2 hover:bg-neutral-50 rounded-md transition-colors flex items-center gap-3"
              >
                <Icon name="heroicons:document" class="h-5 w-5 text-neutral-400 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-neutral-900 truncate">{{ file.metadata.fileName }}</p>
                  <p class="text-xs text-neutral-500">
                    <span v-if="file.metadata.category">{{ file.metadata.category }}</span>
                    <span v-if="file.metadata.category && file.metadata.supplierName"> · </span>
                    <span v-if="file.metadata.supplierName">{{ file.metadata.supplierName }}</span>
                  </p>
                </div>
                <span class="text-xs text-neutral-400">{{ Math.round(file.score * 100) }}%</span>
              </button>
            </div>

            <!-- Suppliers Section -->
            <div v-if="supplierResults.length > 0" class="mb-2">
              <h3 class="px-3 py-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Suppliers</h3>
              <button
                v-for="supplier in supplierResults"
                :key="supplier.id"
                @click="handleSupplierClick(supplier)"
                class="w-full text-left px-3 py-2 hover:bg-neutral-50 rounded-md transition-colors flex items-center gap-3"
              >
                <Icon name="heroicons:building-office" class="h-5 w-5 text-neutral-400 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-neutral-900 truncate">{{ supplier.metadata.displayName }}</p>
                  <p class="text-xs text-neutral-500">
                    <span v-if="supplier.metadata.companyNumber">{{ supplier.metadata.companyNumber }}</span>
                    <span v-if="supplier.metadata.companyNumber && supplier.metadata.vatNumber"> · </span>
                    <span v-if="supplier.metadata.vatNumber">{{ supplier.metadata.vatNumber }}</span>
                  </p>
                </div>
                <span class="text-xs text-neutral-400">{{ Math.round(supplier.score * 100) }}%</span>
              </button>
            </div>
          </div>
        </div>

        <!-- View All Results -->
        <div v-if="hasResults" class="border-t border-neutral-200 px-4 py-2">
          <button
            @click="viewAllResults"
            class="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all results →
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FigInput } from '@figgy/ui'
import { useSearch } from '~/composables/useSearch'

const router = useRouter()

const searchQuery = ref('')
const isOpen = ref(false)

const { results, isSearching, hasResults, search } = useSearch({
  limit: 10,
  debounce: 300,
})

// Filter results by type
const fileResults = computed(() => 
  results.value.filter((r: any) => r.metadata.type === 'file').slice(0, 5)
)

const supplierResults = computed(() => 
  results.value.filter((r: any) => r.metadata.type === 'supplier').slice(0, 5)
)

// Handle search input
watch(searchQuery, (value) => {
  if (value.trim()) {
    search(value)
  }
})

// Handle blur with delay to allow clicks
const handleBlur = () => {
  setTimeout(() => {
    isOpen.value = false
  }, 200)
}

// Handle result clicks
const handleFileClick = (file: any) => {
  // Extract actual file ID from the compound ID (tenantId:file:fileId)
  const fileId = file.id.split(':').pop()
  router.push(`/files/${fileId}`)
  isOpen.value = false
  searchQuery.value = ''
}

const handleSupplierClick = (supplier: any) => {
  // Extract actual supplier ID from the compound ID
  const supplierId = supplier.id.split(':').pop()
  router.push(`/suppliers/${supplierId}`)
  isOpen.value = false
  searchQuery.value = ''
}

const viewAllResults = () => {
  router.push({
    path: '/search',
    query: { q: searchQuery.value }
  })
  isOpen.value = false
}
</script>
