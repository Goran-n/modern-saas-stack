import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { trpc, safeTRPCQuery } from '@/lib/trpc'
import { getErrorMessage } from '@/utils/error'

// TODO: Move to shared-types when available
export interface Account {
  id: string
  code: string
  name: string
  accountType: string
  isBankAccount: boolean | null
  accountNumber?: string | null
  bankName?: string | null
  currency?: string | null
  balance?: number | null
  description?: string | null
  isActive: boolean | null
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any> | null
  // Additional fields from API
  type?: string
  _class?: string
  bankAccountType?: string
}

export interface AccountsData {
  accounts: Account[]
  count: number
}

export const useAccountsStore = defineStore('accounts', () => {
  // State
  const accounts = ref<Account[]>([])
  const totalCount = ref(0)
  const currentAccount = ref<Account | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)
  
  // Computed
  const hasAccounts = computed(() => accounts.value.length > 0)
  
  const bankAccounts = computed(() => 
    accounts.value.filter(acc => acc.isBankAccount === true)
  )
  
  const glAccounts = computed(() => 
    accounts.value.filter(acc => acc.isBankAccount === false || acc.isBankAccount === null)
  )
  
  const accountsByType = computed(() => {
    const grouped = new Map<string, Account[]>()
    
    accounts.value.forEach(account => {
      const type = account.accountType || 'Other'
      if (!grouped.has(type)) {
        grouped.set(type, [])
      }
      grouped.get(type)!.push(account)
    })
    
    return grouped
  })
  
  // Actions
  async function loadAccounts(force = false): Promise<void> {
    if (initialized.value && !force) {
      return
    }
    
    loading.value = true
    error.value = null
    
    try {
      const data = await safeTRPCQuery<any>(
        () => trpc.account.list.query(),
        'Loading accounts'
      ) as AccountsData | undefined
      
      if (data) {
        // The transform should have converted dates, but just in case
        accounts.value = data.accounts.map(acc => ({
          ...acc,
          createdAt: acc.createdAt instanceof Date ? acc.createdAt : new Date(acc.createdAt),
          updatedAt: acc.updatedAt instanceof Date ? acc.updatedAt : new Date(acc.updatedAt)
        }))
        totalCount.value = data.count
        initialized.value = true
      }
    } catch (err) {
      error.value = getErrorMessage(err)
      console.error('Failed to load accounts:', err)
    } finally {
      loading.value = false
    }
  }
  
  async function getAccount(accountId: string): Promise<Account | null> {
    // First check if we have it locally
    const localAccount = accounts.value.find(acc => acc.id === accountId)
    if (localAccount) {
      currentAccount.value = localAccount
      return localAccount
    }
    
    // Otherwise fetch from server
    loading.value = true
    error.value = null
    
    try {
      const account = await safeTRPCQuery<any>(
        () => trpc.account.get.query({ id: accountId }),
        'Loading account'
      ) as Account | undefined
      
      if (account) {
        // Ensure dates are Date objects
        const processedAccount = {
          ...account,
          createdAt: account.createdAt instanceof Date ? account.createdAt : new Date(account.createdAt),
          updatedAt: account.updatedAt instanceof Date ? account.updatedAt : new Date(account.updatedAt)
        }
        currentAccount.value = processedAccount
        // Add to local cache if not exists
        const index = accounts.value.findIndex(acc => acc.id === accountId)
        if (index === -1) {
          accounts.value.push(processedAccount)
        } else {
          accounts.value[index] = processedAccount
        }
      }
      
      return account || null
    } catch (err) {
      error.value = getErrorMessage(err)
      console.error('Failed to get account:', err)
      return null
    } finally {
      loading.value = false
    }
  }
  
  async function createAccount(data: {
    name: string
    code?: string
    accountType: string
    isBankAccount: boolean
    accountNumber?: string
    bankName?: string
    currency?: string
  }): Promise<Account | null> {
    // TODO: Implement when API endpoint is available
    console.warn('createAccount not implemented yet')
    return null
  }
  
  async function updateAccount(
    accountId: string,
    updates: Partial<Account>
  ): Promise<Account | null> {
    // TODO: Implement when API endpoint is available
    console.warn('updateAccount not implemented yet')
    return null
  }
  
  async function deleteAccount(accountId: string): Promise<boolean> {
    // TODO: Implement when API endpoint is available
    console.warn('deleteAccount not implemented yet')
    return false
  }
  
  // Search/filter functions
  function searchAccounts(query: string): Account[] {
    if (!query.trim()) return accounts.value
    
    const lowerQuery = query.toLowerCase()
    return accounts.value.filter(account => 
      account.name.toLowerCase().includes(lowerQuery) ||
      account.code?.toLowerCase().includes(lowerQuery) ||
      account.accountNumber?.toLowerCase().includes(lowerQuery)
    )
  }
  
  function filterByType(type: string): Account[] {
    return accounts.value.filter(account => account.accountType === type)
  }
  
  function filterBankAccounts(isBankAccount: boolean): Account[] {
    if (isBankAccount) {
      return accounts.value.filter(account => account.isBankAccount === true)
    } else {
      return accounts.value.filter(account => account.isBankAccount === false || account.isBankAccount === null)
    }
  }
  
  // Clear functions
  function clearError(): void {
    error.value = null
  }
  
  function clearAccountData(): void {
    accounts.value = []
    totalCount.value = 0
    currentAccount.value = null
    error.value = null
    initialized.value = false
  }
  
  return {
    // State
    accounts: computed(() => accounts.value),
    totalCount: computed(() => totalCount.value),
    currentAccount: computed(() => currentAccount.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    initialized: computed(() => initialized.value),
    
    // Computed
    hasAccounts,
    bankAccounts,
    glAccounts,
    accountsByType,
    
    // Actions
    loadAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    
    // Search/filter
    searchAccounts,
    filterByType,
    filterBankAccounts,
    
    // Utilities
    clearError,
    clearAccountData
  }
})