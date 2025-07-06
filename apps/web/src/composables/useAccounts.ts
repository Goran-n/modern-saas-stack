import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useAccountsStore, type Account } from '@/stores/accounts'

export interface UseAccountsOptions {
  autoLoad?: boolean
  searchQuery?: Ref<string> | string
  filterBankAccounts?: boolean | null
  filterType?: string | null
}

export interface UseAccountsReturn {
  // Data
  accounts: ComputedRef<Account[]>
  filteredAccounts: ComputedRef<Account[]>
  bankAccounts: ComputedRef<Account[]>
  glAccounts: ComputedRef<Account[]>
  totalCount: ComputedRef<number>
  currentAccount: ComputedRef<Account | null>
  
  // State
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  hasAccounts: ComputedRef<boolean>
  
  // Actions
  loadAccounts: (force?: boolean) => Promise<void>
  getAccount: (accountId: string) => Promise<Account | null>
  createAccount: (data: any) => Promise<Account | null>
  updateAccount: (accountId: string, updates: Partial<Account>) => Promise<Account | null>
  deleteAccount: (accountId: string) => Promise<boolean>
  clearError: () => void
  
  // Utilities
  formatCurrency: (amount: number | string | null) => string
  getAccountTypeLabel: (type: string) => string
}

export function useAccounts(options: UseAccountsOptions = {}): UseAccountsReturn {
  const store = useAccountsStore()
  const {
    autoLoad = true,
    searchQuery = '',
    filterBankAccounts = null,
    filterType = null
  } = options
  
  // Convert searchQuery to ref if it's not already
  const searchRef = ref(searchQuery)
  
  // Auto-load accounts if requested
  if (autoLoad && !store.initialized) {
    store.loadAccounts()
  }
  
  // Computed filtered accounts based on search and filters
  const filteredAccounts = computed(() => {
    let results = store.accounts
    
    // Apply search
    const query = searchRef.value
    if (query && query.trim()) {
      results = store.searchAccounts(query)
    }
    
    // Apply bank account filter
    if (filterBankAccounts !== null) {
      results = results.filter(acc => acc.isBankAccount === filterBankAccounts)
    }
    
    // Apply type filter
    if (filterType) {
      results = results.filter(acc => acc.accountType === filterType)
    }
    
    return results
  })
  
  // Currency formatter
  const formatCurrency = (amount: number | string | null): string => {
    if (!amount) return '£0.00'
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: 'GBP' 
    }).format(num)
  }
  
  // Account type labels
  const accountTypeLabels: Record<string, string> = {
    'ASSET': 'Asset',
    'LIABILITY': 'Liability',
    'EQUITY': 'Equity',
    'REVENUE': 'Revenue',
    'EXPENSE': 'Expense',
    'BANK': 'Bank Account',
    'CASH': 'Cash',
    'CURRENT_ASSET': 'Current Asset',
    'FIXED_ASSET': 'Fixed Asset',
    'CURRENT_LIABILITY': 'Current Liability',
    'LONG_TERM_LIABILITY': 'Long Term Liability'
  }
  
  const getAccountTypeLabel = (type: string): string => {
    return accountTypeLabels[type] || type
  }
  
  return {
    // Data
    accounts: computed(() => store.accounts),
    filteredAccounts,
    bankAccounts: computed(() => store.bankAccounts),
    glAccounts: computed(() => store.glAccounts),
    totalCount: computed(() => store.totalCount),
    currentAccount: computed(() => store.currentAccount),
    
    // State
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    hasAccounts: computed(() => store.hasAccounts),
    
    // Actions
    loadAccounts: store.loadAccounts,
    getAccount: store.getAccount,
    createAccount: store.createAccount,
    updateAccount: store.updateAccount,
    deleteAccount: store.deleteAccount,
    clearError: store.clearError,
    
    // Utilities
    formatCurrency,
    getAccountTypeLabel
  }
}

/**
 * Composable for single account operations
 */
export function useAccount(accountId: string | Ref<string>) {
  const store = useAccountsStore()
  const accountIdRef = ref(accountId)
  
  // Load account when ID changes
  watch(accountIdRef, async (newId) => {
    if (newId) {
      await store.getAccount(newId)
    }
  }, { immediate: true })
  
  const updateAccount = async (updates: Partial<Account>) => {
    const id = typeof accountIdRef.value === 'string' ? accountIdRef.value : accountIdRef.value
    return store.updateAccount(id, updates)
  }
  
  const deleteAccount = async () => {
    const id = typeof accountIdRef.value === 'string' ? accountIdRef.value : accountIdRef.value
    return store.deleteAccount(id)
  }
  
  return {
    account: computed(() => store.currentAccount),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    updateAccount,
    deleteAccount
  }
}