<template>
  <div class="h-screen bg-canvas grid grid-cols-[320px_1fr]">
    <!-- Sidebar -->
    <div class="border-r border-neutral-200 bg-white overflow-y-auto">
      <FileManagerSidebar
        v-if="fileDataUnwrapped"
        :file-data="fileDataUnwrapped"
        :processing-files="processingFiles"
        :failed-files="failedFiles"
        :selected-year="selectedYear"
        :selected-supplier="selectedSupplier"
        :selected-status="selectedStatus"
        :loading="!!isLoading"
        @year-selected="handleYearSelected"
        @supplier-selected="handleSupplierSelected"
        @status-selected="handleStatusSelected"
      />
      <FileManagerSidebar
        v-else
        :processing-files="processingFiles"
        :failed-files="failedFiles"
        :selected-year="selectedYear"
        :selected-supplier="selectedSupplier"
        :selected-status="selectedStatus"
        :loading="!!isLoading"
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
              <h1 class="text-2xl font-semibold">Files</h1>
              <nav class="mt-1 flex" aria-label="Breadcrumb">
                <ol class="flex items-center space-x-2">
                  <li v-for="(link, index) in breadcrumbLinks" :key="index">
                    <div class="flex items-center">
                      <a :href="link.to" class="text-sm font-medium text-neutral-500 hover:text-neutral-700">
                        {{ link.label }}
                      </a>
                      <FigIcon 
                        v-if="index < breadcrumbLinks.length - 1"
                        name="i-heroicons-chevron-right" 
                        class="ml-2 h-4 w-4 text-neutral-400" 
                      />
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
              
            <div class="flex items-center gap-3">
              <!-- View Toggle -->
              <div class="flex rounded-md shadow-sm" role="group">
                <FigButton
                  :variant="viewMode === 'grid' ? 'solid' : 'outline'"
                  icon="i-heroicons-squares-2x2"
                  size="sm"
                  class="rounded-r-none"
                  @click="viewMode = 'grid'"
                />
                <FigButton
                  :variant="viewMode === 'list' ? 'solid' : 'outline'"
                  icon="i-heroicons-list-bullet"
                  size="sm"
                  class="rounded-l-none -ml-px"
                  @click="viewMode = 'list'"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-4">
          <FigSkeleton class="h-32 w-full" v-for="i in 6" :key="i" />
        </div>

        <!-- Error State -->
        <molecules-file-empty-state
          v-else-if="error"
          type="error"
          :description="error.value?.message || 'There was an error loading your files'"
        />

        <!-- Supplier Folders Display -->
        <div v-else-if="currentSuppliers.length > 0">
          <!-- File Count -->
          <div class="mb-4">
            <p class="text-sm text-muted">
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
              class="cursor-pointer hover:shadow-md transition-all duration-200 bg-white rounded-lg border border-neutral-200 hover:border-primary-300 p-4"
            >
              <div class="aspect-square flex flex-col items-center justify-center">
                <!-- Supplier Logo -->
                <div class="w-12 h-12 mb-3 flex items-center justify-center">
                  <SupplierLogo
                    :name="supplier.name"
                    :logo-url="supplier.logoUrl"
                    size="lg"
                    class="w-12 h-12"
                  />
                </div>

                <!-- Supplier Name -->
                <h3 
                  class="text-sm font-medium text-center line-clamp-2 hover:text-primary transition-colors"
                  :title="supplier.name"
                >
                  {{ supplier.name }}
                </h3>

                <!-- File Count -->
                <div class="mt-2 text-center">
                  <p class="text-xs text-muted">
                    {{ supplier.fileCount }} {{ supplier.fileCount === 1 ? 'file' : 'files' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <molecules-file-empty-state
          v-else-if="!currentFiles.length"
          type="empty"
          :description="currentView === 'status' 
            ? `No ${selectedStatus} files at the moment` 
            : 'Select a year and supplier to view files'"
        />

        <!-- Files Display -->
        <div v-else>
          <!-- File Count -->
          <div class="mb-4">
            <p class="text-sm text-muted">
              {{ currentFiles.length }} {{ currentFiles.length === 1 ? 'file' : 'files' }}
              {{ currentView === 'supplier' ? `from ${selectedSupplier}` : '' }}
              {{ currentView === 'status' ? selectedStatus : '' }}
            </p>
          </div>

          <!-- File Grid -->
          <organisms-file-grid 
            v-if="viewMode === 'grid'"
            :files="currentFiles"
            @file-selected="handleFileSelected"
          />

          <!-- File List -->
          <organisms-file-list 
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
    <organisms-file-preview
      v-if="selectedFile"
      :file="selectedFile"
      @close="selectedFile = null"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import type { File, FileItem } from '@figgy/types';
import { FigButton, FigIcon, FigSkeleton } from '@figgy/ui';
import SupplierLogo from '~/components/atoms/SupplierLogo.vue';

// Local interfaces
interface SupplierWithLogo {
  name: string;
  supplierId: string | null;
  logoUrl: string | null;
  fileCount: number;
  files?: any[];
}

interface FileDataSerializedWithLogo {
  byYear: Record<string, {
    year: string;
    totalFiles: number;
    suppliers: Record<string, SupplierWithLogo>;
  }>;
  totalFiles: number;
}

// Composables
const api = useApi()
const tenantStore = useTenantStore()

// Reactive state
const selectedYear = ref<string | null>(null)
const selectedSupplier = ref<string | null>(null)
const selectedStatus = ref<'processing' | 'failed' | null>(null)
const currentView = ref<'default' | 'supplier' | 'status'>('default')
const viewMode = ref<'grid' | 'list'>('grid')
const selectedFile = ref<FileItem | null>(null)

// Computed
const selectedTenantId = computed(() => tenantStore.selectedTenantId)
const fileDataUnwrapped = computed(() => fileData.value)

// Data fetching
const { data: fileData, isLoading, error } = useQuery<FileDataSerializedWithLogo>({
  queryKey: ['files-manager', selectedTenantId],
  queryFn: async () => {
    const input = { json: {} }
    const response = await api.get<{ result: { data: { json: any } } }>(`/trpc/files.getGroupedByYear?input=${encodeURIComponent(JSON.stringify(input))}`)
    const data = response.result.data.json
    
    // Transform the data to ensure suppliers have names
    const transformed: FileDataSerializedWithLogo = {
      byYear: {},
      totalFiles: data.totalFiles
    }
    
    for (const [year, yearData] of Object.entries(data.byYear as Record<string, any>)) {
      transformed.byYear[year] = {
        year: yearData.year,
        totalFiles: yearData.totalFiles,
        suppliers: {}
      }
      
      for (const [supplierName, supplierData] of Object.entries(yearData.suppliers as Record<string, any>)) {
        transformed.byYear[year].suppliers[supplierName] = {
          name: supplierName,
          supplierId: supplierData.supplierId,
          logoUrl: supplierData.logoUrl,
          fileCount: supplierData.fileCount,
          files: supplierData.files?.map((f: any) => ({
            ...f,
            createdAt: typeof f.createdAt === 'string' ? f.createdAt : new Date(f.createdAt).toISOString(),
            processingStatus: f.status || f.processingStatus
          })) || []
        }
      }
    }
    
    return transformed
  },
  enabled: () => !!selectedTenantId.value,
})

const { data: statusFiles } = useQuery({
  queryKey: ['files-status', selectedTenantId],
  queryFn: async () => {
    const input = { json: {} }
    const response = await api.get<{ result: { data: { json: { processing: File[], failed: File[] } } } }>(`/trpc/files.getProcessingStatus?input=${encodeURIComponent(JSON.stringify(input))}`)
    return response.result.data.json
  },
  enabled: () => !!selectedTenantId.value,
})

// Helper function to convert File to FileItem
const fileToFileItem = (file: File): FileItem => ({
  ...file,
  createdAt: typeof file.createdAt === 'string' ? file.createdAt : file.createdAt.toISOString(),
  processingStatus: file.status,
});

// Computed data
const processingFiles = computed(() => (statusFiles.value?.processing || []).map(fileToFileItem))
const failedFiles = computed(() => (statusFiles.value?.failed || []).map(fileToFileItem))

const currentSuppliers = computed(() => {
  if (currentView.value === 'status' || !fileDataUnwrapped.value || !selectedYear.value || selectedSupplier.value) return []

  const yearData = fileDataUnwrapped.value.byYear[selectedYear.value]
  if (!yearData) return []

  return Object.entries(yearData.suppliers).map(([name, supplier]) => ({
    id: supplier.supplierId || name,
    name: name,
    supplierId: supplier.supplierId,
    logoUrl: supplier.logoUrl,
    fileCount: supplier.fileCount,
    type: 'supplier'
  }))
})

// No need to fetch suppliers separately - logo data comes from file manager

const currentFiles = computed(() => {
  if (currentView.value === 'status') {
    return selectedStatus.value === 'processing' ? processingFiles.value : failedFiles.value
  }

  if (!fileDataUnwrapped.value || !selectedYear.value) return []

  const yearData = fileDataUnwrapped.value.byYear[selectedYear.value]
  if (!yearData) return []

  if (selectedSupplier.value && yearData.suppliers[selectedSupplier.value]) {
    const files = yearData.suppliers[selectedSupplier.value].files || [];
    return files.map((f: any) => typeof f.createdAt === 'string' ? f : fileToFileItem(f));
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

const handleFileSelected = (file: FileItem | null) => {
  if (file) {
    selectedFile.value = file
  }
}

// SEO
useSeoMeta({
  title: 'Files | Figgy',
  description: 'Manage and view your uploaded files organised by year and supplier',
})
</script>