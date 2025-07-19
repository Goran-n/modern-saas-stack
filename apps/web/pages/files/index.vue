<template>
  <div class="h-screen bg-gray-50 grid grid-cols-[320px_1fr]">
    <!-- Sidebar -->
    <div class="border-r border-gray-200 bg-white overflow-y-auto">
      <FileManagerSidebar
        :file-data="fileData"
        :processing-files="processingFiles"
        :failed-files="failedFiles"
        :selected-year="selectedYear"
        :selected-supplier="selectedSupplier"
        :selected-status="selectedStatus"
        :loading="isLoading"
        @year-selected="handleYearSelected"
        @supplier-selected="handleSupplierSelected"
        @status-selected="handleStatusSelected"
      />
    </div>

    <!-- Main Content -->
    <div class="overflow-y-auto col-span-1">
      <div class="p-4 md:p-6 max-w-none w-full">
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-semibold text-gray-900">Files</h1>
              <UBreadcrumb 
                :links="breadcrumbLinks" 
                class="mt-1"
              />
            </div>
              
            <div class="flex items-center gap-3">
              <!-- View Toggle -->
              <UButtonGroup size="sm" orientation="horizontal">
                <UButton
                  :variant="viewMode === 'grid' ? 'solid' : 'ghost'"
                  icon="i-heroicons-squares-2x2"
                  @click="viewMode = 'grid'"
                />
                <UButton
                  :variant="viewMode === 'list' ? 'solid' : 'ghost'"
                  icon="i-heroicons-list-bullet"
                  @click="viewMode = 'list'"
                />
              </UButtonGroup>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-4">
          <USkeleton class="h-32 w-full" v-for="i in 6" :key="i" />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-12">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-4xl text-red-500 mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Files</h3>
          <p class="text-gray-500">{{ error.message }}</p>
        </div>

        <!-- Supplier Folders Display -->
        <div v-else-if="currentSuppliers.length > 0">
          <!-- File Count -->
          <div class="mb-4">
            <p class="text-sm text-gray-600">
              {{ currentSuppliers.length }} {{ currentSuppliers.length === 1 ? 'supplier' : 'suppliers' }}
              for {{ selectedYear }}
            </p>
          </div>

          <!-- Supplier Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <div
              v-for="supplier in currentSuppliers"
              :key="supplier.id"
              @click="handleSupplierSelected(supplier.name)"
              class="cursor-pointer hover:shadow-md transition-shadow duration-200 bg-white rounded-lg border border-gray-200 p-4"
            >
              <div class="aspect-square flex flex-col items-center justify-center">
                <!-- Folder Icon -->
                <div class="w-12 h-12 mb-3 flex items-center justify-center">
                  <UIcon 
                    name="i-heroicons-folder" 
                    class="text-3xl text-blue-500"
                  />
                </div>

                <!-- Supplier Name -->
                <h3 
                  class="text-sm font-medium text-gray-900 text-center line-clamp-2 hover:text-primary-600 transition-colors"
                  :title="supplier.name"
                >
                  {{ supplier.name }}
                </h3>

                <!-- File Count -->
                <div class="mt-2 text-center">
                  <p class="text-xs text-gray-500">
                    {{ supplier.fileCount }} {{ supplier.fileCount === 1 ? 'file' : 'files' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!currentFiles.length" class="text-center py-12">
          <UIcon name="i-heroicons-folder-open" class="text-4xl text-gray-400 mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">No Files Found</h3>
          <p class="text-gray-500">
            {{ currentView === 'status' 
              ? `No ${selectedStatus} files at the moment` 
              : 'Select a year and supplier to view files' 
            }}
          </p>
        </div>

        <!-- Files Display -->
        <div v-else>
          <!-- File Count -->
          <div class="mb-4">
            <p class="text-sm text-gray-600">
              {{ currentFiles.length }} {{ currentFiles.length === 1 ? 'file' : 'files' }}
              {{ currentView === 'supplier' ? `from ${selectedSupplier}` : '' }}
              {{ currentView === 'status' ? selectedStatus : '' }}
            </p>
          </div>

          <!-- File Grid -->
          <FileGrid 
            v-if="viewMode === 'grid'"
            :files="currentFiles"
            @file-selected="handleFileSelected"
          />

          <!-- File List -->
          <FileList 
            v-else
            :files="currentFiles"
            @file-selected="handleFileSelected"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- File Preview Modal (outside grid for proper overlay) -->
  <Teleport to="body">
    <FilePreview
      v-if="selectedFile"
      :file="selectedFile"
      @close="selectedFile = null"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'

// Composables
const api = useApi()
const tenantStore = useTenantStore()

// Reactive state
const selectedYear = ref<string | null>(null)
const selectedSupplier = ref<string | null>(null)
const selectedStatus = ref<'processing' | 'failed' | null>(null)
const currentView = ref<'default' | 'supplier' | 'status'>('default')
const viewMode = ref<'grid' | 'list'>('grid')
const selectedFile = ref<any>(null)

// Computed
const selectedTenantId = computed(() => tenantStore.selectedTenantId)

// Data fetching
const { data: fileData, isLoading, error } = useQuery({
  queryKey: ['files-manager', selectedTenantId],
  queryFn: async () => {
    const input = { json: {} }
    const response = await api.get<any>(`/trpc/files.getGroupedByYear?input=${encodeURIComponent(JSON.stringify(input))}`)
    return response.result.data.json
  },
  enabled: computed(() => !!selectedTenantId.value),
})

const { data: statusFiles } = useQuery({
  queryKey: ['files-status', selectedTenantId],
  queryFn: async () => {
    const input = { json: {} }
    const response = await api.get<any>(`/trpc/files.getProcessingStatus?input=${encodeURIComponent(JSON.stringify(input))}`)
    return response.result.data.json
  },
  enabled: computed(() => !!selectedTenantId.value),
})

// Computed data
const processingFiles = computed(() => statusFiles.value?.processing || [])
const failedFiles = computed(() => statusFiles.value?.failed || [])

const currentSuppliers = computed(() => {
  if (currentView.value === 'status' || !fileData.value || !selectedYear.value || selectedSupplier.value) return []

  const yearData = fileData.value.byYear[selectedYear.value]
  if (!yearData) return []

  return Object.values(yearData.suppliers).map((supplier: any) => ({
    id: supplier.name,
    name: supplier.name,
    fileCount: supplier.fileCount,
    type: 'supplier'
  }))
})

const currentFiles = computed(() => {
  if (currentView.value === 'status') {
    return selectedStatus.value === 'processing' ? processingFiles.value : failedFiles.value
  }

  if (!fileData.value || !selectedYear.value) return []

  const yearData = fileData.value.byYear[selectedYear.value]
  if (!yearData) return []

  if (selectedSupplier.value && yearData.suppliers[selectedSupplier.value]) {
    return yearData.suppliers[selectedSupplier.value].files || []
  }

  // If year is selected but no supplier, return empty (show suppliers instead)
  return []
})

const breadcrumbLinks = computed(() => {
  const links = [{ label: 'Files', to: '/files' }]
  
  if (currentView.value === 'status') {
    links.push({ 
      label: selectedStatus.value === 'processing' ? 'Processing' : 'Failed',
      to: '/files' 
    })
  } else if (selectedYear.value) {
    links.push({ label: selectedYear.value, to: '/files' })
    
    if (selectedSupplier.value) {
      links.push({ label: selectedSupplier.value, to: '/files' })
    }
  }
  
  return links
})

// Event handlers
const handleYearSelected = (year: string) => {
  selectedYear.value = year
  selectedSupplier.value = null
  selectedStatus.value = null
  currentView.value = 'default'
}

const handleSupplierSelected = (supplier: string) => {
  selectedSupplier.value = supplier
  selectedStatus.value = null
  currentView.value = 'supplier'
}

const handleStatusSelected = (status: 'processing' | 'failed') => {
  selectedStatus.value = status
  selectedYear.value = null
  selectedSupplier.value = null
  currentView.value = 'status'
}

const handleFileSelected = (file: any) => {
  selectedFile.value = file
}

// SEO
useSeoMeta({
  title: 'Files | Kibly',
  description: 'Manage and view your uploaded files organised by year and supplier',
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>