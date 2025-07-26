<template>
  <div class="min-h-screen bg-canvas">
    <FigContainer max-width="6xl" class="py-8">
      <!-- Back Navigation -->
      <RouterLink 
        to="/suppliers" 
        class="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6 transition-colors"
      >
        <FigIcon name="i-heroicons-arrow-left" class="h-5 w-5" />
        Back to suppliers
      </RouterLink>

      <!-- Supplier Header Card -->
      <FigCard class="mb-8">
        <div v-if="supplier" class="flex items-start gap-6">
          <SupplierLogo 
            :name="supplier.displayName || supplier.legalName"
            :logo-url="supplier.logoUrl"
            size="xl"
          />
          
          <div class="flex-1">
            <div class="flex items-start justify-between">
              <div>
                <h1 class="text-2xl font-semibold text-neutral-900">
                  {{ supplier.displayName || supplier.legalName }}
                </h1>
                <p class="text-neutral-600 mt-1">
                  {{ supplier.companyNumber || 'No company number' }}
                </p>
              </div>
              
              <FigStatusBadge
                :status="supplier.status"
                type="connection"
                variant="soft"
                size="md"
              />
            </div>
            
            <!-- Contact Information -->
            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-if="supplier.email" class="flex items-center gap-2 text-sm text-neutral-600">
                <FigIcon name="i-heroicons-envelope" class="h-4 w-4" />
                <a 
                  :href="`mailto:${supplier.email}`" 
                  class="hover:text-primary-600 transition-colors"
                >
                  {{ supplier.email }}
                </a>
              </div>
              <div v-if="supplier.phone" class="flex items-center gap-2 text-sm text-neutral-600">
                <FigIcon name="i-heroicons-phone" class="h-4 w-4" />
                <a 
                  :href="`tel:${supplier.phone}`" 
                  class="hover:text-primary-600 transition-colors"
                >
                  {{ supplier.phone }}
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Loading State for Supplier -->
        <div v-else class="animate-pulse">
          <div class="flex items-start gap-6">
            <FigSkeleton class="h-20 w-20 rounded-lg" />
            <div class="flex-1 space-y-3">
              <FigSkeleton class="h-8 w-64" />
              <FigSkeleton class="h-5 w-40" />
            </div>
          </div>
        </div>
      </FigCard>

      <!-- Files Section -->
      <FigCard>
        <template #header>
          <h2 class="text-lg font-semibold">Files</h2>
        </template>

        <!-- Loading State -->
        <div v-if="filesLoading" class="space-y-3">
          <FigSkeleton v-for="i in 3" :key="i" class="h-16 w-full rounded-lg" />
        </div>

        <!-- Error State -->
        <FigAlert 
          v-else-if="filesError" 
          variant="solid" 
          color="error"
        >
          <template #title>Error loading files</template>
          {{ (filesError as any)?.message || 'An error occurred while loading files' }}
        </FigAlert>

        <!-- Files List -->
        <div v-else-if="files?.value && files.value.length > 0" class="space-y-2">
          <div 
            v-for="file in files" 
            :key="file.id"
            class="group flex items-center justify-between p-4 rounded-lg border border-neutral-200 
                   hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-all"
            @click="() => navigateTo(`/files/${file.id}`)"
          >
            <div class="flex items-center gap-3">
              <FileIcon 
                :file-name="file.fileName" 
                size="md"
              />
              <div>
                <p class="font-medium text-neutral-900">{{ file.fileName }}</p>
                <p class="text-sm text-neutral-600">
                  <FileSize :bytes="file.size || 0" size="sm" />
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <FileDate 
                :date="file.createdAt" 
                size="sm" 
                class="text-neutral-500"
              />
              <FigIcon 
                name="i-heroicons-chevron-right" 
                class="h-5 w-5 text-neutral-400 group-hover:text-primary-600 transition-colors" 
              />
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <FigEmptyState 
          v-else
          type="no-files"
          title="No files found"
          description="Files uploaded for this supplier will appear here"
        />
      </FigCard>
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { FigContainer, FigCard, FigAlert, FigSkeleton, FigIcon, FigStatusBadge, FigEmptyState } from '@figgy/ui'
import SupplierLogo from '~/components/atoms/SupplierLogo.vue'
import FileIcon from '~/components/atoms/FileIcon.vue'
import FileSize from '~/components/atoms/FileSize.vue'
import FileDate from '~/components/atoms/FileDate.vue'

const route = useRoute()
const api = useApi()
const tenantStore = useTenantStore()

const supplierId = route.params.id as string
const selectedTenantId = computed(() => tenantStore.selectedTenantId)

// Fetch all suppliers to find the current one
const { data: suppliers } = useQuery({
  queryKey: ['suppliers', selectedTenantId],
  queryFn: async () => {
    const response = await api.get<any>('/trpc/suppliers.list')
    return response.result.data.json
  },
  enabled: () => !!selectedTenantId.value,
})

// Find the current supplier
const supplier = computed(() => 
  suppliers.value?.find((s: any) => s.id === supplierId)
)

// Fetch files for this supplier
const { data: files, isLoading: filesLoading, error: filesError } = useQuery({
  queryKey: ['supplier-files', supplierId, selectedTenantId],
  queryFn: async () => {
    const input = { json: { supplierId } }
    const response = await api.get<any>(`/trpc/suppliers.getFiles?input=${encodeURIComponent(JSON.stringify(input))}`)
    return response.result.data.json
  },
  enabled: () => !!supplierId && !!selectedTenantId.value,
})
</script>