import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWorkspaceStore } from './workspace'
import { trpc, safeTRPCQuery, safeTRPCMutation } from '../lib/trpc'
import type { SyncJob, SyncJobStatus, SyncType } from '@kibly/shared-types'

export interface SyncOptions {
  accountIds?: string[]
  dateFrom?: Date
  dateTo?: Date
  priority?: number
}

export interface TransactionSummary {
  totalCount: number
  syncedCount: number
  errorCount: number
  byStatus: Record<string, number>
  byType: Record<string, number>
  dateRange: {
    from: string
    to: string
  }
}

export interface SyncStatistics {
  totalJobs: number
  successfulJobs: number
  failedJobs: number
  averageProcessingTime: number
  totalRecordsProcessed: number
  jobsByStatus: Record<SyncJobStatus, number>
  recentJobs: SyncJob[]
}

export const useSyncStore = defineStore('sync', () => {
  // State
  const syncJobs = ref<SyncJob[]>([])
  const currentSyncJob = ref<SyncJob | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const statistics = ref<SyncStatistics | null>(null)

  // Dependencies
  const workspaceStore = useWorkspaceStore()

  // Computed
  const canManageSync = computed(() => 
    workspaceStore.hasPermission('providers', 'manageCredentials')
  )

  const runningSyncJobs = computed(() =>
    syncJobs.value.filter(job => job.status === 'running')
  )

  const failedSyncJobs = computed(() =>
    syncJobs.value.filter(job => job.status === 'failed')
  )

  // Actions
  const triggerSync = async (
    integrationId: string, 
    syncType: SyncType = 'incremental', 
    options?: SyncOptions
  ) => {
    if (!canManageSync.value) {
      throw new Error('Insufficient permissions to trigger sync')
    }

    loading.value = true
    error.value = null

    try {
      console.log(`Triggering ${syncType} sync for integration ${integrationId}`, options)
      
      const result = await safeTRPCMutation(
        () => trpc.sync.triggerSync.mutate({
          integrationId,
          syncType,
          priority: options?.priority,
          accountIds: options?.accountIds,
          dateFrom: options?.dateFrom?.toISOString(),
          dateTo: options?.dateTo?.toISOString()
        }),
        `Triggering ${syncType} sync`
      )

      console.log(`✅ ${syncType} sync triggered successfully for integration ${integrationId}`, result)
      
      // Refresh sync jobs list
      await getSyncJobs(integrationId)
      
      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      error.value = errorMessage
      
      // Handle authentication errors
      if (errorMessage.includes('re-authenticate') || 
          errorMessage.includes('token') || 
          errorMessage.includes('authentication') ||
          errorMessage.includes('XERO_TOKEN_REFRESH_FAILED') ||
          errorMessage.includes('XERO_AUTH_MISSING')) {
        
        console.warn(`🔑 Authentication required for integration ${integrationId}:`, errorMessage)
        
        const authError = new Error('Authentication required - please reconnect your integration')
        authError.name = 'AuthenticationRequiredError'
        throw authError
      }
      
      console.error('Failed to trigger sync:', errorMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getSyncJobs = async (integrationId: string, limit = 50, offset = 0) => {
    if (!canManageSync.value) {
      throw new Error('Insufficient permissions to view sync jobs')
    }

    loading.value = true
    error.value = null

    try {
      const jobs = await safeTRPCQuery(
        () => trpc.sync.getIntegrationSyncJobs.query({
          integrationId,
          limit,
          offset
        }),
        'Loading sync jobs'
      )

      // Transform jobs to include missing properties
      syncJobs.value = (jobs as any[]).map(job => ({
        ...job,
        type: job.type || 'manual' // Default type if missing
      })) as SyncJob[]
      return syncJobs.value
    } catch (err) {
      const errorMessage = (err as Error).message
      error.value = errorMessage
      console.error('Failed to get sync jobs:', errorMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getSyncJob = async (syncJobId: string) => {
    if (!canManageSync.value) {
      throw new Error('Insufficient permissions to view sync jobs')
    }

    loading.value = true
    error.value = null

    try {
      const job = await safeTRPCQuery(
        () => trpc.sync.getSyncJob.query({ syncJobId }),
        'Loading sync job'
      )

      // Transform job to include missing properties
      currentSyncJob.value = {
        ...(job as any),
        type: (job as any).type || 'manual' // Default type if missing
      } as SyncJob
      return currentSyncJob.value
    } catch (err) {
      const errorMessage = (err as Error).message
      error.value = errorMessage
      console.error('Failed to get sync job:', errorMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  const cancelSyncJob = async (syncJobId: string) => {
    if (!canManageSync.value) {
      throw new Error('Insufficient permissions to cancel sync jobs')
    }

    loading.value = true
    error.value = null

    try {
      const result = await safeTRPCMutation(
        () => trpc.sync.cancelSyncJob.mutate({ syncJobId }),
        'Cancelling sync job'
      )

      // Update local state
      const job = syncJobs.value.find(j => j.id === syncJobId)
      if (job) {
        job.status = 'cancelled'
      }

      console.log(`✅ Sync job cancelled successfully: ${syncJobId}`)
      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      error.value = errorMessage
      console.error('Failed to cancel sync job:', errorMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  const retrySyncJob = async (syncJobId: string) => {
    if (!canManageSync.value) {
      throw new Error('Insufficient permissions to retry sync jobs')
    }

    loading.value = true
    error.value = null

    try {
      const result = await safeTRPCMutation(
        () => trpc.sync.retrySyncJob.mutate({ syncJobId }),
        'Retrying sync job'
      )

      // Refresh sync jobs
      if (currentSyncJob.value?.integrationId) {
        await getSyncJobs(currentSyncJob.value.integrationId)
      }

      console.log(`✅ Sync job retried successfully: ${syncJobId}`)
      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      error.value = errorMessage
      console.error('Failed to retry sync job:', errorMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getSyncStatistics = async () => {
    if (!canManageSync.value) {
      throw new Error('Insufficient permissions to view sync statistics')
    }

    loading.value = true
    error.value = null

    try {
      const stats = await safeTRPCQuery(
        () => trpc.sync.getSyncStatistics.query(),
        'Loading sync statistics'
      )

      // Transform stats to include missing properties
      const transformedStats = {
        ...(stats as any),
        successfulJobs: (stats as any).successfulJobs || (stats as any).completedJobs || 0,
        averageProcessingTime: (stats as any).averageProcessingTime || 0,
        totalRecordsProcessed: (stats as any).totalRecordsProcessed || 0,
        jobsByStatus: (stats as any).jobsByStatus || {},
        recentJobs: ((stats as any).recentActivity || []).map((job: any) => ({
          ...job,
          type: job.type || 'manual'
        })),
        recentActivity: ((stats as any).recentActivity || []).map((job: any) => ({
          ...job,
          type: job.type || 'manual'
        }))
      } as SyncStatistics
      statistics.value = transformedStats
      return transformedStats
    } catch (err) {
      const errorMessage = (err as Error).message
      error.value = errorMessage
      console.error('Failed to get sync statistics:', errorMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getTransactionSummary = async (
    integrationId: string, 
    dateFrom?: Date, 
    dateTo?: Date
  ): Promise<TransactionSummary> => {
    if (!canManageSync.value) {
      throw new Error('Insufficient permissions to view transaction summary')
    }

    loading.value = true
    error.value = null

    try {
      const summary = await safeTRPCQuery(
        () => trpc.sync.getTransactionSummary.query({
          integrationId,
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString()
        }),
        'Loading transaction summary'
      )

      // Transform summary to include missing properties
      const transformedSummary = {
        ...(summary as any),
        totalCount: (summary as any).totalCount || (summary as any).totalTransactions || 0,
        syncedCount: (summary as any).syncedCount || (summary as any).reconciledCount || 0,
        errorCount: (summary as any).errorCount || 0,
        byStatus: (summary as any).byStatus || {},
        byType: (summary as any).byType || {}
      } as TransactionSummary
      return transformedSummary
    } catch (err) {
      const errorMessage = (err as Error).message
      error.value = errorMessage
      console.error('Failed to get transaction summary:', errorMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearSyncData = () => {
    syncJobs.value = []
    currentSyncJob.value = null
    statistics.value = null
    error.value = null
  }

  const getSyncJobStatusColor = (status: SyncJobStatus): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'running':
        return 'text-blue-600'
      case 'pending':
        return 'text-yellow-600'
      case 'cancelled':
        return 'text-neutral-500'
      default:
        return 'text-neutral-600'
    }
  }

  const getSyncJobStatusIcon = (status: SyncJobStatus): string => {
    switch (status) {
      case 'completed':
        return 'check-circle'
      case 'failed':
        return 'x-circle'
      case 'running':
        return 'arrow-path'
      case 'pending':
        return 'clock'
      case 'cancelled':
        return 'ban'
      default:
        return 'question-mark-circle'
    }
  }

  const formatSyncDuration = (startedAt: string, completedAt?: string): string => {
    const start = new Date(startedAt)
    const end = completedAt ? new Date(completedAt) : new Date()
    const durationMs = end.getTime() - start.getTime()
    
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  return {
    // State
    syncJobs: computed(() => syncJobs.value),
    currentSyncJob: computed(() => currentSyncJob.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    statistics: computed(() => statistics.value),

    // Computed
    canManageSync,
    runningSyncJobs,
    failedSyncJobs,

    // Actions
    triggerSync,
    getSyncJobs,
    getSyncJob,
    cancelSyncJob,
    retrySyncJob,
    getSyncStatistics,
    getTransactionSummary,
    clearSyncData,

    // Utilities
    getSyncJobStatusColor,
    getSyncJobStatusIcon,
    formatSyncDuration
  }
})