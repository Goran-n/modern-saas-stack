<template>
  <UContainer class="py-6">
    <div class="mb-6">
      <NuxtLink to="/suppliers" class="text-sky-600 hover:text-sky-700 flex items-center gap-2">
        <UIcon name="i-heroicons-arrow-left" />
        Back to suppliers
      </NuxtLink>
    </div>

    <UCard>
      <template #header>
        <div v-if="supplier">
          <h1 class="text-2xl font-semibold">{{ supplier.displayName || supplier.legalName }}</h1>
          <p class="text-sm text-gray-500">{{ supplier.companyNumber || 'No company number' }}</p>
        </div>
        <USkeleton v-else class="h-8 w-64" />
      </template>

      <div v-if="filesLoading" class="space-y-4">
        <h2 class="text-lg font-medium mb-4">Files</h2>
        <USkeleton class="h-12 w-full" v-for="i in 3" :key="i" />
      </div>

      <div v-else-if="filesError" class="text-red-500">
        Error loading files: {{ filesError.message }}
      </div>

      <div v-else>
        <h2 class="text-lg font-medium mb-4">Files</h2>
        
        <div v-if="files?.length === 0" class="text-gray-500 text-center py-8">
          No files found for this supplier
        </div>

        <div v-else class="space-y-2">
          <UCard 
            v-for="file in files" 
            :key="file.id"
            class="hover:bg-gray-50 cursor-pointer"
            @click="$router.push(`/files/${file.id}`)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UIcon 
                  :name="getFileIcon(file.fileName)" 
                  class="text-xl text-gray-500"
                />
                <div>
                  <p class="font-medium">{{ file.fileName }}</p>
                  <p class="text-sm text-gray-500">{{ formatFileSize(file.size || 0) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500">
                  {{ formatDate(file.createdAt) }}
                </span>
                <UIcon name="i-heroicons-chevron-right" class="text-gray-400" />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';

const route = useRoute();
const api = useApi();
const tenantStore = useTenantStore();

const supplierId = route.params.id as string;
const selectedTenantId = computed(() => tenantStore.selectedTenantId);

const { data: suppliers } = useQuery({
  queryKey: ['suppliers', selectedTenantId],
  queryFn: async () => {
    const response = await api.get<any>('/trpc/suppliers.list');
    return response.result.data.json;
  },
  enabled: computed(() => !!selectedTenantId.value),
});

const supplier = computed(() => 
  suppliers.value?.find((s: any) => s.id === supplierId)
);

const { data: files, isLoading: filesLoading, error: filesError } = useQuery({
  queryKey: ['supplier-files', supplierId, selectedTenantId],
  queryFn: async () => {
    // For tRPC GET requests with input, we need to pass the input as a query parameter
    const input = { json: { supplierId } };
    const response = await api.get<any>(`/trpc/suppliers.getFiles?input=${encodeURIComponent(JSON.stringify(input))}`);
    return response.result.data.json;
  },
  enabled: computed(() => !!supplierId && !!selectedTenantId.value),
});

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext || '')) return 'i-heroicons-document-text';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'i-heroicons-photo';
  if (['xls', 'xlsx'].includes(ext || '')) return 'i-heroicons-table-cells';
  if (['doc', 'docx'].includes(ext || '')) return 'i-heroicons-document';
  return 'i-heroicons-document';
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
  return Math.round(bytes / 1048576 * 10) / 10 + ' MB';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};
</script>