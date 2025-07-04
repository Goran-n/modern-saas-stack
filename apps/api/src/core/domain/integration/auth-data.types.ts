import { z } from 'zod'

// Base OAuth2 auth data schema
export const oAuth2AuthDataSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().positive(),
  tokenType: z.string().default('Bearer'),
  scope: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional()
}).strict()

// Xero-specific auth data schema
export const xeroAuthDataSchema = oAuth2AuthDataSchema.extend({
  tenantId: z.string().uuid(),
  tenantName: z.string().optional(),
  tenantType: z.string().optional(),
  idToken: z.string().optional()
}).strict()

// QuickBooks-specific auth data schema
export const quickbooksAuthDataSchema = oAuth2AuthDataSchema.extend({
  companyId: z.string().min(1),
  realmId: z.string().min(1),
  companyName: z.string().optional()
}).strict()

// Sage-specific auth data schema (API key based)
export const sageAuthDataSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
  subscriptionId: z.string().optional(),
  businessId: z.string().optional()
}).strict()

// FreshBooks-specific auth data schema
export const freshbooksAuthDataSchema = oAuth2AuthDataSchema.extend({
  accountId: z.string().min(1),
  businessId: z.string().min(1),
  identityId: z.string().optional()
}).strict()

// Union type for all auth data schemas
export const integrationAuthDataSchema = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('xero'), data: xeroAuthDataSchema }),
  z.object({ provider: z.literal('quickbooks'), data: quickbooksAuthDataSchema }),
  z.object({ provider: z.literal('sage'), data: sageAuthDataSchema }),
  z.object({ provider: z.literal('freshbooks'), data: freshbooksAuthDataSchema })
])

// Type exports
export type OAuth2AuthData = z.infer<typeof oAuth2AuthDataSchema>
export type XeroAuthData = z.infer<typeof xeroAuthDataSchema>
export type QuickBooksAuthData = z.infer<typeof quickbooksAuthDataSchema>
export type SageAuthData = z.infer<typeof sageAuthDataSchema>
export type FreshBooksAuthData = z.infer<typeof freshbooksAuthDataSchema>

export type IntegrationAuthData = 
  | { provider: 'xero'; data: XeroAuthData }
  | { provider: 'quickbooks'; data: QuickBooksAuthData }
  | { provider: 'sage'; data: SageAuthData }
  | { provider: 'freshbooks'; data: FreshBooksAuthData }

// Type guards
export function isXeroAuthData(data: unknown): data is XeroAuthData {
  return xeroAuthDataSchema.safeParse(data).success
}

export function isQuickBooksAuthData(data: unknown): data is QuickBooksAuthData {
  return quickbooksAuthDataSchema.safeParse(data).success
}

export function isSageAuthData(data: unknown): data is SageAuthData {
  return sageAuthDataSchema.safeParse(data).success
}

export function isFreshBooksAuthData(data: unknown): data is FreshBooksAuthData {
  return freshbooksAuthDataSchema.safeParse(data).success
}

// Helper to validate and parse auth data for a specific provider
export function parseAuthData(provider: string, data: unknown): IntegrationAuthData['data'] {
  switch (provider) {
    case 'xero':
      return xeroAuthDataSchema.parse(data)
    case 'quickbooks':
      return quickbooksAuthDataSchema.parse(data)
    case 'sage':
      return sageAuthDataSchema.parse(data)
    case 'freshbooks':
      return freshbooksAuthDataSchema.parse(data)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

// Helper to safely extract auth data with validation
export function extractAuthData<T extends IntegrationAuthData['data']>(
  provider: string,
  authData: Record<string, unknown>
): T {
  const parsed = parseAuthData(provider, authData)
  return parsed as T
}