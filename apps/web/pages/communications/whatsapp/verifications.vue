<template>
  <div class="min-h-screen bg-gray-50">
    <div class="p-4 md:p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <UBreadcrumb :links="breadcrumbs" class="mb-4" />
        
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-gray-900">WhatsApp Verifications</h1>
            <p class="mt-1 text-sm text-gray-600">
              Manage phone number verifications and user mappings
            </p>
          </div>
          
          <div class="flex items-center gap-3">
            <UButton 
              icon="i-heroicons-arrow-path" 
              variant="soft"
              @click="refresh"
              :loading="isRefreshing"
            >
              Refresh
            </UButton>
            <UButton 
              icon="i-heroicons-plus" 
              @click="openAddModal"
            >
              Add Manual Mapping
            </UButton>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-gray-900">{{ pendingCount }}</p>
            <p class="text-sm text-gray-600 mt-1">Pending</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-green-600">{{ verifiedCount }}</p>
            <p class="text-sm text-gray-600 mt-1">Verified</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-red-600">{{ expiredCount }}</p>
            <p class="text-sm text-gray-600 mt-1">Expired</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-semibold text-gray-900">{{ totalCount }}</p>
            <p class="text-sm text-gray-600 mt-1">Total</p>
          </div>
        </UCard>
      </div>

      <!-- Filters -->
      <UCard class="mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <UInput 
            v-model="searchQuery"
            placeholder="Search by phone number..."
            icon="i-heroicons-magnifying-glass"
            class="flex-1"
          />
          
          <USelectMenu
            v-model="statusFilter"
            :options="statusOptions"
            placeholder="Filter by status"
            class="w-full md:w-48"
          />
          
          <UButton 
            variant="soft"
            icon="i-heroicons-funnel"
            @click="clearFilters"
            :disabled="!searchQuery && statusFilter === 'all'"
          >
            Clear Filters
          </UButton>
        </div>
      </UCard>

      <!-- Verifications Table -->
      <UCard>
        <UTable
          :columns="columns"
          :rows="filteredVerifications"
          :loading="isLoading"
          :empty-state="{ 
            icon: 'i-heroicons-shield-exclamation',
            label: 'No verifications found'
          }"
        >
          <template #phoneNumber-data="{ row }">
            <div class="flex items-center gap-2">
              <span class="font-mono">{{ (row as any).phoneNumber }}</span>
              <UButton
                icon="i-heroicons-clipboard-document"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="copyToClipboard((row as any).phoneNumber)"
              />
            </div>
          </template>

          <template #verificationCode-data="{ row }">
            <div class="flex items-center gap-2">
              <code class="px-2 py-1 bg-gray-100 rounded text-sm">
                {{ (row as any).verificationCode }}
              </code>
              <UButton
                icon="i-heroicons-clipboard-document"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="copyToClipboard((row as any).verificationCode)"
              />
            </div>
          </template>

          <template #status-data="{ row }">
            <UBadge 
              :color="getStatusBadgeColor(row as any)"
              variant="soft"
            >
              {{ getStatusLabel(row as any) }}
            </UBadge>
          </template>

          <template #expiresAt-data="{ row }">
            <span v-if="!(row as any).verified" :class="{ 'text-red-600': isExpired((row as any).expiresAt) }">
              {{ formatDate((row as any).expiresAt) }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template #createdAt-data="{ row }">
            <span class="text-gray-600">{{ formatDate((row as any).createdAt) }}</span>
          </template>

          <template #actions-data="{ row }">
            <div class="flex items-center gap-2">
              <UButton
                v-if="!(row as any).verified && !isExpired((row as any).expiresAt)"
                icon="i-heroicons-check"
                size="xs"
                color="success"
                variant="soft"
                @click="verifyNumber(row as any)"
              >
                Verify
              </UButton>
              
              <UButton
                v-if="!(row as any).verified"
                icon="i-heroicons-arrow-path"
                size="xs"
                variant="soft"
                color="neutral"
                @click="resendCode(row as any)"
              >
                Resend
              </UButton>
              
              <UButton
                icon="i-heroicons-trash"
                size="xs"
                color="error"
                variant="ghost"
                @click="deleteVerification(row as any)"
              />
            </div>
          </template>
        </UTable>

        <!-- Bulk Actions -->
        <div v-if="selectedRows.length > 0" class="mt-4 p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">
              {{ selectedRows.length }} items selected
            </span>
            <div class="flex items-center gap-2">
              <UButton
                size="sm"
                variant="soft"
                icon="i-heroicons-arrow-down-tray"
                @click="exportSelected"
              >
                Export
              </UButton>
              <UButton
                size="sm"
                color="error"
                variant="soft"
                icon="i-heroicons-trash"
                @click="deleteSelected"
              >
                Delete
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Add Manual Mapping Modal -->
    <UModal 
      v-model:open="showAddModal" 
      title="Add Manual Mapping"
      description="Map a phone number to a user in your system"
    >
      <template #body>
        <form @submit.prevent="addManualMapping" class="space-y-4">
          <UFormField label="Phone Number" name="phoneNumber" required>
            <UInput 
              v-model="newMapping.phoneNumber" 
              placeholder="+1234567890"
              icon="i-heroicons-phone"
              type="tel"
            />
          </UFormField>

          <UFormField label="User" name="userId" required>
            <USelectMenu
              v-model="selectedUser"
              :items="userOptions"
              label-attribute="label"
              value-attribute="value"
              placeholder="Select user"
            />
          </UFormField>

          <!-- Removed verification method selection - always sends code -->
        </form>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-3">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="close" />
          <UButton label="Add Mapping" color="primary" :loading="isSubmitting" @click="addManualMapping" />
        </div>
      </template>
    </UModal>

    <!-- Verification Code Entry Modal -->
    <UModal 
      v-model:open="showCodeModal" 
      title="Enter Verification Code"
      description="Enter the 6-digit code sent to your WhatsApp"
    >
      <template #body>
        <form @submit.prevent="submitVerificationCode" class="space-y-4">
          <div class="text-center mb-4">
            <p class="text-sm text-gray-600">
              We've sent a verification code to
            </p>
            <p class="font-mono text-lg font-semibold">{{ pendingVerification?.phoneNumber }}</p>
          </div>

          <UFormField label="Verification Code" name="code" required>
            <UInput 
              v-model="verificationCode" 
              placeholder="123456"
              maxlength="6"
              pattern="[0-9]{6}"
              class="text-center text-2xl font-mono tracking-wider"
              @input="handleCodeInput"
            />
          </UFormField>

          <div class="text-sm text-gray-500 text-center">
            <p v-if="pendingVerification">
              Code expires at {{ formatDate(pendingVerification.expiresAt) }}
            </p>
          </div>
        </form>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-between items-center w-full">
          <UButton 
            label="Resend Code" 
            color="neutral" 
            variant="ghost" 
            size="sm"
            @click="resendCodeForModal" 
            :disabled="isResending"
          />
          <div class="flex gap-3">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="close" />
            <UButton 
              label="Verify" 
              color="primary" 
              :loading="isVerifying" 
              :disabled="verificationCode.length !== 6"
              @click="submitVerificationCode" 
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useCommunicationStore } from '~/stores/communication'
import type { WhatsAppVerification } from '~/types/communication'

