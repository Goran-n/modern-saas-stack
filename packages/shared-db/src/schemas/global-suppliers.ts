import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { suppliers } from "./suppliers";

// Enums
export const logoFetchStatusEnum = pgEnum("logo_fetch_status", [
  "pending",
  "success",
  "not_found",
  "failed",
]);

// Global suppliers table - shared across all tenants
export const globalSuppliers = pgTable(
  "global_suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identifiers
    companyNumber: text("company_number"),
    vatNumber: text("vat_number"),

    // Basic info
    canonicalName: text("canonical_name").notNull(),
    primaryDomain: text("primary_domain"),

    // Logo information
    logoUrl: text("logo_url"),
    logoFetchedAt: timestamp("logo_fetched_at", { withTimezone: true }),
    logoFetchStatus: logoFetchStatusEnum("logo_fetch_status")
      .notNull()
      .default("pending"),
    logoFetchAttempts: integer("logo_fetch_attempts").notNull().default(0),
    logoLastFailedAt: timestamp("logo_last_failed_at", { withTimezone: true }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Indexes
    companyNumberIdx: index("idx_global_suppliers_company_number").on(
      table.companyNumber,
    ),
    vatNumberIdx: index("idx_global_suppliers_vat_number").on(table.vatNumber),
    primaryDomainIdx: index("idx_global_suppliers_primary_domain").on(
      table.primaryDomain,
    ),
    logoFetchStatusIdx: index("idx_global_suppliers_logo_fetch_status").on(
      table.logoFetchStatus,
    ),

    // Unique constraints
    uniqueCompanyNumber: uniqueIndex("unique_global_company_number")
      .on(table.companyNumber)
      .where(sql`company_number IS NOT NULL`),

    // Note: No unique constraint on VAT number as multiple trading names
    // can share the same VAT number
  }),
);

// Relations
export const globalSuppliersRelations = relations(
  globalSuppliers,
  ({ many }) => ({
    tenantSuppliers: many(suppliers),
  }),
);