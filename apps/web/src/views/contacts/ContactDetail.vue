<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { trpc } from '@/lib/trpc'
import ErrorAlert from '@/components/ui/ErrorAlert.vue'

const route = useRoute()
const router = useRouter()

const contactId = computed(() => route.params.id as string)

// State
const contactData = ref<any>(null)
const isLoading = ref(true)
const error = ref<Error | null>(null)

// Fetch contact details
const fetchContact = async () => {
  try {
    isLoading.value = true
    error.value = null
    contactData.value = await trpc.supplier.get.query({ id: contactId.value })
  } catch (err) {
    error.value = err as Error
    console.error('Failed to fetch contact:', err)
  } finally {
    isLoading.value = false
  }
}

// Computed properties
const contact = computed(() => contactData.value)

// Format functions
const formatCurrency = (amount: number | string | null) => {
  if (!amount) return '£0.00'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-GB', { 
    style: 'currency', 
    currency: 'GBP' 
  }).format(num)
}

const formatDate = (date: string | Date | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getContactTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    supplier: 'Supplier',
    customer: 'Customer',
    employee: 'Employee',
    other: 'Other'
  }
  return labels[type] || type
}

const getContactTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    supplier: 'bg-blue-100 text-blue-800',
    customer: 'bg-green-100 text-green-800',
    employee: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800'
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

// Navigation
const navigateBack = () => {
  router.push('/contacts')
}