// Store
const communicationStore = useCommunicationStore()
const tenantStore = useTenantStore()

// State
const isLoading = ref(false)
const isRefreshing = ref(false)
const showAddModal = ref(false)
const showCodeModal = ref(false)
const isSubmitting = ref(false)
const isVerifying = ref(false)
const isResending = ref(false)
const searchQuery = ref('')
const statusFilter = ref('all')
const selectedRows = ref<WhatsAppVerification[]>([])
const verificationCode = ref('')
const pendingVerification = ref<WhatsAppVerification | null>(null)

const newMapping = ref({
  phoneNumber: '',
  userId: ''
})

// Options
const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Verified', value: 'verified' },
  { label: 'Expired', value: 'expired' }
]

const userOptions = ref<Array<{ label: string; value: string; email?: string }>>([])
const selectedUser = ref<{ label: string; value: string; email?: string } | undefined>(undefined)

// Sync selected user with newMapping.userId
watch(selectedUser, (user) => {
  if (user) {
    newMapping.value.userId = user.value
  }
})


// Function to fetch users for the current tenant
const fetchUsers = async () => {
  try {
    // Get auth headers
    const client = useSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    
    if (!session) {
      throw new Error('No active session')
    }
    
    // Fetch all users from the API using $fetch
    const data = await $fetch<any>('/api/trpc/users.list', {
      baseURL: useRuntimeConfig().public.apiUrl,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'x-tenant-id': tenantStore.selectedTenantId || ''
      }
    })
    
    if (data?.result?.data?.json) {
      // Format users for the select menu
      userOptions.value = data.result.data.json.map((user: any) => ({
        label: user.name,
        value: user.id,
        email: user.email
      }))
    } else {
      throw new Error('No data returned')
    }
  } catch (error) {
    console.error('Failed to fetch users:', error)
    userOptions.value = []
    
    // Fallback to current user if API fails
    const user = useSupabaseUser()
    if (user.value) {
      userOptions.value = [{
        label: user.value.email?.split('@')[0] || 'Current User',
        value: user.value.id,
        email: user.value.email
      }]
    }
  }
}

