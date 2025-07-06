export interface UserDatabaseRow {
  id: string
  name: string
  email: string
  phone: string | null
  preferences: unknown // Will be cast to UserPreferences
  email_verified: boolean
  phone_verified: boolean
  last_login_at: Date | null
  created_at: Date
  updated_at: Date
}