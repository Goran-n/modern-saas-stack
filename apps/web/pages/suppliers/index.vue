<template>
  <UContainer class="py-6">
    <UCard>
      <template #header>
        <h1 class="text-2xl font-semibold">Suppliers</h1>
      </template>

      <div v-if="!selectedTenantId && tenantStore.isLoading" class="text-gray-500 text-center py-8">
        Loading tenant information...
      </div>

      <div v-else-if="!selectedTenantId" class="text-amber-500 text-center py-8">
        No tenant selected. Please select a tenant to view suppliers.
      </div>

      <div v-else-if="isLoading" class="space-y-4">
        <USkeleton class="h-12 w-full" v-for="i in 5" :key="i" />
      </div>

      <div v-else-if="error" class="text-red-500">
        Error loading suppliers: {{ error.message }}
      </div>

      <div v-else-if="suppliers?.length === 0" class="text-gray-500 text-center py-8">
        No suppliers found
      </div>

      <div v-else class="space-y-2">
        <NuxtLink
          v-for="supplier in suppliers"
          :key="supplier.id"
          :to="`/suppliers/${supplier.id}`"
          class="block"
        >
          <UCard class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium">{{ supplier.displayName || supplier.legalName }}</h3>
                <p class="text-sm text-gray-500">{{ supplier.companyNumber || 'No company number' }}</p>
              </div>
              <UBadge :color="supplier.status === 'active' ? 'success' : 'neutral'">
                {{ supplier.status }}
              </UBadge>
            </div>
          </UCard>
        </NuxtLink>
      </div>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';

const api = useApi();

const tenantStore = useTenantStore();

// Use computed to make it reactive
const selectedTenantId = computed(() => tenantStore.selectedTenantId);

// Wait for tenant to be selected before fetching suppliers
const { data: suppliers, isLoading, error } = useQuery({
  queryKey: ['suppliers', selectedTenantId],
  queryFn: async () => {
    console.log('Fetching suppliers for tenant:', selectedTenantId.value);
    const response = await api.get<any>('/trpc/suppliers.list');
    console.log('Suppliers response:', response);
    return response.result.data.json;
  },
  enabled: computed(() => !!selectedTenantId.value), // Only fetch when tenant is selected
});
</script>