import type { ExtractedFields } from "@figgy/shared-db";
import { format } from "date-fns";

interface FileNameOptions {
  documentType?: string | null;
  extractedFields?: ExtractedFields | null;
  supplierName?: string | null;
  originalFileName: string;
  fileExtension: string;
}

/**
 * Generate a descriptive filename based on extracted document data
 */
export function generateDescriptiveFileName(options: FileNameOptions): string {
  const {
    documentType,
    extractedFields,
    supplierName,
    originalFileName,
    fileExtension,
  } = options;

  // If no extraction data available, return sanitized original filename
  if (!extractedFields || !documentType) {
    return originalFileName;
  }

  const parts: string[] = [];

  // Add supplier/vendor name
  const vendorName = supplierName || extractedFields.vendorName?.value;
  if (vendorName) {
    parts.push(sanitizeForFileName(vendorName));
  }

  // Add document type
  const docTypeMap: Record<string, string> = {
    invoice: "Invoice",
    receipt: "Receipt",
    purchase_order: "PO",
    credit_note: "Credit-Note",
    quote: "Quote",
    contract: "Contract",
    statement: "Statement",
  };

  if (documentType && docTypeMap[documentType]) {
    parts.push(docTypeMap[documentType]);
  }

  // Add document number
  const docNumber = extractedFields.documentNumber?.value;
  if (docNumber) {
    parts.push(sanitizeForFileName(docNumber));
  }

  // Add date
  const docDate = extractedFields.documentDate?.value;
  if (docDate) {
    try {
      const date = new Date(docDate);
      if (!Number.isNaN(date.getTime())) {
        parts.push(format(date, "yyyy-MM-dd"));
      }
    } catch (_error) {
      // Ignore date parsing errors
    }
  }

  // Add amount for financial documents
  if (
    ["invoice", "receipt", "purchase_order", "credit_note"].includes(
      documentType,
    )
  ) {
    const amount = extractedFields.totalAmount?.value;
    const currency = extractedFields.currency?.value || "GBP";

    if (amount && !Number.isNaN(parseFloat(amount))) {
      const formattedAmount = parseFloat(amount).toFixed(2);
      parts.push(`${currency}${formattedAmount}`);
    }
  }

  // If we have meaningful parts, create new filename
  if (parts.length > 0) {
    return `${parts.join("_")}${fileExtension}`;
  }

  // Fallback to original filename
  return originalFileName;
}

/**
 * Sanitize a string for use in filenames
 */
function sanitizeForFileName(str: string): string {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, "-") // Replace special chars with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .slice(0, 50); // Limit length
}

/**
 * Generate a display name for the file (used in UI, not actual filename)
 */
export function generateDisplayName(options: FileNameOptions): string {
  const { documentType, extractedFields, supplierName, originalFileName } =
    options;

  // If no extraction data available, return original filename without extension
  if (!extractedFields || !documentType) {
    return originalFileName.replace(/\.[^/.]+$/, "");
  }

  const parts: string[] = [];

  // Add supplier/vendor name
  const vendorName = supplierName || extractedFields.vendorName?.value;
  if (vendorName) {
    parts.push(vendorName);
  }

  // Add document type with better formatting
  const docTypeMap: Record<string, string> = {
    invoice: "Invoice",
    receipt: "Receipt",
    purchase_order: "Purchase Order",
    credit_note: "Credit Note",
    quote: "Quote",
    contract: "Contract",
    statement: "Statement",
  };

  if (documentType && docTypeMap[documentType]) {
    parts.push(docTypeMap[documentType]);
  }

  // Add document number
  const docNumber = extractedFields.documentNumber?.value;
  if (docNumber) {
    parts.push(`#${docNumber}`);
  }

  // Add date in more readable format
  const docDate = extractedFields.documentDate?.value;
  if (docDate) {
    try {
      const date = new Date(docDate);
      if (!Number.isNaN(date.getTime())) {
        parts.push(format(date, "d MMM yyyy"));
      }
    } catch (_error) {
      // Ignore date parsing errors
    }
  }

  // If we have meaningful parts, create display name
  if (parts.length > 0) {
    return parts.join(" • ");
  }

  // Fallback to original filename without extension
  return originalFileName.replace(/\.[^/.]+$/, "");
}
