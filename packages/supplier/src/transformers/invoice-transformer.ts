import { SupplierIngestionRequest, DataSource } from '../types';
import type { ExtractedVendorData } from '../utils/document-extraction';
import type { CompanyProfile } from '@kibly/shared-db';

export interface InvoiceSupplierData {
  id: string;
  vendorData: ExtractedVendorData;
  companyProfile?: CompanyProfile | null;
}

/**
 * Transform invoice extraction data to supplier ingestion format
 */
export function transformInvoiceToSupplier(
  invoice: InvoiceSupplierData,
  tenantId: string,
  userId?: string
): SupplierIngestionRequest | null {
  const { vendorData } = invoice;
  
  // Must have at least a name
  if (!vendorData.name) {
    return null;
  }

  // Use identifiers from vendorData or fallback to companyProfile
  const companyNumber = vendorData.companyNumber || 
    invoice.companyProfile?.taxIdentifiers?.companyNumber || null;
  const vatNumber = vendorData.vatNumber || 
    invoice.companyProfile?.taxIdentifiers?.vatNumber || null;

  // No longer require tax identifiers - scoring system will handle validation

  const request: SupplierIngestionRequest = {
    source: DataSource.INVOICE,
    sourceId: invoice.id,
    tenantId,
    userId,
    data: {
      identifiers: {
        companyNumber,
        vatNumber,
      },
      name: vendorData.name,
      addresses: [],
      contacts: [],
      bankAccounts: [],
    },
  };

  // Add address if available
  const { address } = vendorData;
  if (address.line1 && address.city) {
    request.data.addresses.push({
      line1: address.line1,
      line2: null,
      city: address.city,
      postalCode: address.postalCode || null,
      country: address.country || 'GB',
    });
  } else if (address.line1) {
    // If we have address but no city, use a default
    const defaultCity = address.country === 'US' ? 'Unknown City' : 'Unknown';
    request.data.addresses.push({
      line1: address.line1,
      line2: null,
      city: defaultCity,
      postalCode: address.postalCode || null,
      country: address.country || 'GB',
    });
  }

  // Add contacts if available
  const { contacts } = vendorData;
  if (contacts.email) {
    request.data.contacts.push({
      type: 'email',
      value: contacts.email,
      isPrimary: true,
    });
  }

  if (contacts.phone) {
    request.data.contacts.push({
      type: 'phone',
      value: contacts.phone,
      isPrimary: !contacts.email, // Primary if no email
    });
  }

  if (contacts.website) {
    request.data.contacts.push({
      type: 'website',
      value: contacts.website,
      isPrimary: false,
    });
  }

  return request;
}