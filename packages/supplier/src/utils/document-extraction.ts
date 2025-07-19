import type { ExtractedFields, ExtractedFieldValue } from "@kibly/shared-db";

/**
 * Simplified vendor data extracted from documents
 */
export interface ExtractedVendorData {
  name: string | null;
  companyNumber: string | null;
  vatNumber: string | null;
  address: {
    line1: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  };
  contacts: {
    email: string | null;
    phone: string | null;
    website: string | null;
  };
  confidence?: {
    name?: number;
    companyNumber?: number;
    vatNumber?: number;
    address?: number;
    email?: number;
    phone?: number;
    website?: number;
  };
}

/**
 * Extract vendor data from ExtractedFields JSONB
 */
export function extractVendorData(
  fields: ExtractedFields | null | undefined,
): ExtractedVendorData {
  if (!fields) {
    return {
      name: null,
      companyNumber: null,
      vatNumber: null,
      address: {
        line1: null,
        city: null,
        postalCode: null,
        country: null,
      },
      contacts: {
        email: null,
        phone: null,
        website: null,
      },
    };
  }

  // Extract VAT number from taxId field if it matches VAT format
  const taxId = getFieldValue(fields.vendorTaxId);
  const isVatNumber = taxId && /^[A-Z]{2}[A-Z0-9]+/.test(taxId);

  return {
    name: getFieldValue(fields.vendorName),
    companyNumber: getFieldValue(fields.vendorCompanyNumber),
    vatNumber: isVatNumber ? taxId : null,
    address: {
      line1: getFieldValue(fields.vendorAddress),
      city: getFieldValue(fields.vendorCity),
      postalCode: getFieldValue(fields.vendorPostalCode),
      country: getFieldValue(fields.vendorCountry),
    },
    contacts: {
      email: getFieldValue(fields.vendorEmail),
      phone: getFieldValue(fields.vendorPhone),
      website: getFieldValue(fields.vendorWebsite),
    },
  };
}

/**
 * Extract vendor data with confidence scores
 *
 * This function extracts vendor information from document fields and includes
 * confidence scores for each field that was extracted by the AI model.
 *
 * @param fields - The extracted fields from document analysis (can be null/undefined)
 * @returns ExtractedVendorData with confidence scores for available fields
 */
export function extractVendorDataWithConfidence(
  fields: ExtractedFields | null | undefined,
): ExtractedVendorData {
  // Start with basic vendor data extraction
  const vendorData = extractVendorData(fields);

  // Early return if no fields available
  if (!fields) {
    return vendorData;
  }

  const confidence: ExtractedVendorData["confidence"] = {};

  // Map ExtractedFields to ExtractedVendorData confidence structure
  // This mapping handles the field name differences between the two interfaces
  const fieldMapping = {
    name: fields.vendorName, // vendorName -> name
    companyNumber: fields.vendorCompanyNumber, // vendorCompanyNumber -> companyNumber
    vatNumber: fields.vendorTaxId, // vendorTaxId -> vatNumber
    address: fields.vendorAddress, // vendorAddress -> address
    email: fields.vendorEmail, // vendorEmail -> email
    phone: fields.vendorPhone, // vendorPhone -> phone
    website: fields.vendorWebsite, // vendorWebsite -> website
  };

  // Extract confidence scores for each field that has a value
  for (const [key, field] of Object.entries(fieldMapping)) {
    if (field?.confidence !== undefined) {
      confidence[key as keyof typeof confidence] = field.confidence;
    }
  }

  return {
    ...vendorData,
    // Only include confidence object if we have at least one confidence score
    ...(Object.keys(confidence).length > 0 && { confidence }),
  };
}

/**
 * Extract structured address from vendor fields
 */
export function extractVendorAddress(
  fields: ExtractedFields | null | undefined,
): ExtractedVendorData["address"] {
  return extractVendorData(fields).address;
}

/**
 * Check if vendor data meets minimum requirements for supplier creation
 */
export function hasMinimumVendorData(
  fields: ExtractedFields | null | undefined,
): boolean {
  if (!fields) return false;

  const data = extractVendorData(fields);

  // Need name and at least one identifier
  return !!data.name && (!!data.vatNumber || !!data.companyNumber);
}

/**
 * Get confidence score for vendor data completeness
 */
export function getVendorDataCompleteness(
  fields: ExtractedFields | null | undefined,
): number {
  if (!fields) return 0;

  const fieldValues = [
    fields.vendorName,
    fields.vendorTaxId,
    fields.vendorCompanyNumber,
    fields.vendorAddress,
    fields.vendorCity,
    fields.vendorPostalCode,
    fields.vendorCountry,
    fields.vendorEmail,
    fields.vendorPhone,
  ];

  let filledFields = 0;
  let totalConfidence = 0;

  for (const field of fieldValues) {
    if (field?.value) {
      filledFields++;
      totalConfidence += field.confidence || 0;
    }
  }

  if (filledFields === 0) return 0;

  // Weight by both completeness and average confidence
  const completeness = (filledFields / fieldValues.length) * 100;
  const avgConfidence = totalConfidence / filledFields;

  return Math.round(completeness * 0.5 + avgConfidence * 0.5);
}

// Helper functions
function getFieldValue(field: ExtractedFieldValue | undefined): string | null {
  return field?.value ? String(field.value) : null;
}
