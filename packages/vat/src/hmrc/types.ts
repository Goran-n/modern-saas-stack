import { z } from 'zod';

// HMRC API Error Response
export const hmrcErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  errors: z.array(z.object({
    code: z.string(),
    message: z.string(),
    path: z.string().optional(),
  })).optional(),
});

export type HmrcErrorResponse = z.infer<typeof hmrcErrorResponseSchema>;

// HMRC VAT Obligations Response
export const hmrcObligationSchema = z.object({
  start: z.string(), // Date in format YYYY-MM-DD
  end: z.string(),
  due: z.string(),
  status: z.enum(['O', 'F']), // Open or Fulfilled
  periodKey: z.string(),
  received: z.string().optional(), // Date when return was received
});

export type HmrcObligation = z.infer<typeof hmrcObligationSchema>;

export const hmrcObligationsResponseSchema = z.object({
  obligations: z.array(z.object({
    identification: z.object({
      vrn: z.string(), // VAT Registration Number
      incomeSourceType: z.literal('MTD'),
    }),
    obligationDetails: z.array(hmrcObligationSchema),
  })),
});

export type HmrcObligationsResponse = z.infer<typeof hmrcObligationsResponseSchema>;

// HMRC VAT Return
export const hmrcVatReturnSchema = z.object({
  periodKey: z.string(),
  vatDueSales: z.number(),
  vatDueAcquisitions: z.number(),
  totalVatDue: z.number(),
  vatReclaimedCurrPeriod: z.number(),
  netVatDue: z.number(),
  totalValueSalesExVAT: z.number(),
  totalValuePurchasesExVAT: z.number(),
  totalValueGoodsSuppliedExVAT: z.number(),
  totalAcquisitionsExVAT: z.number(),
});

export type HmrcVatReturn = z.infer<typeof hmrcVatReturnSchema>;

// HMRC VAT Return Response
export const hmrcVatReturnResponseSchema = z.object({
  processingDate: z.string(),
  paymentIndicator: z.enum(['DD', 'BANK', 'PAYMENT_NOT_REQUIRED']).optional(),
  formBundleNumber: z.string(),
  chargeRefNumber: z.string().optional(),
});

export type HmrcVatReturnResponse = z.infer<typeof hmrcVatReturnResponseSchema>;

// HMRC VAT Liabilities
export const hmrcVatLiabilitySchema = z.object({
  taxPeriod: z.object({
    from: z.string(),
    to: z.string(),
  }),
  type: z.enum(['VAT Return Debit Charge', 'VAT Return Credit Charge', 'VAT Officer Assessment Debit Charge', 'VAT Officer Assessment Credit Charge']),
  originalAmount: z.number(),
  outstandingAmount: z.number().optional(),
  due: z.string(),
});

export type HmrcVatLiability = z.infer<typeof hmrcVatLiabilitySchema>;

// HMRC VAT Payments
export const hmrcVatPaymentSchema = z.object({
  amount: z.number(),
  received: z.string(),
});

export type HmrcVatPayment = z.infer<typeof hmrcVatPaymentSchema>;

// API Options
export interface HmrcApiOptions {
  sandbox?: boolean;
  baseUrl?: string;
}

// Date range filter
export interface HmrcDateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

// Fraud Prevention Headers (required by HMRC)
export interface HmrcFraudPreventionHeaders {
  'Gov-Client-Connection-Method': string;
  'Gov-Client-Device-ID': string;
  'Gov-Client-User-IDs': string;
  'Gov-Client-Timezone': string;
  'Gov-Client-Local-IPs': string;
  'Gov-Client-Screens': string;
  'Gov-Client-Window-Size': string;
  'Gov-Client-Browser-Plugins': string;
  'Gov-Client-Browser-JS-User-Agent': string;
  'Gov-Client-Browser-Do-Not-Track': string;
  'Gov-Client-Multi-Factor': string;
  'Gov-Vendor-Version': string;
  'Gov-Vendor-License-IDs': string;
}