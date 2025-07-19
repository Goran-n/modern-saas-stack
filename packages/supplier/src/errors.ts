export class SupplierError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public field?: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = "SupplierError";
  }
}

// Error factory functions
export const createError = {
  // Identifier errors
  missingIdentifier: () =>
    new SupplierError(
      "At least one identifier (company number or VAT number) is required",
      "MISSING_IDENTIFIER",
      400,
      "identifiers",
    ),

  duplicateCompanyNumber: (number: string) =>
    new SupplierError(
      "A supplier with this company number already exists",
      "DUPLICATE_COMPANY_NUMBER",
      409,
      "companyNumber",
      { companyNumber: number },
    ),

  duplicateVatNumber: (number: string) =>
    new SupplierError(
      "A supplier with this VAT number already exists",
      "DUPLICATE_VAT_NUMBER",
      409,
      "vatNumber",
      { vatNumber: number },
    ),

  // Supplier errors
  supplierNotFound: (id: string) =>
    new SupplierError(
      "Supplier not found",
      "SUPPLIER_NOT_FOUND",
      404,
      undefined,
      { supplierId: id },
    ),

  invalidTenant: (tenantId: string) =>
    new SupplierError("Invalid tenant ID", "INVALID_TENANT", 403, "tenantId", {
      tenantId,
    }),

  // Validation errors
  nameTooShort: (name: string) =>
    new SupplierError(
      "Company name must be at least 2 characters long",
      "NAME_TOO_SHORT",
      400,
      "name",
      { provided: name, minLength: 2, actualLength: name.length },
    ),

  nameTooLong: (name: string) =>
    new SupplierError(
      "Company name cannot exceed 200 characters",
      "NAME_TOO_LONG",
      400,
      "name",
      {
        provided: name.substring(0, 50) + "...",
        maxLength: 200,
        actualLength: name.length,
      },
    ),

  nameNoLetters: (name: string) =>
    new SupplierError(
      "Company name must contain at least one letter",
      "NAME_NO_LETTERS",
      400,
      "name",
      { provided: name },
    ),

  invalidCompanyNumber: (number: string, country: string) =>
    new SupplierError(
      `Invalid ${country} company registration number format`,
      "INVALID_COMPANY_NUMBER",
      400,
      "companyNumber",
      { provided: number, country },
    ),

  invalidVatNumber: (number: string, country: string) =>
    new SupplierError(
      `Invalid ${country} VAT number format`,
      "INVALID_VAT_NUMBER",
      400,
      "vatNumber",
      { provided: number, country },
    ),

  // Contact errors (as warnings - lower severity)
  invalidEmail: (email: string) =>
    new SupplierError(
      `Email address "${email}" appears to be invalid`,
      "INVALID_EMAIL",
      400,
      "email",
      {
        provided: email,
        suggestion: "Please verify the email format (e.g., name@company.com)",
      },
    ),

  invalidPhone: (phone: string) =>
    new SupplierError(
      `Phone number "${phone}" may be invalid`,
      "INVALID_PHONE",
      400,
      "phone",
      {
        provided: phone,
        suggestion:
          "Ensure the phone number includes country code and has 7-20 digits",
      },
    ),

  invalidWebsite: (website: string) =>
    new SupplierError(
      `Website URL "${website}" appears to be invalid`,
      "INVALID_WEBSITE",
      400,
      "website",
      {
        provided: website,
        suggestion: "Please provide a valid URL (e.g., https://example.com)",
      },
    ),
};

// Legacy error exports for backwards compatibility
export const SupplierErrors = {
  MISSING_IDENTIFIER: createError.missingIdentifier(),
  DUPLICATE_COMPANY_NUMBER: createError.duplicateCompanyNumber("[number]"),
  DUPLICATE_VAT_NUMBER: createError.duplicateVatNumber("[number]"),
  SUPPLIER_NOT_FOUND: createError.supplierNotFound("[id]"),
  INVALID_TENANT: createError.invalidTenant("[tenantId]"),
};