// Initialize
onMounted(() => {
  fetchContact()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center mb-4">
        <button
          @click="navigateBack"
          class="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-3xl font-bold text-gray-900">{{ contact?.name || 'Loading...' }}</h1>
      </div>
      
      <div v-if="contact" class="flex items-center gap-4">
        <span
          class="inline-flex px-3 py-1 text-sm font-semibold rounded-full"
          :class="getContactTypeColor(contact.contactType)"
        >
          {{ getContactTypeLabel(contact.contactType) }}
        </span>
        <span
          class="inline-flex px-3 py-1 text-sm font-semibold rounded-full"
          :class="contact.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'"
        >
          {{ contact.isActive ? 'Active' : 'Inactive' }}
        </span>
        <span v-if="contact.contactNumber" class="text-sm text-gray-600">
          #{{ contact.contactNumber }}
        </span>
      </div>
    </div>

    <!-- Error state -->
    <ErrorAlert v-if="error" :error="error" class="mb-6" />

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Content -->
    <div v-else-if="contact" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Main content -->
      <div class="lg:col-span-2 space-y-8">
        <!-- Basic Information -->
        <section class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt class="text-sm font-medium text-gray-500">Display Name</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.displayName || contact.name }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Legal Name</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.legalName || '-' }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Trading Name</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.tradingName || '-' }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Entity Type</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.entityType || '-' }}</dd>
            </div>
          </dl>
        </section>

        <!-- Contact Information -->
        <section class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt class="text-sm font-medium text-gray-500">Email</dt>
              <dd class="mt-1 text-sm text-gray-900">
                <a v-if="contact.email" :href="`mailto:${contact.email}`" class="text-blue-600 hover:text-blue-800">
                  {{ contact.email }}
                </a>
                <span v-else>-</span>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Phone</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.phone || '-' }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Mobile</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.mobile || '-' }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">Fax</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.fax || '-' }}</dd>
            </div>
            <div v-if="contact.website" class="sm:col-span-2">
              <dt class="text-sm font-medium text-gray-500">Website</dt>
              <dd class="mt-1 text-sm text-gray-900">
                <a :href="contact.website" target="_blank" class="text-blue-600 hover:text-blue-800">
                  {{ contact.website }}
                </a>
              </dd>
            </div>
          </dl>
        </section>

        <!-- Addresses -->
        <section v-if="contact.primaryAddress || contact.billingAddress || contact.shippingAddress" 
                 class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Addresses</h2>
          <div class="space-y-4">
            <!-- Primary Address -->
            <div v-if="contact.primaryAddress">
              <h3 class="text-sm font-medium text-gray-700 mb-2">Primary Address</h3>
              <address class="text-sm text-gray-600 not-italic">
                <div v-if="contact.primaryAddress.line1">{{ contact.primaryAddress.line1 }}</div>
                <div v-if="contact.primaryAddress.line2">{{ contact.primaryAddress.line2 }}</div>
                <div v-if="contact.primaryAddress.city || contact.primaryAddress.postalCode">
                  {{ contact.primaryAddress.city }}<span v-if="contact.primaryAddress.city && contact.primaryAddress.postalCode">, </span>{{ contact.primaryAddress.postalCode }}
                </div>
                <div v-if="contact.primaryAddress.country">{{ contact.primaryAddress.country }}</div>
              </address>
            </div>

            <!-- Billing Address -->
            <div v-if="contact.billingAddress && JSON.stringify(contact.billingAddress) !== JSON.stringify(contact.primaryAddress)">
              <h3 class="text-sm font-medium text-gray-700 mb-2">Billing Address</h3>
              <address class="text-sm text-gray-600 not-italic">
                <div v-if="contact.billingAddress.line1">{{ contact.billingAddress.line1 }}</div>
                <div v-if="contact.billingAddress.line2">{{ contact.billingAddress.line2 }}</div>
                <div v-if="contact.billingAddress.city || contact.billingAddress.postalCode">
                  {{ contact.billingAddress.city }}<span v-if="contact.billingAddress.city && contact.billingAddress.postalCode">, </span>{{ contact.billingAddress.postalCode }}
                </div>
                <div v-if="contact.billingAddress.country">{{ contact.billingAddress.country }}</div>
              </address>
            </div>
          </div>
        </section>

        <!-- Tax Information -->
        <section v-if="contact.taxNumber || contact.vatNumber || contact.companyNumber" 
                 class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Tax & Legal</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-if="contact.taxNumber">
              <dt class="text-sm font-medium text-gray-500">Tax Number</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.taxNumber }}</dd>
            </div>
            <div v-if="contact.vatNumber">
              <dt class="text-sm font-medium text-gray-500">VAT Number</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.vatNumber }}</dd>
            </div>
            <div v-if="contact.companyNumber">
              <dt class="text-sm font-medium text-gray-500">Company Number</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.companyNumber }}</dd>
            </div>
            <div v-if="contact.taxIdType">
              <dt class="text-sm font-medium text-gray-500">Tax ID Type</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.taxIdType }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <!-- Sidebar -->
      <div class="space-y-8">
        <!-- Financial Summary -->
        <section class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <dl class="space-y-3">
            <div>
              <dt class="text-sm font-medium text-gray-500">Outstanding Balance</dt>
              <dd class="mt-1 text-lg font-semibold" 
                  :class="parseFloat(contact.outstandingBalance || '0') < 0 ? 'text-red-600' : 'text-gray-900'">
                {{ formatCurrency(contact.outstandingBalance) }}
              </dd>
            </div>
            <div v-if="contact.overdueBalance && parseFloat(contact.overdueBalance) > 0">
              <dt class="text-sm font-medium text-gray-500">Overdue Amount</dt>
              <dd class="mt-1 text-lg font-semibold text-red-600">
                {{ formatCurrency(contact.overdueBalance) }}
              </dd>
            </div>
            <div v-if="contact.creditLimit">
              <dt class="text-sm font-medium text-gray-500">Credit Limit</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ formatCurrency(contact.creditLimit) }}</dd>
            </div>
          </dl>
        </section>

        <!-- Payment Terms -->
        <section v-if="contact.defaultPaymentTerms || contact.defaultPaymentMethod" 
                 class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
          <dl class="space-y-3">
            <div v-if="contact.defaultPaymentTerms">
              <dt class="text-sm font-medium text-gray-500">Payment Terms</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.defaultPaymentTerms }}</dd>
            </div>
            <div v-if="contact.defaultPaymentMethod">
              <dt class="text-sm font-medium text-gray-500">Payment Method</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.defaultPaymentMethod }}</dd>
            </div>
            <div v-if="contact.bankAccountNumber">
              <dt class="text-sm font-medium text-gray-500">Bank Account</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.bankAccountNumber }}</dd>
            </div>
          </dl>
        </section>

        <!-- Metadata -->
        <section class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          <dl class="space-y-3">
            <div v-if="contact.currency">
              <dt class="text-sm font-medium text-gray-500">Default Currency</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ contact.currency }}</dd>
            </div>
            <div v-if="contact.createdAt">
              <dt class="text-sm font-medium text-gray-500">Created</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ formatDate(contact.createdAt) }}</dd>
            </div>
            <div v-if="contact.lastSyncedAt">
              <dt class="text-sm font-medium text-gray-500">Last Synced</dt>
              <dd class="mt-1 text-sm text-gray-900">{{ formatDate(contact.lastSyncedAt) }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  </div>
</template>