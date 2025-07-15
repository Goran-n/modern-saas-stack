import { AccountingDocument, CompanyProfile } from '../types';
import { logger } from '@kibly/utils';

export class CompanyProfileExtractor {
  extract(document: AccountingDocument): CompanyProfile | undefined {
    if (!document.vendorName) {
      return undefined;
    }

    const normalizedName = this.normalizeCompanyName(document.vendorName);
    const domains = this.extractDomains(document.vendorEmail, document.vendorWebsite);
    
    const profile: CompanyProfile = {
      taxIdentifiers: {
        vatNumber: document.vendorTaxId?.match(/^[A-Z]{2}\d+/)?.[0] ?? undefined,
        taxId: document.vendorTaxId ?? undefined,
        companyNumber: undefined,
        countryCode: this.inferCountryCode(document),
      },
      legalName: document.vendorName,
      tradingNames: [],
      addresses: document.vendorAddress ? [{
        type: 'billing' as const,
        line1: document.vendorAddress,
        line2: undefined,
        city: '',
        country: '',
        confidence: 80,
      }] : [],
      primaryEmail: document.vendorEmail || undefined,
      domains,
      phones: document.vendorPhone ? [document.vendorPhone] : [],
      bankAccounts: [],
      paymentMethods: document.paymentMethod ? [document.paymentMethod] : [],
      defaultCurrency: document.currency || undefined,
      normalizedName,
      matchingKeys: this.generateMatchingKeys(normalizedName, document.vendorTaxId, domains),
    };

    logger.info('Company profile extracted', {
      vendorName: document.vendorName,
      normalizedName,
      domainsCount: domains.length,
    });

    return profile;
  }

  private normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*(ltd|limited|inc|incorporated|llc|gmbh|ab|as|oy|plc|corp|corporation)\s*\.?$/i, '')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private extractDomains(email?: string | null, website?: string | null): string[] {
    const domains: string[] = [];
    
    if (email) {
      const domain = email.split('@')[1];
      if (domain) domains.push(domain);
    }
    
    if (website) {
      const domain = website.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (domain) domains.push(domain);
    }
    
    return [...new Set(domains)];
  }

  private generateMatchingKeys(normalizedName: string, taxId?: string | null, domains?: string[]): string[] {
    const keys: string[] = [normalizedName];
    
    if (taxId) {
      keys.push(taxId.toLowerCase().replace(/[^\w]/g, ''));
    }
    
    if (domains) {
      keys.push(...domains);
    }
    
    return keys;
  }

  private inferCountryCode(document: AccountingDocument): string {
    // Simple inference based on currency or tax format
    if (document.currency === 'USD') return 'US';
    if (document.currency === 'EUR') return 'EU';
    if (document.currency === 'GBP') return 'GB';
    if (document.vendorTaxId?.match(/^[A-Z]{2}\d+/)) {
      return document.vendorTaxId.substring(0, 2);
    }
    return 'XX';
  }
}