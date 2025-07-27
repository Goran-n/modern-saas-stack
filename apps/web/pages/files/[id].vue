<template>
  <UContainer class="py-6">
    <div class="mb-6">
      <NuxtLink to="/suppliers" class="text-sky-600 hover:text-sky-700 flex items-center gap-2">
        <UIcon name="i-heroicons-arrow-left" />
        Back to suppliers
      </NuxtLink>
    </div>

    <div v-if="fileLoading" class="space-y-4">
      <USkeleton class="h-8 w-64" />
      <USkeleton class="h-96 w-full" />
    </div>

    <div v-else-if="fileError" class="text-red-500">
      Error loading file: {{ fileError?.message }}
    </div>

    <div v-else-if="file" class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UIcon 
            :name="getFileIcon(file.value?.fileName || '')" 
            class="text-2xl text-gray-500"
          />
          <div>
            <h1 class="text-2xl font-semibold">{{ file.value?.metadata?.displayName || file.value?.fileName }}</h1>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <span v-if="file.value?.metadata?.supplierName">{{ file.value?.metadata.supplierName }} •</span>
              <span>{{ formatFileSize(file.value?.size || 0) }} •</span>
              <span>{{ formatDate(file.value?.extraction?.extractedFields?.documentDate?.value || file.value?.createdAt || '') }}</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <UButton
            v-if="downloadUrl"
            :to="downloadUrl"
            target="_blank"
            icon="i-heroicons-arrow-down-tray"
            color="neutral"
            variant="solid"
          >
            Download
          </UButton>
          <UButton
            v-if="file.value?.processingStatus !== 'processing'"
            icon="i-heroicons-arrow-path"
            color="primary"
            variant="solid"
            @click="showReprocessModal = true"
            :loading="isReprocessing"
          >
            Reprocess
          </UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- File Display -->
        <div class="space-y-4">
          <UCard>
            <template #header>
              <h2 class="text-lg font-medium">File Preview</h2>
            </template>
            
            <div class="min-h-[800px] flex items-center justify-center bg-gray-50 rounded-lg">
              <div v-if="isPDF(file.value?.fileName || '')" class="w-full h-full">
                <div v-if="proxyUrl && !iframeError" class="w-full h-[800px]">
                  <iframe 
                    :src="proxyUrl"
                    class="w-full h-full rounded-lg border-0"
                    title="PDF Viewer"
                    @error="iframeError = true"
                  />
                </div>
                <div v-else-if="proxyUrl && iframeError" class="flex items-center justify-center h-[800px]">
                  <div class="text-center text-gray-500 p-8">
                    <p class="mb-4">Your browser doesn't support PDFs or the file couldn't be loaded.</p>
                    <UButton 
                      :to="downloadUrl" 
                      target="_blank" 
                      variant="outline"
                    >
                      Download PDF
                    </UButton>
                  </div>
                </div>
                <div v-else class="flex items-center justify-center h-[800px]">
                  <div class="text-center">
                    <USkeleton class="h-8 w-32 mb-2" />
                    <p class="text-sm text-gray-500">Loading PDF...</p>
                  </div>
                </div>
              </div>
              
              <div v-else-if="isImage(file.value?.fileName || '')" class="w-full h-full">
                <img 
                  :src="proxyUrl || undefined" 
                  :alt="file.value?.fileName || ''"
                  class="max-w-full max-h-[800px] object-contain mx-auto"
                />
              </div>
              
              <div v-else class="text-center text-gray-500">
                <UIcon name="i-heroicons-document" class="text-6xl mb-4" />
                <p>Preview not available for this file type</p>
                <UButton 
                  v-if="downloadUrl" 
                  :to="downloadUrl" 
                  target="_blank" 
                  class="mt-4"
                >
                  Download File
                </UButton>
              </div>
            </div>
          </UCard>
        </div>

        <!-- File Information & Extractions -->
        <div class="space-y-4">
          <!-- Key Document Information (if extracted) -->
          <UCard v-if="file.value?.extraction?.extractedFields" class="border-primary-500">
            <template #header>
              <h2 class="text-lg font-medium">Document Summary</h2>
            </template>
            
            <div class="space-y-4">
              <!-- Amount if available -->
              <div v-if="file.value?.extraction?.extractedFields?.totalAmount?.value" class="bg-primary-50 rounded-lg p-4 text-center">
                <p class="text-sm text-gray-600 mb-1">Total Amount</p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ formatCurrency(file.value?.extraction?.extractedFields?.totalAmount?.value, file.value?.extraction?.extractedFields?.currency?.value) }}
                </p>
                <p v-if="file.value?.extraction?.extractedFields?.totalAmount?.confidence" class="text-xs text-gray-500 mt-1">
                  {{ Math.round(file.value?.extraction?.extractedFields?.totalAmount?.confidence || 0) }}% confidence
                </p>
              </div>
              
              <!-- Key Info Grid -->
              <div class="grid grid-cols-2 gap-4">
                <div v-if="file.value?.extraction?.extractedFields?.documentNumber?.value" class="bg-gray-50 rounded-lg p-3">
                  <p class="text-xs text-gray-500">Document Number</p>
                  <p class="font-semibold">{{ file.value?.extraction?.extractedFields?.documentNumber?.value }}</p>
                </div>
                
                <div v-if="file.value?.extraction?.extractedFields?.documentDate?.value" class="bg-gray-50 rounded-lg p-3">
                  <p class="text-xs text-gray-500">Document Date</p>
                  <p class="font-semibold">{{ formatDate(file.value?.extraction?.extractedFields?.documentDate?.value || '') }}</p>
                </div>
                
                <div v-if="file.value?.extraction?.extractedFields?.dueDate?.value" class="bg-gray-50 rounded-lg p-3">
                  <p class="text-xs text-gray-500">Due Date</p>
                  <p class="font-semibold">{{ formatDate(file.value?.extraction?.extractedFields?.dueDate?.value || '') }}</p>
                </div>
                
                <div v-if="file.value?.extraction?.extractedFields?.vendorName?.value" class="bg-gray-50 rounded-lg p-3">
                  <p class="text-xs text-gray-500">Vendor</p>
                  <p class="font-semibold text-sm">{{ file.value?.extraction?.extractedFields?.vendorName?.value }}</p>
                </div>
              </div>
              
              <!-- Document Type Badge -->
              <div class="flex items-center justify-between pt-2 border-t">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500">Document Type:</span>
                  <FigBadge variant="soft" size="sm" color="primary">
                    {{ file.value?.extraction?.documentType }}
                  </FigBadge>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500">Confidence:</span>
                  <FigStatusBadge
                    :status="file.value?.extraction?.overallConfidence || 0"
                    type="confidence"
                    variant="soft"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="text-lg font-medium">File Information</h2>
            </template>
            
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Original Name:</span>
                <span class="text-sm font-medium">{{ file.value?.fileName }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Size:</span>
                <span class="text-sm font-medium">{{ formatFileSize(file.value?.size || 0) }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Type:</span>
                <span class="text-sm font-medium">{{ file.value?.mimeType || 'Unknown' }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Uploaded:</span>
                <span class="text-sm font-medium">{{ formatDate(file.value?.createdAt || '') }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Status:</span>
                <span class="text-sm font-medium">{{ file.value?.processingStatus || 'Unknown' }}</span>
              </div>
            </div>
            
            <div class="pt-4 border-t">
              <UButton 
                v-if="downloadUrl" 
                :to="downloadUrl" 
                target="_blank" 
                variant="outline"
                class="w-full"
                icon="i-heroicons-arrow-down-tray"
              >
                Download File
              </UButton>
            </div>
          </UCard>

          <!-- Extracted Data -->
          <UCard v-if="file.value?.extraction">
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-medium">Extracted Data</h2>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500">Confidence:</span>
                  <span class="text-sm font-medium" :class="getConfidenceColor(file.value?.extraction?.overallConfidence || 0)">
                    {{ Math.round(file.value?.extraction?.overallConfidence || 0) }}%
                  </span>
                </div>
              </div>
            </template>
            
            <div class="space-y-4">
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Document Type:</span>
                <span class="text-sm font-medium capitalize">{{ file.value?.extraction?.documentType }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">Validation Status:</span>
                <span class="text-sm font-medium capitalize" :class="getValidationColor(file.value?.extraction?.validationStatus || '')">
                  {{ file.value?.extraction?.validationStatus?.replace('_', ' ') }}
                </span>
              </div>

              <!-- Key Extracted Fields -->
              <div v-if="file.value?.extraction?.extractedFields" class="space-y-3 pt-3 border-t">
                <h3 class="text-sm font-medium">Key Fields</h3>
                
                <div v-for="(field, key) in getDisplayFields(file.value?.extraction?.extractedFields)" :key="key" class="flex justify-between">
                  <span class="text-sm text-gray-500">{{ formatFieldName(String(key)) }}:</span>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">{{ field.value }}</span>
                    <FigStatusBadge
                      :status="field.confidence"
                      type="confidence"
                      variant="soft"
                      size="xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- No Extraction Data -->
          <UCard v-else>
            <template #header>
              <h2 class="text-lg font-medium">Extracted Data</h2>
            </template>
            
            <div class="text-center py-8 text-gray-500">
              <UIcon name="i-heroicons-document-magnifying-glass" class="text-4xl mb-2" />
              <p>No extraction data available</p>
              <p class="text-sm">File may still be processing</p>
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <!-- Reprocess Confirmation Modal -->
    <FigModal v-model:open="showReprocessModal" title="Confirm Reprocess">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600">
            Are you sure you want to reprocess this file?
          </p>
          <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div class="flex">
              <div class="flex-shrink-0">
                <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-yellow-400" />
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-yellow-800">Warning</h3>
                <div class="mt-2 text-sm text-yellow-700">
                  <ul class="list-disc list-inside space-y-1">
                    <li>All extracted data will be deleted</li>
                    <li>Supplier links will be removed</li>
                    <li>The file will be processed from scratch</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="solid"
            @click="close"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            variant="solid"
            @click="reprocessFile"
            :loading="isReprocessing"
          >
            Reprocess File
          </UButton>
        </div>
      </template>
    </FigModal>
  </UContainer>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { FigBadge, FigStatusBadge, FigModal } from '@figgy/ui';

const route = useRoute();
const router = useRouter();
const api = useApi();
const tenantStore = useTenantStore();
const toast = useToast();
const trpc = useTrpc();

const fileId = route.params.id as string;
const selectedTenantId = computed(() => tenantStore.selectedTenantId);
const iframeError = ref(false);
const showReprocessModal = ref(false);
const isReprocessing = ref(false);

// Get file details with extractions
const { data: file, isLoading: fileLoading, error: fileError } = useQuery({
  queryKey: ['file-with-extractions', fileId, selectedTenantId],
  queryFn: async () => {
    const input = { json: { fileId } };
    const response = await api.get<any>(`/trpc/files.getWithExtractions?input=${encodeURIComponent(JSON.stringify(input))}`);
    return response.result.data.json;
  },
  enabled: () => !!fileId && !!selectedTenantId.value,
});

// Get proxy URL for file display (inline viewing)
const proxyUrl = computed(() => {
  if (!fileId || !selectedTenantId.value) return null;
  const config = useRuntimeConfig();
  const apiUrl = config.public.apiUrl;
  return `${apiUrl}/api/files/proxy/${fileId}?tenantId=${selectedTenantId.value}#toolbar=0`;
});

// Get signed URL for download
const { data: downloadUrlData } = useQuery({
  queryKey: ['file-download-url', fileId, selectedTenantId],
  queryFn: async () => {
    const input = { json: { fileId, download: true } };
    const response = await api.get<any>(`/trpc/files.getSignedUrl?input=${encodeURIComponent(JSON.stringify(input))}`);
    return response.result.data.json;
  },
  enabled: () => !!fileId && !!selectedTenantId.value,
});

const downloadUrl = computed(() => downloadUrlData.value?.url);

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext || '')) return 'i-heroicons-document-text';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'i-heroicons-photo';
  return 'i-heroicons-document';
};

const isPDF = (filename: string) => {
  return filename.toLowerCase().endsWith('.pdf');
};

const isImage = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
  return Math.round(bytes / 1048576 * 10) / 10 + ' MB';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const formatCurrency = (amount: any, currency?: any): string => {
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount)) return amount
  
  const curr = currency || 'GBP'
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  
  return formatter.format(numAmount)
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 90) return 'text-green-600 bg-green-100';
  if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

