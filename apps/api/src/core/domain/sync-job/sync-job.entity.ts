import { z } from 'zod'

export const syncJobStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled'])
export type SyncJobStatus = z.infer<typeof syncJobStatusSchema>

export const syncJobTypeSchema = z.enum(['full', 'incremental', 'manual', 'webhook'])
export type SyncJobType = z.infer<typeof syncJobTypeSchema>

export const syncJobResultSchema = z.object({
  transactionsImported: z.number().default(0),
  transactionsUpdated: z.number().default(0),
  transactionsSkipped: z.number().default(0),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
}).strict()

export type SyncJobResult = z.infer<typeof syncJobResultSchema>

export interface SyncJobEntityProps {
  id: string
  integrationId: string
  tenantId: string
  jobType: SyncJobType
  status: SyncJobStatus
  priority: number
  progress: number
  result: SyncJobResult | null
  error: string | null
  startedAt: Date | null
  completedAt: Date | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export class SyncJobEntity {
  private constructor(private props: SyncJobEntityProps) {}

  static create(props: Omit<SyncJobEntityProps, 'id' | 'status' | 'progress' | 'result' | 'error' | 'startedAt' | 'completedAt' | 'createdAt' | 'updatedAt'>): SyncJobEntity {
    const now = new Date()
    return new SyncJobEntity({
      ...props,
      id: crypto.randomUUID(),
      status: 'pending',
      progress: 0,
      result: null,
      error: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static fromDatabase(props: SyncJobEntityProps): SyncJobEntity {
    return new SyncJobEntity(props)
  }

  get id(): string { return this.props.id }
  get integrationId(): string { return this.props.integrationId }
  get tenantId(): string { return this.props.tenantId }
  get jobType(): SyncJobType { return this.props.jobType }
  get status(): SyncJobStatus { return this.props.status }
  get priority(): number { return this.props.priority }
  get progress(): number { return this.props.progress }
  get result(): SyncJobResult | null { return this.props.result }
  get error(): string | null { return this.props.error }
  get startedAt(): Date | null { return this.props.startedAt }
  get completedAt(): Date | null { return this.props.completedAt }
  get metadata(): Record<string, unknown> { return this.props.metadata }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  isPending(): boolean {
    return this.props.status === 'pending'
  }

  isRunning(): boolean {
    return this.props.status === 'running'
  }

  isCompleted(): boolean {
    return this.props.status === 'completed'
  }

  isFailed(): boolean {
    return this.props.status === 'failed'
  }

  isCancelled(): boolean {
    return this.props.status === 'cancelled'
  }

  isFinished(): boolean {
    return this.isCompleted() || this.isFailed() || this.isCancelled()
  }

  start(): void {
    if (!this.isPending()) {
      throw new Error(`Cannot start job in ${this.props.status} status`)
    }
    
    this.props.status = 'running'
    this.props.startedAt = new Date()
    this.touch()
  }

  restart(): void {
    // Allow restarting failed or cancelled jobs
    if (this.isFailed() || this.isCancelled()) {
      this.props.status = 'pending'
      this.props.startedAt = null
      this.props.completedAt = null
      this.props.error = null
      this.props.progress = 0
      this.touch()
    } else if (this.isPending()) {
      // Already pending, just start
      this.start()
    } else {
      throw new Error(`Cannot restart job in ${this.props.status} status`)
    }
  }

  updateProgress(progress: number): void {
    if (!this.isRunning()) {
      throw new Error(`Cannot update progress for job in ${this.props.status} status`)
    }
    
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100')
    }
    
    this.props.progress = progress
    this.touch()
  }

  complete(result: SyncJobResult): void {
    if (!this.isRunning()) {
      throw new Error(`Cannot complete job in ${this.props.status} status`)
    }
    
    this.props.status = 'completed'
    this.props.progress = 100
    this.props.result = result
    this.props.error = null
    this.props.completedAt = new Date()
    this.touch()
  }

  fail(error: string): void {
    if (this.isFinished()) {
      throw new Error(`Cannot fail job in ${this.props.status} status`)
    }
    
    this.props.status = 'failed'
    this.props.error = error
    this.props.completedAt = new Date()
    this.touch()
  }

  cancel(): void {
    if (this.isFinished()) {
      throw new Error(`Cannot cancel job in ${this.props.status} status`)
    }
    
    this.props.status = 'cancelled'
    this.props.completedAt = new Date()
    this.touch()
  }

  updateMetadata(metadata: Record<string, unknown>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata }
    this.touch()
  }

  getDuration(): number | null {
    if (!this.props.startedAt) return null
    
    const endTime = this.props.completedAt || new Date()
    return endTime.getTime() - this.props.startedAt.getTime()
  }

  getSuccessRate(): number {
    if (!this.props.result) return 0
    
    const total = this.props.result.transactionsImported + 
                  this.props.result.transactionsUpdated + 
                  this.props.result.transactionsSkipped
    
    if (total === 0) return 100
    
    const successful = this.props.result.transactionsImported + this.props.result.transactionsUpdated
    return Math.round((successful / total) * 100)
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }

  toDatabase(): SyncJobEntityProps {
    return { ...this.props }
  }

  toPublic(): Omit<SyncJobEntityProps, 'tenantId'> {
    const { tenantId: _tenantId, ...publicProps } = this.props
    return {
      ...publicProps,
      duration: this.getDuration(),
      successRate: this.getSuccessRate(),
    } as any
  }
}