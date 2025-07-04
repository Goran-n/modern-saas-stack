CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(500) NOT NULL,
	"display_name" varchar(500),
	"description" text,
	"account_type" varchar(50) NOT NULL,
	"account_subtype" varchar(100),
	"account_class" varchar(100),
	"parent_account_id" uuid,
	"hierarchy_level" integer DEFAULT 0,
	"hierarchy_path" text,
	"is_parent" boolean DEFAULT false,
	"default_tax_code" varchar(50),
	"tax_type" varchar(50),
	"tax_locked" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_system_account" boolean DEFAULT false,
	"is_bank_account" boolean DEFAULT false,
	"bank_account_type" varchar(50),
	"currency_code" varchar(3),
	"enable_payments_to_account" boolean DEFAULT false,
	"show_in_expense_claims" boolean DEFAULT false,
	"add_to_watchlist" boolean DEFAULT false,
	"reporting_code" varchar(50),
	"reporting_category" varchar(100),
	"exclude_from_reports" boolean DEFAULT false,
	"category_keywords" text[],
	"typical_vendors" text[],
	"spending_patterns" jsonb DEFAULT '{}'::jsonb,
	"provider_account_ids" jsonb DEFAULT '{}'::jsonb,
	"provider_sync_data" jsonb DEFAULT '{}'::jsonb,
	"transaction_count" integer DEFAULT 0,
	"last_used_date" date,
	"total_debits" numeric(18, 2) DEFAULT '0',
	"total_credits" numeric(18, 2) DEFAULT '0',
	"budget_tracking" boolean DEFAULT false,
	"budget_owner" varchar(255),
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(50) DEFAULT 'system',
	"last_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bank_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"import_source" varchar(50) NOT NULL,
	"import_batch_id" uuid,
	"integration_id" uuid,
	"institution_name" varchar(255),
	"account_identifier" varchar(255) NOT NULL,
	"account_type" varchar(50),
	"account_currency" varchar(3) DEFAULT 'USD',
	"transaction_date" date NOT NULL,
	"posted_date" date,
	"description" text NOT NULL,
	"amount" numeric(18, 6) NOT NULL,
	"balance" numeric(18, 6),
	"bank_category" varchar(100),
	"transaction_type" varchar(50),
	"check_number" varchar(50),
	"merchant_name" varchar(500),
	"merchant_clean_name" varchar(500),
	"location" varchar(255),
	"merchant_category_code" varchar(10),
	"reference_number" varchar(100),
	"transaction_id" varchar(100),
	"match_status" varchar(20) DEFAULT 'unmatched',
	"matched_transaction_id" uuid,
	"match_confidence" numeric(3, 2),
	"matched_at" timestamp,
	"matched_by" varchar(50),
	"suggested_account_id" uuid,
	"suggested_supplier_id" uuid,
	"category_confidence" numeric(3, 2),
	"entity_extraction" jsonb DEFAULT '{}'::jsonb,
	"dedup_key" varchar(255),
	"is_duplicate" boolean DEFAULT false,
	"duplicate_of_id" uuid,
	"transaction_pattern" varchar(255),
	"is_recurring" boolean DEFAULT false,
	"recurrence_frequency" varchar(50),
	"expected_next_date" date,
	"raw_data" jsonb DEFAULT '{}'::jsonb,
	"parsing_metadata" jsonb DEFAULT '{}'::jsonb,
	"processed" boolean DEFAULT false,
	"processing_errors" jsonb DEFAULT '[]'::jsonb,
	"requires_manual_review" boolean DEFAULT false,
	"review_reason" varchar(255),
	"file_name" varchar(255),
	"file_line_number" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"batch_type" varchar(50) NOT NULL,
	"import_source" varchar(50) NOT NULL,
	"integration_id" uuid,
	"file_name" varchar(255),
	"file_size" integer,
	"file_hash" varchar(64),
	"total_records" integer DEFAULT 0,
	"processed_records" integer DEFAULT 0,
	"failed_records" integer DEFAULT 0,
	"duplicate_records" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"import_config" jsonb DEFAULT '{}'::jsonb,
	"import_results" jsonb DEFAULT '{}'::jsonb,
	"error_log" jsonb DEFAULT '[]'::jsonb,
	"imported_by" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"integration_id" uuid,
	"provider_invoice_id" varchar(255) NOT NULL,
	"invoice_type" varchar(50) NOT NULL,
	"invoice_subtype" varchar(50),
	"status" varchar(50) NOT NULL,
	"invoice_number" varchar(100),
	"reference" varchar(500),
	"repeating_invoice_id" varchar(255),
	"branding_theme_id" varchar(255),
	"invoice_url" varchar(500),
	"invoice_date" date,
	"due_date" date,
	"service_date" date,
	"period_start_date" date,
	"period_end_date" date,
	"supplier_id" uuid,
	"supplier_name" varchar(500),
	"subtotal_amount" numeric(18, 6),
	"discount_amount" numeric(18, 6),
	"discount_percentage" numeric(5, 2),
	"tax_amount" numeric(18, 6),
	"total_amount" numeric(18, 6) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"exchange_rate" numeric(18, 10),
	"base_currency_code" varchar(3),
	"base_total_amount" numeric(18, 6),
	"amount_paid" numeric(18, 6) DEFAULT '0',
	"amount_credited" numeric(18, 6) DEFAULT '0',
	"amount_due" numeric(18, 6),
	"fully_paid" boolean DEFAULT false,
	"payment_date" date,
	"payment_method" varchar(50),
	"expected_payment_date" date,
	"planned_payment_date" date,
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"line_items_count" integer DEFAULT 0,
	"tax_inclusive" boolean DEFAULT true,
	"tax_calculation_type" varchar(50),
	"line_amount_types" varchar(20) DEFAULT 'Exclusive',
	"tax_details" jsonb DEFAULT '{}'::jsonb,
	"approval_status" varchar(50),
	"approved_by" varchar(255),
	"approved_at" timestamp,
	"approval_notes" text,
	"has_attachments" boolean DEFAULT false,
	"attachment_count" integer DEFAULT 0,
	"attachment_ids" text[],
	"extracted_entities" jsonb DEFAULT '{}'::jsonb,
	"ocr_processed" boolean DEFAULT false,
	"ocr_confidence" numeric(3, 2),
	"provider_data" jsonb DEFAULT '{}'::jsonb,
	"provider_updated_at" timestamp,
	"needs_review" boolean DEFAULT false,
	"review_notes" text,
	"processing_errors" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"imported_at" timestamp DEFAULT now(),
	"last_synced_at" timestamp,
	"sync_version" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "manual_journals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"integration_id" uuid,
	"provider_journal_id" varchar(255),
	"journal_number" varchar(100),
	"journal_date" date NOT NULL,
	"narration" text,
	"status" varchar(50) DEFAULT 'draft',
	"journal_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_debits" numeric(18, 6) DEFAULT '0' NOT NULL,
	"total_credits" numeric(18, 6) DEFAULT '0' NOT NULL,
	"currency_code" varchar(3) DEFAULT 'USD',
	"exchange_rate" numeric(18, 10),
	"provider_data" jsonb DEFAULT '{}'::jsonb,
	"has_attachments" boolean DEFAULT false,
	"attachment_ids" text[],
	"posted_date" date,
	"posted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(50),
	"last_synced_at" timestamp,
	CONSTRAINT "check_journal_balance" CHECK ("manual_journals"."total_debits" = "manual_journals"."total_credits")
);
--> statement-breakpoint
CREATE TABLE "reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bank_statement_id" uuid NOT NULL,
	"transaction_id" uuid,
	"match_type" varchar(50) NOT NULL,
	"match_confidence" numeric(3, 2),
	"match_amount" numeric(18, 6) NOT NULL,
	"is_split" boolean DEFAULT false,
	"split_group_id" uuid,
	"match_method" varchar(100),
	"match_rules" jsonb DEFAULT '{}'::jsonb,
	"user_confirmed" boolean DEFAULT false,
	"confirmed_by" uuid,
	"confirmed_at" timestamp,
	"override_reason" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"display_name" varchar(500),
	"legal_name" varchar(500),
	"trading_names" text[],
	"first_name" varchar(255),
	"last_name" varchar(255),
	"external_ids" jsonb DEFAULT '[]'::jsonb,
	"company_number" varchar(50),
	"primary_email" varchar(255),
	"additional_emails" text[],
	"primary_phone" varchar(100),
	"additional_phones" text[],
	"website" varchar(500),
	"address_line1" varchar(500),
	"address_line2" varchar(500),
	"address_line3" varchar(500),
	"address_line4" varchar(500),
	"city" varchar(255),
	"state_province" varchar(255),
	"postal_code" varchar(50),
	"country_code" varchar(2),
	"country_name" varchar(100),
	"shipping_addresses" jsonb DEFAULT '[]'::jsonb,
	"billing_addresses" jsonb DEFAULT '[]'::jsonb,
	"tax_number" varchar(100),
	"tax_number_type" varchar(50),
	"secondary_tax_numbers" jsonb DEFAULT '{}'::jsonb,
	"tax_exempt" boolean DEFAULT false,
	"tax_exemption_reason" varchar(255),
	"default_tax_type_sales" varchar(50),
	"default_tax_type_purchases" varchar(50),
	"default_currency" varchar(3),
	"bank_account_name" varchar(255),
	"bank_account_number" varchar(100),
	"bank_account_type" varchar(50),
	"bank_name" varchar(255),
	"bank_branch" varchar(255),
	"bank_swift_code" varchar(20),
	"bank_routing_number" varchar(50),
	"additional_bank_accounts" jsonb DEFAULT '[]'::jsonb,
	"payment_terms_days" integer,
	"payment_terms_type" varchar(50),
	"payment_terms_description" text,
	"credit_limit" numeric(18, 2),
	"supplier_type" varchar(50) DEFAULT 'supplier',
	"is_active" boolean DEFAULT true,
	"is_individual" boolean DEFAULT false,
	"contact_status" varchar(20) DEFAULT 'ACTIVE',
	"provider_ids" jsonb DEFAULT '{}'::jsonb,
	"provider_sync_data" jsonb DEFAULT '{}'::jsonb,
	"normalized_name" varchar(500),
	"name_tokens" text[],
	"industry_code" varchar(50),
	"supplier_size" varchar(20),
	"tags" text[],
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"data_quality_score" numeric(3, 2),
	"verified_date" date,
	"verification_source" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(50),
	"last_synced_at" timestamp,
	"sync_version" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transaction_type" varchar(50);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "account_code" varchar(50);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "supplier_name" varchar(500);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "source_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_method" varchar(50);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "check_number" varchar(50);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "overpayment_id" varchar(255);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "prepayment_id" varchar(255);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "url" varchar(500);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "statement_date" date;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "statement_description" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "statement_balance" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "bank_statement_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "enriched_description" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "merchant_name" varchar(500);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "merchant_category" varchar(100);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location" varchar(255);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "auto_categorized" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category_confidence" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "suggested_account_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "suggested_supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_split" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "parent_transaction_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "split_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "original_currency" varchar(3);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "original_amount" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "exchange_rate_date" date;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "related_document_ids" uuid[];--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "attachment_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "has_receipt" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "needs_review" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "review_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "confidence_score" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "metadata" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_account_id_accounts_id_fk" FOREIGN KEY ("parent_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_matched_transaction_id_transactions_id_fk" FOREIGN KEY ("matched_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_suggested_account_id_accounts_id_fk" FOREIGN KEY ("suggested_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_suggested_supplier_id_suppliers_id_fk" FOREIGN KEY ("suggested_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_duplicate_of_id_bank_statements_id_fk" FOREIGN KEY ("duplicate_of_id") REFERENCES "public"."bank_statements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_journals" ADD CONSTRAINT "manual_journals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_journals" ADD CONSTRAINT "manual_journals_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_journals" ADD CONSTRAINT "manual_journals_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_bank_statement_id_bank_statements_id_fk" FOREIGN KEY ("bank_statement_id") REFERENCES "public"."bank_statements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_account_code" ON "accounts" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_provider_account" ON "accounts" USING btree ("tenant_id","provider_account_ids");--> statement-breakpoint
CREATE INDEX "idx_accounts_tenant_type" ON "accounts" USING btree ("tenant_id","account_type");--> statement-breakpoint
CREATE INDEX "idx_accounts_parent" ON "accounts" USING btree ("parent_account_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_active" ON "accounts" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_accounts_hierarchy" ON "accounts" USING btree ("tenant_id","hierarchy_path");--> statement-breakpoint
CREATE INDEX "idx_bank_statements_tenant_date" ON "bank_statements" USING btree ("tenant_id","transaction_date");--> statement-breakpoint
CREATE INDEX "idx_bank_statements_unmatched" ON "bank_statements" USING btree ("tenant_id","match_status");--> statement-breakpoint
CREATE INDEX "idx_bank_statements_account" ON "bank_statements" USING btree ("tenant_id","account_identifier");--> statement-breakpoint
CREATE INDEX "idx_bank_statements_amount" ON "bank_statements" USING btree ("tenant_id","amount");--> statement-breakpoint
CREATE INDEX "idx_bank_statements_merchant" ON "bank_statements" USING btree ("tenant_id","merchant_clean_name");--> statement-breakpoint
CREATE INDEX "idx_bank_statements_duplicate" ON "bank_statements" USING btree ("tenant_id","is_duplicate");--> statement-breakpoint
CREATE INDEX "idx_bank_statements_review" ON "bank_statements" USING btree ("tenant_id","requires_manual_review");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_bank_transaction" ON "bank_statements" USING btree ("tenant_id","account_identifier","transaction_date","amount","dedup_key");--> statement-breakpoint
CREATE INDEX "idx_import_batches_tenant" ON "import_batches" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_import_batches_status" ON "import_batches" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_import_batches_type" ON "import_batches" USING btree ("tenant_id","batch_type");--> statement-breakpoint
CREATE INDEX "idx_invoices_tenant_date" ON "invoices" USING btree ("tenant_id","invoice_date");--> statement-breakpoint
CREATE INDEX "idx_invoices_tenant_supplier" ON "invoices" USING btree ("tenant_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_tenant_status" ON "invoices" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_invoices_tenant_due" ON "invoices" USING btree ("tenant_id","due_date");--> statement-breakpoint
CREATE INDEX "idx_invoices_needs_review" ON "invoices" USING btree ("tenant_id","needs_review");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_provider_invoice" ON "invoices" USING btree ("tenant_id","integration_id","provider_invoice_id");--> statement-breakpoint
CREATE INDEX "idx_journals_tenant_date" ON "manual_journals" USING btree ("tenant_id","journal_date");--> statement-breakpoint
CREATE INDEX "idx_journals_tenant_status" ON "manual_journals" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_journals_tenant_number" ON "manual_journals" USING btree ("tenant_id","journal_number");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_provider_journal" ON "manual_journals" USING btree ("tenant_id","integration_id","provider_journal_id");--> statement-breakpoint
CREATE INDEX "idx_reconciliations_statement" ON "reconciliations" USING btree ("bank_statement_id");--> statement-breakpoint
CREATE INDEX "idx_reconciliations_transaction" ON "reconciliations" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_reconciliations_split_group" ON "reconciliations" USING btree ("split_group_id");--> statement-breakpoint
CREATE INDEX "idx_reconciliations_tenant_date" ON "reconciliations" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_statement_reconciliation" ON "reconciliations" USING btree ("bank_statement_id","transaction_id");--> statement-breakpoint
CREATE INDEX "idx_suppliers_tenant_name" ON "suppliers" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_suppliers_normalized" ON "suppliers" USING btree ("tenant_id","normalized_name");--> statement-breakpoint
CREATE INDEX "idx_suppliers_tax_number" ON "suppliers" USING btree ("tenant_id","tax_number");--> statement-breakpoint
CREATE INDEX "idx_suppliers_email" ON "suppliers" USING btree ("tenant_id","primary_email");--> statement-breakpoint
CREATE INDEX "idx_suppliers_active" ON "suppliers" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_suppliers_external_ids" ON "suppliers" USING gin ("external_ids");--> statement-breakpoint
CREATE INDEX "idx_suppliers_status" ON "suppliers" USING btree ("tenant_id","contact_status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_provider_supplier" ON "suppliers" USING btree ("tenant_id","provider_ids");--> statement-breakpoint
CREATE INDEX "transactions_supplier_idx" ON "transactions" USING btree ("tenant_id","supplier_id");--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" USING btree ("tenant_id","account_id");--> statement-breakpoint
CREATE INDEX "transactions_invoice_idx" ON "transactions" USING btree ("source_invoice_id");--> statement-breakpoint
CREATE INDEX "transactions_needs_review_idx" ON "transactions" USING btree ("tenant_id","needs_review");