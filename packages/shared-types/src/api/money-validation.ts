import { z } from 'zod'

// Custom Zod schema for money amounts that validates proper format
export const moneyAmountSchema = z.string()
  .regex(/^\d+(\.\d{2})?$/, 'Money amount must be in format: 123.45')
  .refine(
    (value) => {
      const num = parseFloat(value)
      return num >= 0 && num <= 999999999.99
    },
    'Money amount must be between 0 and 999,999,999.99'
  )

export const currencyCodeSchema = z.string()
  .length(3, 'Currency code must be exactly 3 characters')
  .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters (e.g., USD, EUR)')

// Combined money schema for objects that have both amount and currency
export const moneySchema = z.object({
  amount: moneyAmountSchema,
  currency: currencyCodeSchema,
})

// Helper type for TypeScript
export type MoneyInput = z.infer<typeof moneySchema>

// Validation helper functions
export const validateMoneyAmount = (amount: string): boolean => {
  return moneyAmountSchema.safeParse(amount).success
}

export const validateCurrencyCode = (currency: string): boolean => {
  return currencyCodeSchema.safeParse(currency).success
}

// Common currency codes for validation
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'NZD', 'INR'
] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

export const supportedCurrencySchema = z.enum(SUPPORTED_CURRENCIES)