// Table columns
const columns = [
  {
    id: 'phoneNumber',
    key: 'phoneNumber',
    label: 'Phone Number',
    sortable: true
  },
  {
    id: 'verificationCode',
    key: 'verificationCode',
    label: 'Code'
  },
  {
    id: 'status',
    key: 'status',
    label: 'Status',
    sortable: true
  },
  {
    id: 'expiresAt',
    key: 'expiresAt',
    label: 'Expires',
    sortable: true
  },
  {
    id: 'createdAt',
    key: 'createdAt',
    label: 'Created',
    sortable: true
  },
  {
    id: 'actions',
    key: 'actions',
    label: 'Actions'
  }
] as any

// Computed
const verifications = computed(() => communicationStore.verifications)

const filteredVerifications = computed(() => {
  let filtered = verifications.value

  // Search filter
  if (searchQuery.value) {
    filtered = filtered.filter(v => 
      v.phoneNumber.includes(searchQuery.value)
    )
  }

  // Status filter
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(v => {
      if (statusFilter.value === 'verified') return v.verified
      if (statusFilter.value === 'pending') return !v.verified && !isExpired(v.expiresAt)
      if (statusFilter.value === 'expired') return !v.verified && isExpired(v.expiresAt)
      return true
    })
  }

  return filtered
})

const pendingCount = computed(() => 
  verifications.value.filter(v => !v.verified && !isExpired(v.expiresAt)).length
)

const verifiedCount = computed(() => 
  verifications.value.filter(v => v.verified).length
)

const expiredCount = computed(() => 
  verifications.value.filter(v => !v.verified && isExpired(v.expiresAt)).length
)

const totalCount = computed(() => verifications.value.length)

const breadcrumbs = [
  { label: 'Communications', to: '/communications' },
  { label: 'WhatsApp', to: '/communications/whatsapp' },
  { label: 'Verifications' }
]

// Load data
onMounted(async () => {
  // Wait for tenant to be selected
  if (!tenantStore.selectedTenantId) {
    await tenantStore.fetchUserTenants()
  }

  if (!tenantStore.selectedTenantId) {
    console.error('No tenant selected')
    useNotification().error(
      'No tenant selected',
      'Please select a tenant to view verifications.'
    )
    return
  }

  isLoading.value = true
  try {
    // Fetch users and verifications in parallel
    await Promise.all([
      fetchUsers(),
      communicationStore.fetchVerifications()
    ])
  } catch (error) {
    console.error('Failed to load verifications:', error)
    useNotification().error(
      'Failed to load verifications', 
      'Unable to load verification data. Please try again.'
    )
  } finally {
    isLoading.value = false
  }
})

// Methods
const refresh = async () => {
  isRefreshing.value = true
  try {
    await Promise.all([
      fetchUsers(),
      communicationStore.fetchVerifications()
    ])
    useNotification().success('Data refreshed')
  } catch (error) {
    console.error('Failed to refresh verifications:', error)
    useNotification().error(
      'Failed to refresh data', 
      'The backend API is not available.'
    )
  } finally {
    isRefreshing.value = false
  }
}

const openAddModal = async () => {
  // Fetch latest users before opening modal
  await fetchUsers()
  // Reset form
  newMapping.value = {
    phoneNumber: '',
    userId: ''
  }
  selectedUser.value = undefined
  showAddModal.value = true
}

const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
}

const getStatusBadgeColor = (row: WhatsAppVerification) => {
  if (row.verified) return 'success'
  if (isExpired(row.expiresAt)) return 'error'
  return 'warning'
}

const getStatusLabel = (row: WhatsAppVerification) => {
  if (row.verified) return 'Verified'
  if (isExpired(row.expiresAt)) return 'Expired'
  return 'Pending'
}

const isExpired = (date: string) => {
  return new Date(date) < new Date()
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}

const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text)
  useNotification().success('Copied to clipboard')
}

const verifyNumber = async (verification: WhatsAppVerification) => {
  // Show the code entry modal for this verification
  pendingVerification.value = verification
  verificationCode.value = ''
  showCodeModal.value = true
}

