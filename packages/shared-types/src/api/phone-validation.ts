import { z } from 'zod'

// E.164 international phone number format validation
export const phoneSchema = z.string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (+1234567890)')
  .refine(
    (value) => value.length >= 4 && value.length <= 16,
    'Phone number must be between 4 and 16 characters including country code'
  )

// Optional phone schema for fields that might be empty
export const optionalPhoneSchema = z.union([phoneSchema, z.literal('')]).optional()

// Validation helper functions
export const validatePhoneNumber = (phone: string): boolean => {
  return phoneSchema.safeParse(phone).success
}

export const normalizePhoneNumber = (phone: string): string => {
  // Remove any formatting and ensure it starts with +
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}

// Common country codes for validation
export const COUNTRY_CODES = {
  US: '+1',
  UK: '+44',
  AU: '+61',
  CA: '+1',
  DE: '+49',
  FR: '+33',
  JP: '+81',
  IN: '+91',
  CN: '+86',
  BR: '+55',
} as const

export type CountryCode = keyof typeof COUNTRY_CODES