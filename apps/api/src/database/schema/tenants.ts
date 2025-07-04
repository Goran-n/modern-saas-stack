import { pgTable, uuid, varchar, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'suspended', 'deleted'])

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Core tenant information
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  
  // Status management
  status: tenantStatusEnum('status').default('active').notNull(),
  
  // Flexible configuration
  settings: jsonb('settings').default('{}').notNull(),
  subscription: jsonb('subscription').default('{}').notNull(),
  metadata: jsonb('metadata').default('{}').notNull(),
  
  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert

// Default tenant settings structure
export interface TenantSettings {
  // API and processing limits
  api?: {
    monthlyFileLimit?: number
    maxFileSize?: number
    retentionDays?: number
  }
  
  // Feature flags
  features?: {
    autoMatching?: boolean
    llmDecisionMaking?: boolean
    multiCurrency?: boolean
    advancedAnalytics?: boolean
  }
  
  // Security settings
  security?: {
    requireMfa?: boolean
    sessionTimeout?: number
    allowedIpRanges?: string[]
  }
  
  // Notification preferences
  notifications?: {
    email?: boolean
    webhook?: string
    processingSummary?: boolean
    errorAlerts?: boolean
  }
  
  // UI preferences
  ui?: {
    theme?: 'light' | 'dark' | 'auto'
    currency?: string
    dateFormat?: string
    timezone?: string
  }
}

// Subscription information
export interface TenantSubscription {
  plan?: 'free' | 'starter' | 'professional' | 'enterprise'
  status?: 'active' | 'trialing' | 'past_due' | 'canceled'
  billingCycle?: 'monthly' | 'yearly'
  nextBillingDate?: string
  usage?: {
    filesProcessed?: number
    apiCalls?: number
    storageUsed?: number
  }
  limits?: {
    maxFiles?: number
    maxApiCalls?: number
    maxStorage?: number
  }
}

// Additional metadata
export interface TenantMetadata {
  // Company information
  company?: {
    registrationNumber?: string
    vatNumber?: string
    address?: {
      line1?: string
      line2?: string
      city?: string
      state?: string
      postalCode?: string
      country?: string
    }
    industry?: string
    size?: string
  }
  
  // Contact information
  contacts?: {
    billing?: {
      name?: string
      email?: string
      phone?: string
    }
    technical?: {
      name?: string
      email?: string
      phone?: string
    }
  }
  
  // Integration preferences
  integrations?: {
    preferredProvider?: string
    webhookSettings?: {
      url?: string
      secret?: string
    }
  }
  
  // Onboarding tracking
  onboarding?: {
    completed?: boolean
    currentStep?: string
    completedSteps?: string[]
    skippedSteps?: string[]
  }
}