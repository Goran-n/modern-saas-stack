import { z } from "zod";


// Address schema
const addressSchema = z.object({
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

// VAT number validation patterns by country
const vatPatterns: Record<string, RegExp> = {
  GB: /^GB\d{9}$|^GB\d{12}$|^GBGD\d{3}$|^GBHA\d{3}$/,
  IE: /^IE\d{7}[A-Z]{1,2}$/,
  DE: /^DE\d{9}$/,
  FR: /^FR[A-Z0-9]{2}\d{9}$/,
  // Add more patterns as needed
};

// VAT registration schema
const vatRegistrationSchema = z.object({
  id: z.string().uuid(),
  number: z.string().refine((val) => {
    const countryCode = val.substring(0, 2);
    const pattern = vatPatterns[countryCode];
    return pattern ? pattern.test(val) : true;
  }, "Invalid VAT number format"),
  country: z.string().min(2).max(2),
  scheme: z.enum(["standard", "flat_rate", "cash_accounting", "annual_accounting"]),
  flatRatePercentage: z.number().min(0).max(100).optional(),
  isActive: z.boolean().default(true),
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
});

// Company registration schema
const companyRegistrationSchema = z.object({
  id: z.string().uuid(),
  number: z.string().min(1, "Registration number is required"),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  type: z.enum(["company_number", "charity_number", "partnership_number", "other"]),
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
});

// Tax reference schema
const taxReferenceSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["utr", "paye", "vat", "corporation_tax", "other"]),
  reference: z.string().min(1, "Reference is required"),
  description: z.string().optional(),
});

// Name history schema
const nameHistorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  type: z.enum(["legal", "trading", "previous"]),
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
});

// VAT scheme history schema
const vatSchemeHistorySchema = z.object({
  id: z.string().uuid(),
  scheme: z.enum(["standard", "flat_rate", "cash_accounting", "annual_accounting"]),
  flatRatePercentage: z.number().min(0).max(100).optional(),
  annualLimit: z.number().positive().optional(),
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
});

// Company type enum
const companyTypeSchema = z.enum([
  "limited_company",
  "plc",
  "llp",
  "partnership",
  "sole_trader",
  "charity",
  "community_interest_company",
  "other",
]);

// Company size enum
const companySizeSchema = z.enum(["micro", "small", "medium", "large"]);

// Email validation
const emailDomainSchema = z.string().regex(
  /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/,
  "Invalid domain format"
);

// Phone number validation (basic)
const phoneNumberSchema = z.string().regex(
  /^\+?[0-9\s\-\(\)]+$/,
  "Invalid phone number format"
);

// Website URL validation
const websiteSchema = z.string().url("Invalid URL format");

// Main company configuration schema
export const companyConfigSchema = z.object({
  names: z.object({
    legal: z.string().min(1, "Legal name is required"),
    trading: z.array(z.string().min(1)),
    previous: z.array(nameHistorySchema),
    abbreviations: z.array(z.string().min(1)),
    misspellings: z.array(z.string().min(1)),
    groupName: z.string().optional(),
  }),

  identifiers: z.object({
    vatNumbers: z.array(vatRegistrationSchema),
    companyNumbers: z.array(companyRegistrationSchema),
    taxReferences: z.array(taxReferenceSchema),
  }),

  addresses: z.object({
    registered: addressSchema.nullable(),
    trading: z.array(addressSchema),
    billing: z.array(addressSchema),
    historical: z.array(addressSchema),
  }),

  matching: z.object({
    emailDomains: z.array(emailDomainSchema),
    phoneNumbers: z.array(phoneNumberSchema),
    bankStatementNames: z.array(z.string().min(1)),
    commonSuppliers: z.array(z.string().min(1)),
    websites: z.array(websiteSchema),
  }),

  business: z.object({
    type: companyTypeSchema,
    industrySectors: z.array(z.string().min(1)),
    size: companySizeSchema,
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
    schemes: z.array(vatSchemeHistorySchema),
    taxYearBasis: z.enum(["cash", "accrual"]),
    mtdEnabled: z.boolean(),
    ecSalesListRequired: z.boolean(),
  }),
});

// Partial schema for updates (all fields optional)
export const companyConfigUpdateSchema = companyConfigSchema.partial();

// Schema for creating new entries
export const createAddressSchema = addressSchema.omit({ id: true });
export const createVatRegistrationSchema = vatRegistrationSchema.omit({ id: true });
export const createCompanyRegistrationSchema = companyRegistrationSchema.omit({ id: true });
export const createTaxReferenceSchema = taxReferenceSchema.omit({ id: true });
export const createNameHistorySchema = nameHistorySchema.omit({ id: true });
export const createVatSchemeHistorySchema = vatSchemeHistorySchema.omit({ id: true });

// Helper to validate VAT number format
export function validateVATNumber(vatNumber: string, country: string): boolean {
  const pattern = vatPatterns[country];
  if (!pattern) {
    // If no pattern defined for country, accept any format
    return true;
  }
  return pattern.test(vatNumber);
}


// Export types (with different names to avoid conflicts)
export type CompanyConfigSchema = z.infer<typeof companyConfigSchema>;
export type CompanyConfigUpdateSchema = z.infer<typeof companyConfigUpdateSchema>;
export type AddressSchema = z.infer<typeof addressSchema>;
export type VATRegistrationSchema = z.infer<typeof vatRegistrationSchema>;
export type CompanyRegistrationSchema = z.infer<typeof companyRegistrationSchema>;
export type TaxReferenceSchema = z.infer<typeof taxReferenceSchema>;
export type NameHistorySchema = z.infer<typeof nameHistorySchema>;
export type VATSchemeHistorySchema = z.infer<typeof vatSchemeHistorySchema>;