import type { CompanyProfile, ExtractedFields } from "@figgy/shared-db";
import { DataSource, type SupplierIngestionRequest } from "../types";
import type { ExtractedVendorData } from "../utils/document-extraction";

export interface InvoiceSupplierData {
  id: string;
  vendorData: ExtractedVendorData;
  companyProfile?: CompanyProfile | null;
  extractedFields?: ExtractedFields | null;
}

/**
 * Transform invoice extraction data to supplier ingestion format
 */
export function transformInvoiceToSupplier(
  invoice: InvoiceSupplierData,
  tenantId: string,
  userId?: string,
): SupplierIngestionRequest | null {
  const { vendorData } = invoice;

  // Must have at least a name
  if (!vendorData.name) {
    return null;
  }

  // Use identifiers from vendorData or fallback to companyProfile
  const companyNumber =
    vendorData.companyNumber ||
    invoice.companyProfile?.taxIdentifiers?.companyNumber ||
    null;
  const vatNumber =
    vendorData.vatNumber ||
    invoice.companyProfile?.taxIdentifiers?.vatNumber ||
    null;

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
      country: address.country || "GB",
    });
  } else if (address.line1) {
    // If we have address but no city, use a default
    const defaultCity = address.country === "US" ? "Unknown City" : "Unknown";
    request.data.addresses.push({
      line1: address.line1,
      line2: null,
      city: defaultCity,
      postalCode: address.postalCode || null,
      country: address.country || "GB",
    });
  }

  // Add contacts if available
  const { contacts } = vendorData;
  if (contacts.email) {
    request.data.contacts.push({
      type: "email",
      value: contacts.email,
      isPrimary: true,
    });
  }

  if (contacts.phone) {
    request.data.contacts.push({
      type: "phone",
      value: contacts.phone,
      isPrimary: !contacts.email, // Primary if no email
    });
  }

  if (contacts.website) {
    request.data.contacts.push({
      type: "website",
      value: contacts.website,
      isPrimary: false,
    });
  }

  // Add bank account if available from extracted fields
  if (invoice.extractedFields?.bankAccount?.value) {
    const bankAccountValue = invoice.extractedFields.bankAccount.value;

    // Parse bank account data - it might be a string or structured object
    if (typeof bankAccountValue === "string") {
      // Try to parse IBAN or account number from string
      const ibanRegex = /[A-Z]{2}\d{2}[A-Z0-9]+/;
      const ibanMatch = bankAccountValue.match(ibanRegex);

      if (ibanMatch) {
        request.data.bankAccounts.push({
          iban: ibanMatch[0],
          bankName: null,
          accountNumber: null,
          sortCode: null,
          accountName: null,
        });
      } else {
        // Treat as account number
        request.data.bankAccounts.push({
          accountNumber: bankAccountValue,
          iban: null,
          bankName: null,
          sortCode: null,
          accountName: null,
        });
      }
    } else if (
      typeof bankAccountValue === "object" &&
      bankAccountValue !== null
    ) {
      // Handle structured bank account data
      request.data.bankAccounts.push({
        iban: bankAccountValue.iban || null,
        accountNumber: bankAccountValue.accountNumber || null,
        bankName: bankAccountValue.bankName || null,
        sortCode: bankAccountValue.sortCode || null,
        accountName: bankAccountValue.accountName || null,
      });
    }
  }

  // Also check company profile for bank accounts
  if (
    invoice.companyProfile?.bankAccounts &&
    invoice.companyProfile.bankAccounts.length > 0
  ) {
    for (const bankAccount of invoice.companyProfile.bankAccounts) {
      // Avoid duplicates - check if not already added
      const isDuplicate = request.data.bankAccounts.some(
        (ba) =>
          ba.iban === bankAccount.iban ||
          ba.accountNumber === bankAccount.accountNumber,
      );

      if (!isDuplicate && (bankAccount.iban || bankAccount.accountNumber)) {
        request.data.bankAccounts.push({
          iban: bankAccount.iban || null,
          accountNumber: bankAccount.accountNumber || null,
          bankName: bankAccount.bankName || null,
          sortCode: bankAccount.swiftCode || null, // Map SWIFT to sort code
          accountName: null,
        });
      }
    }
  }

  return request;
}
