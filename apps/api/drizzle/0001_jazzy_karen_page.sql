CREATE TABLE "sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_type" "sync_job_type" NOT NULL,
	"status" "sync_job_status" DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"result" jsonb,
	"error" varchar(1000),
	"started_at" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"expense_account_id" varchar(255),
	"expense_account_name" varchar(255),
	"expense_account_code" varchar(50),
	"expense_account_type" varchar(100),
	"line_amount" numeric(18, 6) NOT NULL,
	"line_description" varchar(255),
	"item_id" varchar(255),
	"quantity" numeric(10, 4),
	"unit_amount" numeric(18, 6),
	"tax_type" varchar(50),
	"tax_amount" numeric(18, 6),
	"tax_rate" numeric(5, 4),
	"tax_code" varchar(50),
	"is_tax_inclusive" boolean DEFAULT false,
	"contact_id" varchar(255),
	"contact_name" varchar(255),
	"contact_type" varchar(50),
	"tracking_categories" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"integration_id" uuid,
	"provider_transaction_id" varchar(255),
	"provider_type" "provider_type" NOT NULL,
	"transaction_date" date NOT NULL,
	"posted_date" date,
	"amount" numeric(18, 6) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"exchange_rate" numeric(10, 6),
	"base_currency_amount" numeric(18, 6),
	"source_account_id" varchar(255),
	"source_account_name" varchar(255),
	"source_account_type" varchar(100),
	"balance_after" numeric(18, 6),
	"transaction_fee" numeric(18, 6),
	"raw_description" text,
	"transaction_reference" varchar(255),
	"memo" text,
	"is_reconciled" boolean DEFAULT false NOT NULL,
	"reconciled_at" timestamp,
	"reconciled_by" uuid,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"provider_data" jsonb DEFAULT '{}' NOT NULL,
	"enrichment_status" "enrichment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	CONSTRAINT "transactions_unique_provider" UNIQUE("tenant_id","integration_id","provider_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_line_items" ADD CONSTRAINT "transaction_line_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_line_items" ADD CONSTRAINT "transaction_line_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sync_jobs_status_priority_idx" ON "sync_jobs" USING btree ("status","priority" DESC NULLS LAST,"created_at");--> statement-breakpoint
CREATE INDEX "sync_jobs_integration_idx" ON "sync_jobs" USING btree ("integration_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sync_jobs_tenant_idx" ON "sync_jobs" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "line_items_transaction_idx" ON "transaction_line_items" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "line_items_tenant_account_idx" ON "transaction_line_items" USING btree ("tenant_id","expense_account_id");--> statement-breakpoint
CREATE INDEX "line_items_contact_idx" ON "transaction_line_items" USING btree ("tenant_id","contact_id");--> statement-breakpoint
CREATE INDEX "transactions_tenant_date_idx" ON "transactions" USING btree ("tenant_id","transaction_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transactions_tenant_status_idx" ON "transactions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "transactions_integration_sync_idx" ON "transactions" USING btree ("integration_id","synced_at");--> statement-breakpoint
CREATE INDEX "transactions_reconciled_idx" ON "transactions" USING btree ("tenant_id","is_reconciled");