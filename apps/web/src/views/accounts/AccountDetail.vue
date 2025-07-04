<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { trpc } from '@/lib/trpc'
import BaseButton from '@/components/ui/BaseButton.vue'
import ErrorAlert from '@/components/ui/ErrorAlert.vue'

const route = useRoute()
const router = useRouter()

const accountId = computed(() => route.params.id as string)
const activeTab = ref<'transactions' | 'bankFeed'>('bankFeed')

// State
const accountData = ref<any>(null)
const accountLoading = ref(true)
const accountError = ref<Error | null>(null)

const bankFeedData = ref<any>(null)
const bankFeedLoading = ref(false)
const bankFeedError = ref<Error | null>(null)

const transactionsData = ref<any>(null)
const transactionsLoading = ref(false)
const transactionsError = ref<Error | null>(null)

const unreconciledData = ref<any>(null)

// Fetch account details
const fetchAccount = async () => {
  try {
    accountLoading.value = true
    accountError.value = null
    accountData.value = await trpc.account.get.query({ id: accountId.value })
  } catch (err) {
    accountError.value = err as Error
    console.error('Failed to fetch account:', err)
  } finally {
    accountLoading.value = false
  }
}

// Fetch bank statements
const fetchBankFeed = async () => {
  if (!accountData.value?.isBankAccount || !accountData.value?.accountIdentifier) return
  
  try {
    bankFeedLoading.value = true
    bankFeedError.value = null
    bankFeedData.value = await trpc.bankFeed.listByAccount.query({
      accountIdentifier: accountData.value.accountIdentifier || accountData.value.code || '',
      limit: 100,
      offset: 0
    })
    
    // Also fetch unreconciled count
    unreconciledData.value = await trpc.bankFeed.getUnreconciledCount.query({
      accountIdentifier: accountData.value.accountIdentifier || accountData.value.code || ''
    })
  } catch (err) {
    bankFeedError.value = err as Error
    console.error('Failed to fetch bank feed:', err)
  } finally {
    bankFeedLoading.value = false
  }
}

// Fetch transactions
const fetchTransactions = async () => {
  try {
    transactionsLoading.value = true
    transactionsError.value = null
    transactionsData.value = await trpc.transaction.listByAccount.query({
      accountId: accountId.value,
      limit: 100,
      offset: 0
    })
  } catch (err) {
    transactionsError.value = err as Error
    console.error('Failed to fetch transactions:', err)
  } finally {
    transactionsLoading.value = false
  }
}

// Computed properties
const account = computed(() => accountData.value)
const bankStatements = computed(() => bankFeedData.value?.statements || [])
const transactions = computed(() => transactionsData.value?.transactions || [])
const unreconciledCount = computed(() => unreconciledData.value?.count || 0)

const isLoading = computed(() => {
  if (activeTab.value === 'bankFeed') {
    return accountLoading.value || bankFeedLoading.value
  }
  return accountLoading.value || transactionsLoading.value
})

const error = computed(() => {
  if (activeTab.value === 'bankFeed') {
    return accountError.value || bankFeedError.value
  }
  return accountError.value || transactionsError.value
})

// Initialize data
onMounted(async () => {
  await fetchAccount()
  
  // Once account is loaded, fetch related data
  if (accountData.value) {
    if (accountData.value.isBankAccount) {
      await fetchBankFeed()
    }
    await fetchTransactions()
  }
})

// Watch for tab changes to load data if needed
watch(activeTab, (newTab) => {
  if (newTab === 'transactions' && !transactionsData.value && accountData.value) {
    fetchTransactions()
  } else if (newTab === 'bankFeed' && !bankFeedData.value && accountData.value?.isBankAccount) {
    fetchBankFeed()
  }
})

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

// Navigation
const navigateBack = () => {
  router.push('/accounts')
}
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
        <h1 class="text-3xl font-bold text-gray-900">{{ account?.name || 'Loading...' }}</h1>
      </div>
      
      <div v-if="account" class="flex items-center gap-6 text-sm text-gray-600">
        <div>
          <span class="font-medium">Code:</span>
          <span class="ml-1">{{ account.code }}</span>
        </div>
        <div v-if="account.accountNumber">
          <span class="font-medium">Account Number:</span>
          <span class="ml-1">{{ account.accountNumber }}</span>
        </div>
        <div v-if="account.balance">
          <span class="font-medium">Balance:</span>
          <span class="ml-1 font-semibold">{{ formatCurrency(account.balance) }}</span>
        </div>
        <div>
          <span
            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
            :class="account.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'"
          >
            {{ account.isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <ErrorAlert v-if="error" :error="error" class="mb-6" />

    <!-- Tabs (only for bank accounts) -->
    <div v-if="account?.isBankAccount" class="mb-6">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            @click="activeTab = 'bankFeed'"
            class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
            :class="activeTab === 'bankFeed' 
              ? 'border-primary-500 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Bank Feed
            <span v-if="unreconciledCount > 0" class="ml-2 bg-red-100 text-red-800 py-0.5 px-2 rounded-full text-xs">
              {{ unreconciledCount }}
            </span>
          </button>
          <button
            @click="activeTab = 'transactions'"
            class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
            :class="activeTab === 'transactions' 
              ? 'border-primary-500 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Transactions
          </button>
        </nav>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Bank Feed Tab -->
      <div v-if="account?.isBankAccount && activeTab === 'bankFeed'" class="bg-white rounded-lg shadow overflow-hidden">
        <div v-if="bankStatements.length === 0" class="p-8 text-center text-gray-500">
          No bank statements found for this account.
        </div>
        <table v-else class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="statement in bankStatements" :key="statement.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDate(statement.transactionDate) }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">
                <div>{{ statement.description }}</div>
                <div v-if="statement.merchantName" class="text-xs text-gray-500 mt-1">
                  {{ statement.merchantName }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium"
                  :class="parseFloat(statement.amount) < 0 ? 'text-red-600' : 'text-green-600'">
                {{ formatCurrency(statement.amount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="statement.isReconciled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'"
                >
                  {{ statement.isReconciled ? 'Reconciled' : 'Unreconciled' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Transactions Tab -->
      <div v-if="!account?.isBankAccount || activeTab === 'transactions'" class="bg-white rounded-lg shadow overflow-hidden">
        <div v-if="transactions.length === 0" class="p-8 text-center text-gray-500">
          No transactions found for this account.
        </div>
        <table v-else class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="transaction in transactions" :key="transaction.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDate(transaction.transactionDate) }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">
                <div>{{ transaction.rawDescription || transaction.enrichedDescription || '-' }}</div>
                <div v-if="transaction.supplierName" class="text-xs text-gray-500 mt-1">
                  {{ transaction.supplierName }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ transaction.transactionReference || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium"
                  :class="parseFloat(transaction.amount) < 0 ? 'text-red-600' : 'text-green-600'">
                {{ formatCurrency(transaction.amount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="{
                    'bg-green-100 text-green-800': transaction.isReconciled,
                    'bg-blue-100 text-blue-800': transaction.status === 'cleared' && !transaction.isReconciled,
                    'bg-yellow-100 text-yellow-800': transaction.status === 'pending',
                    'bg-gray-100 text-gray-800': transaction.status === 'void'
                  }"
                >
                  {{ transaction.isReconciled ? 'Reconciled' : transaction.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>