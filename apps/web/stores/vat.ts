import { defineStore } from 'pinia'
import type { VatPeriod, VatPeriodConfig, VatPeriodConflict } from '@figgy/vat'

export const useVatStore = defineStore('vat', () => {
  // State
  const configuration = ref<VatPeriodConfig | null>(null)
  const periods = ref<VatPeriod[]>([])
  const conflicts = ref<VatPeriodConflict[]>([])
  const hmrcConnected = ref(false)
  const hmrcLastSync = ref<Date | null>(null)
  const loading = ref(false)
  const syncing = ref(false)

  // Getters
  const hasConfiguration = computed(() => !!configuration.value)
  
  const upcomingPeriods = computed(() => 
    periods.value.filter(p => p.status === 'upcoming')
  )
  
  const currentPeriod = computed(() => 
    periods.value.find(p => p.status === 'current')
  )
  
  const overduePeriods = computed(() => 
    periods.value.filter(p => p.status === 'overdue')
  )
  
  const submittedPeriods = computed(() => 
    periods.value.filter(p => p.status === 'submitted' || p.status === 'paid')
  )
  
  const hasConflicts = computed(() => conflicts.value.length > 0)
  
  const isManualSetup = computed(() => 
    hasConfiguration.value && !hmrcConnected.value
  )

  // Actions
  function setConfiguration(config: VatPeriodConfig) {
    configuration.value = config
  }

  function setPeriods(newPeriods: VatPeriod[]) {
    periods.value = newPeriods
  }

  function addPeriod(period: VatPeriod) {
    periods.value.push(period)
  }

  function updatePeriod(periodId: string, updates: Partial<VatPeriod>) {
    const index = periods.value.findIndex(p => p.id === periodId)
    if (index !== -1) {
      periods.value[index] = { ...periods.value[index], ...updates } as VatPeriod
    }
  }

  function removePeriod(periodId: string) {
    periods.value = periods.value.filter(p => p.id !== periodId)
  }

  function setConflicts(newConflicts: VatPeriodConflict[]) {
    conflicts.value = newConflicts
  }

  function clearConflicts() {
    conflicts.value = []
  }

  function setHmrcConnection(connected: boolean, lastSync?: Date) {
    hmrcConnected.value = connected
    if (lastSync) {
      hmrcLastSync.value = lastSync
    }
  }

  function setLoading(isLoading: boolean) {
    loading.value = isLoading
  }

  function setSyncing(isSyncing: boolean) {
    syncing.value = isSyncing
  }

  function $reset() {
    configuration.value = null
    periods.value = []
    conflicts.value = []
    hmrcConnected.value = false
    hmrcLastSync.value = null
    loading.value = false
    syncing.value = false
  }

  // Persist configuration to localStorage
  function saveConfiguration() {
    if (configuration.value) {
      try {
        localStorage.setItem('vat-configuration', JSON.stringify(configuration.value))
      } catch (e) {
        // Silent fail
      }
    }
  }

  function loadConfiguration() {
    try {
      const saved = localStorage.getItem('vat-configuration')
      if (saved) {
        configuration.value = JSON.parse(saved)
      }
    } catch (e) {
      // Silent fail
    }
  }

  // Watch configuration changes
  watch(configuration, saveConfiguration, { deep: true })

  // Load on mount
  onMounted(loadConfiguration)

  return {
    // State
    configuration: readonly(configuration),
    periods: readonly(periods),
    conflicts: readonly(conflicts),
    hmrcConnected: readonly(hmrcConnected),
    hmrcLastSync: readonly(hmrcLastSync),
    loading: readonly(loading),
    syncing: readonly(syncing),
    
    // Getters
    hasConfiguration,
    upcomingPeriods,
    currentPeriod,
    overduePeriods,
    submittedPeriods,
    hasConflicts,
    isManualSetup,
    
    // Actions
    setConfiguration,
    setPeriods,
    addPeriod,
    updatePeriod,
    removePeriod,
    setConflicts,
    clearConflicts,
    setHmrcConnection,
    setLoading,
    setSyncing,
    $reset,
  }
})