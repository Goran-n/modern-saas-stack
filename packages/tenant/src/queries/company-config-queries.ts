import type { CompanyConfig } from "@figgy/types";
import { eq } from "@figgy/shared-db";
import { tenants } from "@figgy/shared-db";
import { getDb } from "../db";
import { createDefaultCompanyConfig } from "../types/company-config";

/**
 * Get company configuration at a specific date
 * This handles historical data by checking validFrom/validTo dates
 */
export async function getCompanyConfigAtDate(
  tenantId: string,
  date: Date
): Promise<CompanyConfig> {
  const db = getDb();
  
  // Get tenant with settings
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
    
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }
  
  // Get company config from settings
  const settings = tenant.settings as Record<string, any>;
  const currentConfig = (settings?.companyConfig as CompanyConfig) || createDefaultCompanyConfig();
  
  // Filter configuration to only include items valid at the specified date
  return {
    names: {
      legal: currentConfig.names.legal,
      trading: currentConfig.names.trading,
      previous: currentConfig.names.previous.filter(n => {
        const validFrom = n.validFrom ? new Date(n.validFrom) : null;
        const validTo = n.validTo ? new Date(n.validTo) : null;
        return (!validFrom || validFrom <= date) && (!validTo || validTo >= date);
      }),
      abbreviations: currentConfig.names.abbreviations,
      misspellings: currentConfig.names.misspellings,
      groupName: currentConfig.names.groupName
    },
    identifiers: {
      vatNumbers: currentConfig.identifiers.vatNumbers.filter(v => {
        const validFrom = v.validFrom ? new Date(v.validFrom) : null;
        const validTo = v.validTo ? new Date(v.validTo) : null;
        return v.isActive && (!validFrom || validFrom <= date) && (!validTo || validTo >= date);
      }),
      companyNumbers: currentConfig.identifiers.companyNumbers.filter(c => {
        const validFrom = c.validFrom ? new Date(c.validFrom) : null;
        const validTo = c.validTo ? new Date(c.validTo) : null;
        return (!validFrom || validFrom <= date) && (!validTo || validTo >= date);
      }),
      taxReferences: currentConfig.identifiers.taxReferences
    },
    addresses: {
      registered: currentConfig.addresses.registered && 
        currentConfig.addresses.registered.isActive ? 
        currentConfig.addresses.registered : null,
      trading: currentConfig.addresses.trading.filter(a => a.isActive),
      billing: currentConfig.addresses.billing.filter(a => a.isActive),
      historical: currentConfig.addresses.historical
    },
    matching: currentConfig.matching,
    business: currentConfig.business,
    vat: currentConfig.vat
  };
}

/**
 * Get company configuration
 */
export async function getCompanyConfig(tenantId: string): Promise<CompanyConfig> {
  const db = getDb();
  
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
    
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }
  
  const settings = tenant.settings as Record<string, any>;
  return (settings?.companyConfig as CompanyConfig) || createDefaultCompanyConfig();
}