import type { AccountingDocument, FieldWithConfidence } from "./types";

// Currency validation
const ISO_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "CNY",
  "INR",
  "KRW",
  "SGD",
  "HKD",
  "NOK",
  "SEK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "HRK",
  "RUB",
  "TRY",
  "BRL",
  "MXN",
  "ARS",
  "CLP",
  "COP",
  "PEN",
  "UYU",
  "ZAR",
  "THB",
  "MYR",
  "IDR",
  "PHP",
  "VND",
  "EGP",
  "PKR",
  "ILS",
  "AED",
  "SAR",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "JOD",
  "KES",
  "NGN",
  "GHS",
  "MAD",
  "TND",
  "ETB",
  "UGX",
  "TZS",
  "XOF",
  "XAF",
]);

export function validateCurrency(currency: string): boolean {
  return ISO_CURRENCIES.has(currency.toUpperCase());
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// VAT number validation (basic)
export function validateVATNumber(vatNumber: string): boolean {
  // Basic EU VAT format: 2 letter country code + numbers
  const vatRegex = /^[A-Z]{2}[0-9A-Z]+$/;
  return vatRegex.test(vatNumber.toUpperCase());
}

// Date validation
export function validateISODate(date: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(date)) return false;

  const parsedDate = new Date(date);
  return !Number.isNaN(parsedDate.getTime());
}

// Amount validation
export function validateAmount(amount: number): boolean {
  return amount >= 0 && Number.isFinite(amount);
}

// Critical fields validation
export function validateCriticalFields(document: AccountingDocument): {
  isValid: boolean;
  missingFields: string[];
  invalidFields: string[];
} {
  const missingFields: string[] = [];
  const invalidFields: string[] = [];

  // Check required fields
  if (!document.totalAmount && document.totalAmount !== 0) {
    missingFields.push("totalAmount");
  } else if (!validateAmount(document.totalAmount)) {
    invalidFields.push("totalAmount");
  }

  if (!document.currency) {
    missingFields.push("currency");
  } else if (!validateCurrency(document.currency)) {
    invalidFields.push("currency");
  }

  if (!document.vendorName) {
    missingFields.push("vendorName");
  }

  if (!document.documentDate && !document.dueDate) {
    missingFields.push("documentDate or dueDate");
  } else {
    if (document.documentDate && !validateISODate(document.documentDate)) {
      invalidFields.push("documentDate");
    }
    if (document.dueDate && !validateISODate(document.dueDate)) {
      invalidFields.push("dueDate");
    }
  }

  // Validate optional fields if present
  if (document.vendorEmail && !validateEmail(document.vendorEmail)) {
    invalidFields.push("vendorEmail");
  }

  if (document.customerEmail && !validateEmail(document.customerEmail)) {
    invalidFields.push("customerEmail");
  }

  if (document.vendorTaxId && !validateVATNumber(document.vendorTaxId)) {
    // Don't mark as invalid, just lower confidence
  }

  return {
    isValid: missingFields.length === 0 && invalidFields.length === 0,
    missingFields,
    invalidFields,
  };
}

// Confidence adjustment based on validation
export function adjustConfidenceForValidation(
  field: FieldWithConfidence,
  isValid: boolean,
): FieldWithConfidence {
  if (!isValid) {
    return {
      ...field,
      confidence: Math.max(field.confidence * 0.7, 30), // Reduce confidence by 30%
    };
  }
  return field;
}

// Calculate checksum for line items
export function validateLineItemsTotal(
  lineItems: Array<{ totalPrice: number | null }>,
  subtotal: number,
): boolean {
  const calculatedTotal = lineItems.reduce(
    (sum, item) => sum + (item.totalPrice || 0),
    0,
  );

  // Allow 1% tolerance for rounding errors
  const tolerance = subtotal * 0.01;
  return Math.abs(calculatedTotal - subtotal) <= tolerance;
}
