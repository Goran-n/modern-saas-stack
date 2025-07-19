import type { AccountingDocument } from "./types";

export interface MonetaryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class MonetaryValidator {
  private static readonly MAX_REASONABLE_AMOUNT = 1_000_000_000; // 1 billion
  private static readonly MIN_AMOUNT = 0;
  private static readonly ROUNDING_TOLERANCE = 0.02; // 2 cents tolerance

  static validate(doc: AccountingDocument): MonetaryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate total amount
    if (doc.totalAmount !== null) {
      if (doc.totalAmount < MonetaryValidator.MIN_AMOUNT) {
        errors.push("Total amount cannot be negative");
      }
      if (doc.totalAmount > MonetaryValidator.MAX_REASONABLE_AMOUNT) {
        warnings.push("Total amount exceeds reasonable limit (1 billion)");
      }
    }

    // Validate subtotal
    if (doc.subtotalAmount !== null) {
      if (doc.subtotalAmount < MonetaryValidator.MIN_AMOUNT) {
        errors.push("Subtotal amount cannot be negative");
      }
      if (doc.subtotalAmount > MonetaryValidator.MAX_REASONABLE_AMOUNT) {
        warnings.push("Subtotal amount exceeds reasonable limit");
      }
    }

    // Validate tax amount
    if (doc.taxAmount !== null) {
      if (doc.taxAmount < MonetaryValidator.MIN_AMOUNT) {
        errors.push("Tax amount cannot be negative");
      }

      // Tax should not exceed total
      if (doc.totalAmount !== null && doc.taxAmount > doc.totalAmount) {
        errors.push("Tax amount cannot exceed total amount");
      }
    }

    // Validate tax rate
    if (doc.taxRate !== null) {
      if (doc.taxRate < 0 || doc.taxRate > 100) {
        errors.push("Tax rate must be between 0 and 100");
      }
    }

    // Validate mathematical relationships
    if (
      doc.totalAmount !== null &&
      doc.subtotalAmount !== null &&
      doc.taxAmount !== null
    ) {
      const calculatedTotal = doc.subtotalAmount + doc.taxAmount;
      const difference = Math.abs(calculatedTotal - doc.totalAmount);

      if (difference > MonetaryValidator.ROUNDING_TOLERANCE) {
        errors.push(
          `Total (${doc.totalAmount}) does not equal subtotal (${doc.subtotalAmount}) + tax (${doc.taxAmount}). Difference: ${difference.toFixed(2)}`,
        );
      }
    }

    // Validate currency code
    if (doc.currency !== null) {
      if (!MonetaryValidator.isValidCurrencyCode(doc.currency)) {
        errors.push(`Invalid currency code: ${doc.currency}`);
      }
    }

    // Validate line items
    if (doc.lineItems && doc.lineItems.length > 0) {
      const lineItemsValidation = MonetaryValidator.validateLineItems(
        doc.lineItems,
        doc.subtotalAmount,
      );
      errors.push(...lineItemsValidation.errors);
      warnings.push(...lineItemsValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateLineItems(
    lineItems: AccountingDocument["lineItems"],
    documentSubtotal: number | null,
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let calculatedSubtotal = 0;

    lineItems.forEach((item, index) => {
      // Validate individual line item amounts
      if (item.totalPrice !== null) {
        if (item.totalPrice < 0) {
          errors.push(`Line item ${index + 1}: Total price cannot be negative`);
        }
        calculatedSubtotal += item.totalPrice;
      }

      if (item.unitPrice !== null && item.unitPrice < 0) {
        errors.push(`Line item ${index + 1}: Unit price cannot be negative`);
      }

      if (item.quantity !== null && item.quantity < 0) {
        errors.push(`Line item ${index + 1}: Quantity cannot be negative`);
      }

      // Validate line item calculation
      if (
        item.quantity !== null &&
        item.unitPrice !== null &&
        item.totalPrice !== null
      ) {
        const calculatedPrice = item.quantity * item.unitPrice;
        const difference = Math.abs(calculatedPrice - item.totalPrice);

        if (difference > MonetaryValidator.ROUNDING_TOLERANCE) {
          warnings.push(
            `Line item ${index + 1}: Calculated total (${calculatedPrice.toFixed(2)}) does not match stated total (${item.totalPrice})`,
          );
        }
      }
    });

    // Compare line items total with document subtotal
    if (documentSubtotal !== null && calculatedSubtotal > 0) {
      const difference = Math.abs(calculatedSubtotal - documentSubtotal);
      if (difference > MonetaryValidator.ROUNDING_TOLERANCE) {
        warnings.push(
          `Line items total (${calculatedSubtotal.toFixed(2)}) does not match document subtotal (${documentSubtotal})`,
        );
      }
    }

    return { errors, warnings };
  }

  private static isValidCurrencyCode(code: string): boolean {
    // Common ISO 4217 currency codes
    const validCodes = [
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "CHF",
      "CAD",
      "AUD",
      "NZD",
      "SEK",
      "NOK",
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
      "INR",
      "IDR",
      "KRW",
      "CNY",
      "HKD",
      "SGD",
      "THB",
      "MYR",
      "PHP",
      "ZAR",
      "EGP",
      "AED",
      "SAR",
      "QAR",
      "KWD",
      "BHD",
      "OMR",
      "JOD",
      "ILS",
      "TWD",
      "ARS",
      "CLP",
      "COP",
      "PEN",
      "UYU",
      "PKR",
      "LKR",
      "NGN",
      "KES",
      "GHS",
      "MAD",
      "TND",
      "DZD",
      "VND",
      "UAH",
    ];

    return validCodes.includes(code.toUpperCase());
  }
}