const resendCode = async (verification: WhatsAppVerification) => {
  try {
    // Get auth headers
    const client = useSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    
    if (!session) {
      throw new Error('No active session')
    }

    // Create a new verification with code method
    const { data } = await useFetch<any>('/api/trpc/communication.createVerification', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'x-tenant-id': tenantStore.selectedTenantId || '',
        'Content-Type': 'application/json'
      },
      body: {
        json: {
          phoneNumber: verification.phoneNumber,
          userId: verification.userId
        }
      }
    })
    
    if (data.value?.result?.data?.json?.success) {
      useNotification().success('Code Resent', `New verification code sent to ${verification.phoneNumber}`)
      await refresh()
    } else {
      throw new Error(data.value?.error?.json?.message || 'Failed to resend code')
    }
  } catch (error) {
    console.error('Failed to resend code:', error)
    useNotification().error('Error', 'Failed to resend verification code')
  }
}

const deleteVerification = async (_verification: WhatsAppVerification) => {
  // Implementation for deleting verification
  useNotification().success('Verification deleted')
}

const exportSelected = () => {
  // Implementation for exporting selected rows
  useNotification().info('Export started', `Exporting ${selectedRows.value.length} items`)
}

const deleteSelected = () => {
  // Implementation for deleting selected rows
  useNotification().success('Items deleted', `${selectedRows.value.length} items have been deleted`)
}

const closeModal = () => {
  showAddModal.value = false
  // Reset form
  newMapping.value = {
    phoneNumber: '',
    userId: ''
  }
  selectedUser.value = undefined
}

const handleCodeInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  // Only allow digits
  input.value = input.value.replace(/\D/g, '')
  verificationCode.value = input.value
}

const submitVerificationCode = async () => {
  if (verificationCode.value.length !== 6 || !pendingVerification.value) {
    return
  }

  isVerifying.value = true
  try {
    // Get auth headers
    const client = useSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    
    if (!session) {
      throw new Error('No active session')
    }

    // Call the API to verify code
    const { data } = await useFetch<any>('/api/trpc/communication.verifyCode', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'x-tenant-id': tenantStore.selectedTenantId || '',
        'Content-Type': 'application/json'
      },
      body: {
        json: {
          phoneNumber: pendingVerification.value.phoneNumber,
          code: verificationCode.value
        }
      }
    })
    
    if (data.value?.result?.data?.json?.success) {
      useNotification().success('Success', 'Phone number verified successfully')
      showCodeModal.value = false
      verificationCode.value = ''
      pendingVerification.value = null
      await refresh()
    } else {
      throw new Error(data.value?.error?.json?.message || 'Failed to verify code')
    }
  } catch (error) {
    console.error('Failed to verify code:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify code. Please try again.'
    useNotification().error('Error', errorMessage)
  } finally {
    isVerifying.value = false
  }
}

const resendCodeForModal = async () => {
  if (!pendingVerification.value) return
  
  isResending.value = true
  try {
    await resendCode(pendingVerification.value)
    verificationCode.value = ''
  } finally {
    isResending.value = false
  }
}

const addManualMapping = async () => {
  // Validate form
  if (!newMapping.value.phoneNumber || !newMapping.value.userId) {
    useNotification().error('Validation Error', 'Please fill in all required fields')
    return
  }

  // Validate phone number format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  if (!phoneRegex.test(newMapping.value.phoneNumber)) {
    useNotification().error('Invalid Phone Number', 'Please enter a valid phone number with country code (e.g., +1234567890)')
    return
  }

  isSubmitting.value = true
  try {
    // Get auth headers
    const client = useSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    
    if (!session) {
      throw new Error('No active session')
    }

    // Call the API to create verification
    const { data } = await useFetch<any>('/api/trpc/communication.createVerification', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'x-tenant-id': tenantStore.selectedTenantId || '',
        'Content-Type': 'application/json'
      },
      body: {
        json: {
          phoneNumber: newMapping.value.phoneNumber,
          userId: newMapping.value.userId
        }
      }
    })
    
    if (data.value?.result?.data?.json?.success) {
      // Always show the code entry modal
      closeModal()
      // Find the newly created verification
      await refresh()
      const newVerification = verifications.value.find(
        v => v.phoneNumber === newMapping.value.phoneNumber && !v.verified
      )
      if (newVerification) {
        pendingVerification.value = newVerification
        verificationCode.value = ''
        showCodeModal.value = true
      }
    } else {
      throw new Error(data.value?.error?.json?.message || 'Failed to create verification')
    }
  } catch (error) {
    console.error('Failed to add mapping:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to add mapping. Please try again.'
    useNotification().error('Error', errorMessage)
  } finally {
    isSubmitting.value = false
  }
}

// SEO
useSeoMeta({
  title: 'WhatsApp Verifications | Figgy',
  description: 'Manage WhatsApp phone number verifications and user mappings',
})
</script>