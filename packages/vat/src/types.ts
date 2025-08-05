import { z } from 'zod';

// VAT Return Frequencies
export const vatReturnFrequencySchema = z.enum(['monthly', 'quarterly', 'annual']);
export type VatReturnFrequency = z.infer<typeof vatReturnFrequencySchema>;

// VAT Stagger Groups (for quarterly returns)
export const vatStaggerGroupSchema = z.enum(['1', '2', '3']);
export type VatStaggerGroup = z.infer<typeof vatStaggerGroupSchema>;

// VAT Period Source
export const vatPeriodSourceSchema = z.enum(['manual', 'hmrc_connected', 'system_generated']);
export type VatPeriodSource = z.infer<typeof vatPeriodSourceSchema>;

// VAT Period Status
export const vatPeriodStatusSchema = z.enum(['upcoming', 'current', 'overdue', 'submitted', 'paid']);
export type VatPeriodStatus = z.infer<typeof vatPeriodStatusSchema>;

// VAT Period
export const vatPeriodSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  periodStartDate: z.date(),
  periodEndDate: z.date(),
  submissionDeadline: z.date(),
  paymentDeadline: z.date().optional(),
  frequency: vatReturnFrequencySchema,
  staggerGroup: vatStaggerGroupSchema.optional(), // Only for quarterly
  source: vatPeriodSourceSchema,
  status: vatPeriodStatusSchema,
  isTransitional: z.boolean().default(false), // For frequency change periods
  transitionalMonths: z.number().optional(), // Number of months in transitional period
  hmrcObligationId: z.string().optional(), // HMRC's unique identifier
  lastSyncDate: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type VatPeriod = z.infer<typeof vatPeriodSchema>;

// VAT Period Configuration
export const vatPeriodConfigSchema = z.object({
  tenantId: z.string(),
  frequency: vatReturnFrequencySchema,
  staggerGroup: vatStaggerGroupSchema.optional(),
  registrationDate: z.date(),
  isAnnualAccounting: z.boolean().default(false),
  annualAccountingStartMonth: z.number().min(1).max(12).optional(),
  paymentOnAccountRequired: z.boolean().default(false), // For businesses > £2.3m
  hmrcConnected: z.boolean().default(false),
  lastFrequencyChange: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type VatPeriodConfig = z.infer<typeof vatPeriodConfigSchema>;

// Stagger Group Months
export const STAGGER_GROUP_MONTHS: Record<VatStaggerGroup, number[]> = {
  '1': [3, 6, 9, 12], // March, June, September, December
  '2': [1, 4, 7, 10], // January, April, July, October  
  '3': [2, 5, 8, 11], // February, May, August, November
};

// VAT Period Change Request
export const vatPeriodChangeRequestSchema = z.object({
  currentFrequency: vatReturnFrequencySchema,
  newFrequency: vatReturnFrequencySchema,
  effectiveDate: z.date(),
  currentStaggerGroup: vatStaggerGroupSchema.optional(),
  newStaggerGroup: vatStaggerGroupSchema.optional(),
});

export type VatPeriodChangeRequest = z.infer<typeof vatPeriodChangeRequestSchema>;

// HMRC VAT Obligation (from API)
export const hmrcVatObligationSchema = z.object({
  start: z.string(), // Date string from HMRC
  end: z.string(),
  due: z.string(),
  status: z.enum(['O', 'F']), // Open or Fulfilled
  periodKey: z.string(),
  received: z.string().optional(), // Date when return was received
});

export type HmrcVatObligation = z.infer<typeof hmrcVatObligationSchema>;

// VAT Period Conflict
export const vatPeriodConflictSchema = z.object({
  type: z.enum(['date_mismatch', 'frequency_mismatch', 'missing_period', 'extra_period']),
  manualPeriod: vatPeriodSchema.optional(),
  hmrcPeriod: hmrcVatObligationSchema.optional(),
  description: z.string(),
});

export type VatPeriodConflict = z.infer<typeof vatPeriodConflictSchema>;