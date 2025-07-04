<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { trpc } from '@/lib/trpc'
import SearchInput from '@/components/ui/SearchInput.vue'
import ErrorAlert from '@/components/ui/ErrorAlert.vue'

const router = useRouter()

// State
const isLoading = ref(true)
const error = ref<Error | null>(null)
const contactsData = ref<{ suppliers: any[], count: number } | null>(null)
const activeFilter = ref<'all' | 'supplier' | 'customer' | 'employee' | 'other'>('all')
const searchQuery = ref('')

// Fetch contacts
const fetchContacts = async () => {
  try {
    isLoading.value = true
    error.value = null
    const result = await trpc.supplier.list.query({
      type: activeFilter.value === 'all' ? undefined : activeFilter.value,
      search: searchQuery.value || undefined,
      limit: 200
    })
    contactsData.value = result
  } catch (err) {
    error.value = err as Error
    console.error('Failed to fetch contacts:', err)
  } finally {
    isLoading.value = false
  }
}

// Computed properties
const contacts = computed(() => contactsData.value?.suppliers || [])

const stats = computed(() => {
  const all = contacts.value
  return {
    total: all.length,
    suppliers: all.filter(c => c.contactType === 'supplier').length,
    customers: all.filter(c => c.contactType === 'customer').length,
    employees: all.filter(c => c.contactType === 'employee').length,
    other: all.filter(c => c.contactType === 'other').length
  }
})

// Navigation
const navigateToContact = (contactId: string) => {
  router.push(`/contacts/${contactId}`)
}

// Format currency
const formatCurrency = (amount: number | string | null) => {
  if (!amount) return '£0.00'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-GB', { 
    style: 'currency', 
    currency: 'GBP' 
  }).format(num)
}

// Format contact type
const getContactTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    supplier: 'Supplier',
    customer: 'Customer',
    employee: 'Employee',
    other: 'Other'
  }
  return labels[type] || type
}

// Get contact type color
const getContactTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    supplier: 'bg-blue-100 text-blue-800',
    customer: 'bg-green-100 text-green-800',
    employee: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800'
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

// Filter handling
const setFilter = (filter: typeof activeFilter.value) => {
  activeFilter.value = filter
  fetchContacts()
}

// Search handling
const handleSearch = () => {
  fetchContacts()
}

// Fetch data on mount
onMounted(() => {
  fetchContacts()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Contacts</h1>
      <p class="text-gray-600">Manage your suppliers, customers, and other contacts</p>
    </div>

    <!-- Error state -->
    <ErrorAlert v-if="error" :error="error" class="mb-6" />

    <!-- Filters and Search -->
    <div class="mb-6 space-y-4">
      <!-- Filter buttons -->
      <div class="flex flex-wrap gap-2">
        <button
          @click="setFilter('all')"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeFilter === 'all' 
            ? 'bg-slate-900 text-white' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'"
        >
          All ({{ stats.total }})
        </button>
        <button
          @click="setFilter('supplier')"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeFilter === 'supplier' 
            ? 'bg-slate-900 text-white' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'"
        >
          Suppliers ({{ stats.suppliers }})
        </button>
        <button
          @click="setFilter('customer')"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeFilter === 'customer' 
            ? 'bg-slate-900 text-white' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'"
        >
          Customers ({{ stats.customers }})
        </button>
        <button
          @click="setFilter('employee')"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeFilter === 'employee' 
            ? 'bg-slate-900 text-white' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'"
        >
          Employees ({{ stats.employees }})
        </button>
        <button
          v-if="stats.other > 0"
          @click="setFilter('other')"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeFilter === 'other' 
            ? 'bg-slate-900 text-white' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'"
        >
          Other ({{ stats.other }})
        </button>
      </div>

      <!-- Search -->
      <div class="max-w-md">
        <SearchInput
          v-model="searchQuery"
          placeholder="Search by name, email, or contact number..."
          @update:modelValue="handleSearch"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Contacts table -->
      <div v-if="contacts.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Info
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="contact in contacts"
              :key="contact.id"
              class="hover:bg-gray-50 cursor-pointer transition-colors"
              @click="navigateToContact(contact.id)"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ contact.name }}</div>
                  <div v-if="contact.contactNumber" class="text-sm text-gray-500">
                    #{{ contact.contactNumber }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="getContactTypeColor(contact.contactType)"
                >
                  {{ getContactTypeLabel(contact.contactType) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  <div v-if="contact.email">{{ contact.email }}</div>
                  <div v-if="contact.phone" class="text-gray-500">{{ contact.phone }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                <div v-if="contact.outstandingBalance || contact.overdueBalance">
                  <div :class="parseFloat(contact.outstandingBalance || '0') < 0 ? 'text-red-600' : 'text-gray-900'">
                    {{ formatCurrency(contact.outstandingBalance) }}
                  </div>
                  <div v-if="contact.overdueBalance && parseFloat(contact.overdueBalance) > 0" class="text-xs text-red-600">
                    {{ formatCurrency(contact.overdueBalance) }} overdue
                  </div>
                </div>
                <div v-else class="text-gray-400">-</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="contact.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'"
                >
                  {{ contact.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ searchQuery ? 'Try adjusting your search criteria.' : 'Sync your data from your accounting provider to see contacts.' }}
        </p>
      </div>
    </div>
  </div>
</template>