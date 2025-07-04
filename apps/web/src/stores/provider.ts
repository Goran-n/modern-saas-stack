import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IntegrationProvider, IntegrationType } from '@kibly/shared-types'

export interface SupportedProvider {
  provider: IntegrationProvider
  type: IntegrationType
  name: string
  description: string
  logoUrl: string
  capabilities: {
    read: string[]
    write: string[]
    webhook: boolean
    realtime: boolean
    fileUpload: boolean
    batchOperations: boolean
  }
  isAvailable: boolean
  features?: string[]
  limitations?: string[]
}

export const useProviderStore = defineStore('provider', () => {
  // State
  const supportedProviders = ref<SupportedProvider[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Hardcoded provider data (since we only support Xero currently)
  const providerData: Record<IntegrationProvider, SupportedProvider> = {
    xero: {
      provider: 'xero',
      type: 'accounting',
      name: 'Xero',
      description: 'Connect your Xero accounting software to sync transactions, contacts, and invoices.',
      logoUrl: '/images/providers/xero.svg',
      capabilities: {
        read: ['transactions', 'contacts', 'invoices', 'accounts', 'bankStatements', 'items', 'payments'],
        write: ['contacts', 'invoices', 'items'],
        webhook: true,
        realtime: true,
        fileUpload: true,
        batchOperations: true
      },
      isAvailable: true,
      features: [
        'Real-time synchronisation',
        'Two-way sync for contacts and invoices',
        'Bank transaction reconciliation',
        'Multi-currency support',
        'Attachment support',
        'Webhook notifications'
      ],
      limitations: [
        'API rate limits apply',
        'Historical data limited to 2 years',
        'Some fields are read-only'
      ]
    }
  }

  // Computed
  const availableProviders = computed(() => 
    supportedProviders.value.filter(p => p.isAvailable)
  )

  const providersByType = computed(() => {
    const grouped: Record<IntegrationType, SupportedProvider[]> = {
      accounting: []
    }

    supportedProviders.value.forEach(provider => {
      if (provider.type === 'accounting') {
        grouped[provider.type].push(provider)
      }
    })

    return grouped
  })

  // Actions
  const loadSupportedProviders = async () => {
    loading.value = true
    error.value = null

    try {
      // For now, we're hardcoding Xero as the only provider
      // In the future, this could fetch from an API
      supportedProviders.value = [providerData.xero]
      
      console.log('Loaded supported providers:', supportedProviders.value.length)
    } catch (err) {
      error.value = (err as Error).message
      console.error('Failed to load supported providers:', err)
    } finally {
      loading.value = false
    }
  }

  const getProvider = (providerId: IntegrationProvider): SupportedProvider | undefined => {
    return supportedProviders.value.find(p => p.provider === providerId)
  }

  const getProviderCapabilities = (providerId: IntegrationProvider) => {
    const provider = getProvider(providerId)
    return provider?.capabilities || {
      read: [],
      write: [],
      webhook: false,
      realtime: false,
      fileUpload: false,
      batchOperations: false
    }
  }

  const canProviderRead = (providerId: IntegrationProvider, resource: string): boolean => {
    const capabilities = getProviderCapabilities(providerId)
    return capabilities.read.includes(resource)
  }

  const canProviderWrite = (providerId: IntegrationProvider, resource: string): boolean => {
    const capabilities = getProviderCapabilities(providerId)
    return capabilities.write.includes(resource)
  }

  const getProviderLogo = (providerId: IntegrationProvider): string => {
    const provider = getProvider(providerId)
    return provider?.logoUrl || '/images/providers/default.svg'
  }

  const getProviderName = (providerId: IntegrationProvider): string => {
    const provider = getProvider(providerId)
    return provider?.name || providerId
  }

  const getProviderDescription = (providerId: IntegrationProvider): string => {
    const provider = getProvider(providerId)
    return provider?.description || ''
  }

  const isProviderAvailable = (providerId: IntegrationProvider): boolean => {
    const provider = getProvider(providerId)
    return provider?.isAvailable || false
  }

  const clearProviderData = () => {
    supportedProviders.value = []
    error.value = null
  }

  return {
    // State
    supportedProviders: computed(() => supportedProviders.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),

    // Computed
    availableProviders,
    providersByType,

    // Actions
    loadSupportedProviders,
    getProvider,
    getProviderCapabilities,
    canProviderRead,
    canProviderWrite,
    getProviderLogo,
    getProviderName,
    getProviderDescription,
    isProviderAvailable,
    clearProviderData
  }
})