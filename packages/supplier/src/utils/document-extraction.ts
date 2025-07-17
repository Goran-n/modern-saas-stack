import type { ExtractedFields, ExtractedFieldValue } from '@kibly/shared-db';

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
export function extractVendorData(fields: ExtractedFields | null | undefined): ExtractedVendorData {
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
    companyNumber: getFieldValue((fields as any).vendorCompanyNumber),
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
 */
export function extractVendorDataWithConfidence(
  fields: ExtractedFields | null | undefined
): ExtractedVendorData {
  const vendorData = extractVendorData(fields);
  
  if (!fields) {
    return vendorData;
  }

  const confidence: ExtractedVendorData['confidence'] = {
    name: getFieldConfidence(fields.vendorName),
    companyNumber: getFieldConfidence((fields as any).vendorCompanyNumber),
    vatNumber: getFieldConfidence(fields.vendorTaxId),
    address: getFieldConfidence(fields.vendorAddress),
    email: getFieldConfidence(fields.vendorEmail),
    phone: getFieldConfidence(fields.vendorPhone),
    website: getFieldConfidence(fields.vendorWebsite),
  };

  return {
    ...vendorData,
    confidence,
  };
}

/**
 * Extract structured address from vendor fields
 */
export function extractVendorAddress(fields: ExtractedFields | null | undefined): ExtractedVendorData['address'] {
  return extractVendorData(fields).address;
}

/**
 * Check if vendor data meets minimum requirements for supplier creation
 */
export function hasMinimumVendorData(fields: ExtractedFields | null | undefined): boolean {
  if (!fields) return false;
  
  const data = extractVendorData(fields);
  
  // Need name and at least one identifier
  return !!data.name && (!!data.vatNumber || !!data.companyNumber);
}

/**
 * Get confidence score for vendor data completeness
 */
export function getVendorDataCompleteness(fields: ExtractedFields | null | undefined): number {
  if (!fields) return 0;
  
  const vendorFields = [
    'vendorName',
    'vendorTaxId',
    'vendorAddress',
    'vendorCity',
    'vendorPostalCode',
    'vendorCountry',
    'vendorEmail',
    'vendorPhone',
  ];
  
  let filledFields = 0;
  let totalConfidence = 0;
  
  for (const fieldName of vendorFields) {
    const field = (fields as any)[fieldName] as ExtractedFieldValue | undefined;
    if (field?.value) {
      filledFields++;
      totalConfidence += field.confidence || 0;
    }
  }
  
  if (filledFields === 0) return 0;
  
  // Weight by both completeness and average confidence
  const completeness = (filledFields / vendorFields.length) * 100;
  const avgConfidence = totalConfidence / filledFields;
  
  return Math.round((completeness * 0.5) + (avgConfidence * 0.5));
}

// Helper functions
function getFieldValue(field: ExtractedFieldValue | undefined): string | null {
  return field?.value ? String(field.value) : null;
}

function getFieldConfidence(field: ExtractedFieldValue | undefined): number | undefined {
  return field?.confidence;
}