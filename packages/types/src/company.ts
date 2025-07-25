import { z } from 'zod';

// Address schema - matching tenant package
export const AddressSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["registered", "trading", "billing", "previous"]),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  county: z.string().optional(),
  postcode: z.string().min(1, "Postcode is required"),
  country: z.string().min(2).max(2, "Country must be 2-letter ISO code"),
  isActive: z.boolean().default(true),
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
});

// VAT registration schema - matching tenant package
export const VATRegistrationSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  country: z.string().min(2).max(2),
  scheme: z.enum(["standard", "flat_rate", "cash_accounting", "annual_accounting"]),
  flatRatePercentage: z.number().min(0).max(100).optional(),
  isActive: z.boolean().default(true),
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
});

// Company registration schema
export const CompanyRegistrationSchema = z.object({
  id: z.string().uuid(),
  number: z.string().min(1, "Registration number is required"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  type: z.enum(["company_number", "charity_number", "partnership_number", "other"]),
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
});

// Tax reference schema
export const TaxReferenceSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["utr", "paye", "vat", "corporation_tax", "other"]),
  reference: z.string().min(1, "Reference is required"),
  description: z.string().optional(),
});

// Name history schema
export const NameHistorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  type: z.enum(["legal", "trading", "previous"]),
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
});

// VAT scheme history schema
export const VATSchemeHistorySchema = z.object({
  id: z.string().uuid(),
  scheme: z.enum(["standard", "flat_rate", "cash_accounting", "annual_accounting"]),
  flatRatePercentage: z.number().min(0).max(100).optional(),
  annualLimit: z.number().positive().optional(),
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
});

// Company configuration schema - matching tenant package
export const CompanyConfigSchema = z.object({
  names: z.object({
    legal: z.string().min(1, "Legal name is required"),
    trading: z.array(z.string().min(1)),
    previous: z.array(NameHistorySchema),
    abbreviations: z.array(z.string().min(1)),
    misspellings: z.array(z.string().min(1)),
    groupName: z.string().optional(),
  }),

  identifiers: z.object({
    vatNumbers: z.array(VATRegistrationSchema),
    companyNumbers: z.array(CompanyRegistrationSchema),
    taxReferences: z.array(TaxReferenceSchema),
  }),

  addresses: z.object({
    registered: AddressSchema.nullable(),
    trading: z.array(AddressSchema),
    billing: z.array(AddressSchema),
    historical: z.array(AddressSchema),
  }),

  matching: z.object({
    emailDomains: z.array(z.string()),
    phoneNumbers: z.array(z.string()),
    bankStatementNames: z.array(z.string().min(1)),
    commonSuppliers: z.array(z.string().min(1)),
    websites: z.array(z.string().url()),
  }),

  business: z.object({
    type: z.enum([
      "limited_company",
      "plc",
      "llp",
      "partnership",
      "sole_trader",
      "charity",
      "community_interest_company",
      "other",
    ]),
    industrySectors: z.array(z.string().min(1)),
    size: z.enum(["micro", "small", "medium", "large"]),
    incorporationDate: z.date().optional(),
    financialYearEnd: z.object({
      month: z.number().min(1).max(12),
      day: z.number().min(1).max(31),
    }),
    accountingMethod: z.enum(["cash", "accrual"]),
    defaultCurrency: z.string().length(3, "Currency code must be 3 characters"),
  }),

  vat: z.object({
    isRegistered: z.boolean(),
    schemes: z.array(VATSchemeHistorySchema),
    taxYearBasis: z.enum(["cash", "accrual"]),
    mtdEnabled: z.boolean(),
    ecSalesListRequired: z.boolean(),
  }),
});

// Type exports
export type Address = z.infer<typeof AddressSchema>;
export type VATRegistration = z.infer<typeof VATRegistrationSchema>;
export type CompanyRegistration = z.infer<typeof CompanyRegistrationSchema>;
export type TaxReference = z.infer<typeof TaxReferenceSchema>;
export type NameHistory = z.infer<typeof NameHistorySchema>;
export type VATSchemeHistory = z.infer<typeof VATSchemeHistorySchema>;
export type CompanyConfig = z.infer<typeof CompanyConfigSchema>;

// EU Countries
export const euCountries = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
] as const;

export type EUCountry = typeof euCountries[number];