// Confidence badge color logic is now handled by FigStatusBadge component

const getValidationColor = (status: string) => {
  if (status === 'valid') return 'text-green-600';
  if (status === 'needs_review') return 'text-yellow-600';
  return 'text-red-600';
};

const formatFieldName = (key: string) => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

const getDisplayFields = (extractedFields: any) => {
  if (!extractedFields) return {};
  
  const importantFields = [
    'vendorName',
    'documentNumber',
    'documentDate',
    'totalAmount',
    'subtotalAmount',
    'taxAmount',
    'currency',
    'dueDate',
    'customerName',
    'vendorEmail'
  ];
  
  const filtered: any = {};
  importantFields.forEach(field => {
    if (extractedFields[field]) {
      filtered[field] = extractedFields[field];
    }
  });
  
  return filtered;
};

const reprocessFile = async () => {
  isReprocessing.value = true;
  
  try {
    await trpc.files.reprocess.mutate({ fileId });
    
    toast.add({
      title: 'Reprocessing started',
      description: 'The file will be processed again from scratch',
      color: 'primary',
      icon: 'i-heroicons-arrow-path',
    });
    
    // Close modal
    showReprocessModal.value = false;
    
    // Redirect to files list after a short delay
    setTimeout(() => {
      router.push('/files');
    }, 1500);
  } catch (error) {
    // Reprocess failed
    toast.add({
      title: 'Reprocess failed',
      description: error instanceof Error ? error.message : 'Failed to reprocess file',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    });
  } finally {
    isReprocessing.value = false;
  }
};

</script>