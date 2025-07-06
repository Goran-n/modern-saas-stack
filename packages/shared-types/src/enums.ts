/**
 * Common enums used across the application
 */

// User enums
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

// Tenant enums
export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

export enum TenantPlan {
  TRIAL = 'trial',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

// Member roles and permissions
export enum MemberRole {
  VIEWER = 'viewer',
  MEMBER = 'member',
  ADMIN = 'admin',
  OWNER = 'owner'
}

// User roles (alias for MemberRole for backward compatibility)
export { MemberRole as UserRole }

// Integration enums
export enum IntegrationProvider {
  XERO = 'xero',
  QUICKBOOKS = 'quickbooks',
  SAGE = 'sage',
  MYOB = 'myob'
}

export enum IntegrationType {
  ACCOUNTING = 'accounting',
  FILE_STORAGE = 'file_storage',
  COMMUNICATION = 'communication',
  BANKING = 'banking'
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  PENDING = 'pending',
  SETUP_PENDING = 'setup_pending',
  DISABLED = 'disabled'
}

// Sync enums
export enum SyncType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  MANUAL = 'manual',
  WEBHOOK = 'webhook'
}

export enum SyncJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum SyncFrequency {
  REALTIME = 'realtime',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

// Conversation enums
export enum ChannelType {
  WHATSAPP = 'whatsapp',
  SLACK = 'slack',
  TEAMS = 'teams',
  EMAIL = 'email',
  SMS = 'sms',
  TELEGRAM = 'telegram'
}

export enum ChannelStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed',
  SUSPENDED = 'suspended'
}

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  CLOSED = 'closed'
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  VOICE = 'voice',
  VIDEO = 'video',
  LOCATION = 'location',
  CONTACT = 'contact',
  SYSTEM = 'system',
  MEDIA = 'media'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

// Financial enums
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

export enum TransactionStatus {
  PENDING = 'pending',
  CLEARED = 'cleared',
  RECONCILED = 'reconciled',
  VOIDED = 'voided'
}

export enum InvoiceType {
  BILL = 'bill',
  INVOICE = 'invoice',
  CREDIT_NOTE = 'credit_note',
  DEBIT_NOTE = 'debit_note'
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  PAID = 'paid',
  VOID = 'void',
  DELETED = 'deleted'
}

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

// File enums
export enum FileStatus {
  PENDING = 'pending',
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  DELETED = 'deleted'
}

export enum FileVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  PROTECTED = 'protected'
}

// Error severity
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}