import { z } from "zod";
import { companyTypeSchema, companySizeSchema } from "./company-config.schema";

// Validation error types
export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.enum([
    "required",
    "invalid_format",
    "business_rule",
    "data_quality",
    "cross_field",
  ]),
  suggestion: z.string().optional(),
  severity: z.enum(["error", "warning", "info"]),
});

// Company Basics Base Schema (without refinements)
export const companyBasicsBaseSchema = z.object({
  legalName: z
    .string()
    .min(1, "Legal company name is required")
    .min(3, "Company name must be at least 3 characters")
    .max(200, "Company name must not exceed 200 characters")
    .refine(
      (name) => {
        // Check for generic/test names
        const genericNames = [
          "test",
          "demo",
          "example",
          "company",
          "business",
          "ltd",
          "limited",
        ];
        const nameLower = name.toLowerCase().trim();
        return !genericNames.includes(nameLower);
      },
      {
        message:
          "Please enter your actual company name, not a generic placeholder",
      },
    ),
  companyType: companyTypeSchema,
  companyNumber: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        // UK company number validation
        return /^[A-Z0-9]{8}$|^[A-Z]{2}\d{6}$/.test(val);
      },
      {
        message:
          "Invalid company number format. UK company numbers are typically 8 characters (e.g., 12345678 or SC123456)",
      },
    ),
});

// Company Basics Step Schema (with refinements)
export const companyBasicsSchema = companyBasicsBaseSchema
  .superRefine((data, ctx) => {
    // Business rule: Charities must have a charity number
    if (data.companyType === "charity" && !data.companyNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyNumber"],
        message: "Charity registration number is required for charities",
      });
    }
  });

// Financial Configuration Step Schema
export const financialConfigSchema = z.object({
  companySize: companySizeSchema,
  financialYearEnd: z.object({
    month: z
      .number()
      .min(1, "Month must be between 1 and 12")
      .max(12, "Month must be between 1 and 12"),
    day: z
      .number()
      .min(1, "Day must be between 1 and 31")
      .max(31, "Day must be between 1 and 31"),
  }),
  accountingMethod: z.enum(["cash", "accrual"])
    .describe("Please select an accounting method"),
  defaultCurrency: z
    .string()
    .length(3, "Currency code must be exactly 3 characters")
    .regex(/^[A-Z]{3}$/, "Currency code must be 3 uppercase letters"),
});

// VAT Setup Base Schema (without refinements)
export const vatSetupBaseSchema = z.object({
  isRegistered: z.boolean(),
  vatNumber: z.string().optional(),
  country: z.string().length(2).optional(),
  scheme: z
    .enum([
      "standard",
      "flat_rate",
      "cash_accounting",
      "annual_accounting",
    ])
    .optional(),
  flatRatePercentage: z.number().min(0).max(100).optional(),
  mtdEnabled: z.boolean().optional(),
  ecSalesListRequired: z.boolean().optional(),
  address: z
    .object({
      line1: z.string().min(1, "Address line 1 is required"),
      line2: z.string().optional(),
      city: z.string().min(1, "City is required"),
      county: z.string().optional(),
      postcode: z
        .string()
        .min(1, "Postcode is required")
        .regex(
          /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
          "Invalid UK postcode format",
        ),
      country: z
        .string()
        .length(2, "Country must be 2-letter ISO code")
        .default("GB"),
    })
    .optional(),
});

// VAT Setup Step Schema (with refinements)
export const vatSetupSchema = vatSetupBaseSchema
  .superRefine((data, ctx) => {
    // If VAT registered, require VAT number and related fields
    if (data.isRegistered) {
      if (!data.vatNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["vatNumber"],
          message: "VAT number is required when VAT registered",
        });
      } else {
        // Validate VAT number format
        const country = data.country || "GB";
        const vatPatterns: Record<string, RegExp> = {
          GB: /^GB\d{9}$|^GB\d{12}$|^GBGD\d{3}$|^GBHA\d{3}$/,
          IE: /^IE\d{7}[A-Z]{1,2}$/,
          DE: /^DE\d{9}$/,
          FR: /^FR[A-Z0-9]{2}\d{9}$/,
        };
        
        const pattern = vatPatterns[country];
        if (pattern && !pattern.test(data.vatNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["vatNumber"],
            message: `Invalid VAT number format for ${country}`,
          });
        }
      }

      if (!data.scheme) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheme"],
          message: "VAT scheme is required when VAT registered",
        });
      }

      if (!data.address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address"],
          message: "VAT registered address is required",
        });
      }

      // Flat rate scheme requires percentage
      if (data.scheme === "flat_rate" && !data.flatRatePercentage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["flatRatePercentage"],
          message: "Flat rate percentage is required for flat rate scheme",
        });
      }
    }
  });

// Document Recognition Step Schema
export const documentRecognitionSchema = z.object({
  tradingNames: z
    .array(z.string().min(1))
    .optional()
    .describe("Alternative names your company trades under"),
  abbreviations: z
    .array(z.string().min(1))
    .optional()
    .describe("Common abbreviations of your company name"),
  misspellings: z
    .array(z.string().min(1))
    .optional()
    .describe("Common misspellings to watch for"),
  emailDomains: z
    .array(
      z
        .string()
        .regex(
          /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/,
          "Invalid domain format",
        )
        .refine(
          (domain) => {
            // Block public email domains
            const publicDomains = [
              "gmail.com",
              "yahoo.com",
              "hotmail.com",
              "outlook.com",
              "aol.com",
              "protonmail.com",
            ];
            return !publicDomains.includes(domain.toLowerCase());
          },
          {
            message:
              "Please use your company domain, not a public email provider",
          },
        ),
    )
    .optional()
    .describe("Your company email domains"),
  bankStatementNames: z
    .array(z.string().min(1))
    .optional()
    .describe("Names that appear on bank statements"),
});

// Integrations Step Schema
export const integrationsSchema = z.object({
  emailIntegration: z.boolean().optional(),
  accountingSoftware: z.string().optional(),
  bankConnection: z.boolean().optional(),
});

// Onboarding Progress Schema
export const onboardingProgressSchema = z.object({
  currentStep: z.number().min(0).max(4),
  completedSteps: z.array(z.string()),
  stepData: z.object({
    basics: companyBasicsBaseSchema.partial().optional(),
    financial: financialConfigSchema.partial().optional(),
    vat: vatSetupBaseSchema.partial().optional(),
    recognition: documentRecognitionSchema.partial().optional(),
    integrations: integrationsSchema.partial().optional(),
  }),
  lastUpdated: z.string().datetime(),
  validationState: z.record(z.string(), z.boolean()).optional(),
});

// Helper function to create validation error
export function createValidationError(
  field: string,
  message: string,
  code: z.infer<typeof validationErrorSchema>["code"] = "invalid_format",
  suggestion?: string,
  severity: z.infer<typeof validationErrorSchema>["severity"] = "error",
): z.infer<typeof validationErrorSchema> {
  return {
    field,
    message,
    code,
    suggestion,
    severity,
  };
}

// Export types
export type CompanyBasics = z.infer<typeof companyBasicsSchema>;
export type FinancialConfig = z.infer<typeof financialConfigSchema>;
export type VATSetup = z.infer<typeof vatSetupSchema>;
export type DocumentRecognition = z.infer<typeof documentRecognitionSchema>;
export type Integrations = z.infer<typeof integrationsSchema>;
export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;
export type ValidationError = z.infer<typeof validationErrorSchema>;