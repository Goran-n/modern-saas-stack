<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccounts } from '@/composables/useAccounts'
import BaseButton from '@/components/ui/BaseButton.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import ErrorAlert from '@/components/ui/ErrorAlert.vue'

const router = useRouter()

// Search functionality
const searchQuery = ref('')

// Use accounts composable with search
const {
  loading: isLoading,
  error,
  bankAccounts,
  glAccounts,
  loadAccounts,
  formatCurrency
} = useAccounts({ searchQuery })

// Filter accounts based on search
const filteredBankAccounts = computed(() => {
  if (!searchQuery.value) return bankAccounts.value
  const query = searchQuery.value.toLowerCase()
  return bankAccounts.value.filter(account => 
    account.name.toLowerCase().includes(query) ||
    account.code?.toLowerCase().includes(query) ||
    account.accountNumber?.toLowerCase().includes(query)
  )
})

const filteredGLAccounts = computed(() => {
  if (!searchQuery.value) return glAccounts.value
  const query = searchQuery.value.toLowerCase()
  return glAccounts.value.filter(account => 
    account.name.toLowerCase().includes(query) ||
    account.code?.toLowerCase().includes(query)
  )
})

// Navigation
const navigateToAccount = (accountId: string) => {
  router.push(`/accounts/${accountId}`)
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Accounts
      </h1>
      <p class="text-gray-600">
        View all your bank and general ledger accounts
      </p>
    </div>

    <!-- Error state -->
    <ErrorAlert
      v-if="error"
      :error="error"
      class="mb-6"
    />

    <!-- Search -->
    <div class="mb-6">
      <SearchInput
        v-model="searchQuery"
        placeholder="Search accounts by name, code or number..."
        class="max-w-md"
      />
    </div>

    <!-- Loading state -->
    <div
      v-if="isLoading"
      class="flex justify-center py-12"
    >
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>

    <!-- Content -->
    <div
      v-else
      class="space-y-8"
    >
      <!-- Bank Accounts Section -->
      <section v-if="bankAccounts.length > 0">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          Bank Accounts
        </h2>
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Number
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
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
                v-for="account in filteredBankAccounts"
                :key="account.id"
                class="hover:bg-gray-50 cursor-pointer transition-colors"
                @click="navigateToAccount(account.id)"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      {{ account.name }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ account.code }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ account.accountNumber || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ account.bankAccountType || 'Bank' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                  {{ formatCurrency(account.balance || 0) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    :class="account.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'"
                  >
                    {{ account.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- GL Accounts Section -->
      <section v-if="glAccounts.length > 0">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          General Ledger Accounts
        </h2>
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="account in filteredGLAccounts"
                :key="account.id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      {{ account.name }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ account.code }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ account.type || account.accountType }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ account._class || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    :class="account.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'"
                  >
                    {{ account.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Empty state -->
      <div
        v-if="bankAccounts.length === 0 && glAccounts.length === 0"
        class="text-center py-12"
      >
        <p class="text-gray-500">
          No accounts found. Please sync your data from your accounting provider.
        </p>
      </div>
    </div>
  </div>
</template>