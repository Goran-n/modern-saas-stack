<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Search Header -->
    <SearchHeader 
      v-model:search="searchQuery"
      :results-count="filteredCount"
      :total-count="supplierCount"
      :show-results-count="!!suppliers"
      :disabled="!!isLoading"
      class="sticky top-0 z-10"
    />
    
    <!-- Main Content -->
    <FigContainer max-width="6xl" class="py-8">
      <!-- Loading State for Tenant -->
      <div v-if="!selectedTenantId && tenantStore.isLoading" class="text-center py-16">
        <FigSpinner size="lg" class="mx-auto mb-4" />
        <p class="text-neutral-600">Loading tenant information...</p>
      </div>

      <!-- No Tenant Selected -->
      <FigAlert 
        v-else-if="!selectedTenantId" 
        variant="subtle" 
        color="warning"
        class="max-w-2xl mx-auto"
      >
        <template #title>No tenant selected</template>
        Please select a tenant to view suppliers.
      </FigAlert>

      <!-- Loading State -->
      <div v-else-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FigSkeleton v-for="i in 6" :key="i" class="h-48 rounded-lg" />
      </div>

      <!-- Error State -->
      <FigAlert 
        v-else-if="error" 
        variant="solid" 
        color="error"
        class="max-w-2xl mx-auto"
      >
        <template #title>Error loading suppliers</template>
        {{ (error as any)?.message || 'An error occurred while loading suppliers' }}
      </FigAlert>

      <!-- Results Grid -->
      <SuppliersGrid 
        v-else-if="filteredSuppliers.length > 0"
        :suppliers="filteredSuppliers"
      />

      <!-- Empty State -->
      <FigEmptyState 
        v-else
        :type="searchQuery ? 'no-results' : 'empty'"
        :title="searchQuery ? 'No suppliers found' : 'No suppliers yet'"
        :description="searchQuery 
          ? 'Try adjusting your search terms' 
          : 'Suppliers will appear here once they are added to your account'"
        class="mt-16"
      />
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { FigContainer, FigAlert, FigSkeleton, FigSpinner, FigEmptyState } from '@figgy/ui'
import SearchHeader from '~/components/organisms/SearchHeader.vue'
import SuppliersGrid from '~/components/organisms/SuppliersGrid.vue'

const api = useApi()
const tenantStore = useTenantStore()

// Use computed to make it reactive
const selectedTenantId = computed(() => tenantStore.selectedTenantId)

// Fetch suppliers with tenant validation
const { data: suppliersData, isLoading, error } = useQuery({
  queryKey: ['suppliers', selectedTenantId],
  queryFn: async () => {
    if (!selectedTenantId.value) {
      throw new Error('No tenant selected')
    }
    // The API should validate tenantId server-side based on the authenticated user's context
    const response = await api.get<any>('/trpc/suppliers.list')
    return response.result.data.json
  },
  enabled: () => !!selectedTenantId.value,
})

// Convert to ref for composable
const suppliers = computed(() => suppliersData.value || [])

// Search functionality
const { searchQuery, filteredSuppliers, supplierCount, filteredCount } = useSupplierSearch(suppliers)
</script>