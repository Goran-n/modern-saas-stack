import { pgTable, uuid, varchar, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Core user information
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }),
  
  // Preferences and settings
  preferences: jsonb('preferences').default('{}').notNull(),
  
  // Verification status
  emailVerified: boolean('email_verified').default(false).notNull(),
  phoneVerified: boolean('phone_verified').default(false).notNull(),
  
  // Activity tracking
  lastLoginAt: timestamp('last_login_at'),
  
  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// User preferences structure
export interface UserPreferences {
  // Notification preferences
  notifications?: {
    email?: boolean
    sms?: boolean
    push?: boolean
    marketing?: boolean
  }
  
  // UI preferences
  ui?: {
    theme?: 'light' | 'dark' | 'auto'
    language?: string
    timezone?: string
  }
  
  // Feature preferences
  features?: {
    betaFeatures?: boolean
    analytics?: boolean
  }
}