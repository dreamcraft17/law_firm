-- Enterprise: Multi-tenancy, 2FA, session device, case-level permissions, numbering, export

-- Firms (tenant)
CREATE TABLE IF NOT EXISTS "firms" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(64) NOT NULL UNIQUE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6)
);

-- Firm config (branding, numbering prefix, tax, payment gateway)
CREATE TABLE IF NOT EXISTS "firm_configs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL REFERENCES "firms"("id") ON DELETE CASCADE,
    "key" VARCHAR(128) NOT NULL,
    "value" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    UNIQUE("firm_id", "key")
);

-- Number sequences (case / invoice numbering per firm per scope)
CREATE TABLE IF NOT EXISTS "number_sequences" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL REFERENCES "firms"("id") ON DELETE CASCADE,
    "entity_type" VARCHAR(32) NOT NULL,
    "scope_key" VARCHAR(64) NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    UNIQUE("firm_id", "entity_type", "scope_key")
);

-- Export jobs (data retention / GDPR export)
CREATE TABLE IF NOT EXISTS "export_jobs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL REFERENCES "firms"("id") ON DELETE CASCADE,
    "requested_by" UUID NOT NULL,
    "export_type" VARCHAR(32) NOT NULL,
    "entity_id" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "file_url" VARCHAR(2048),
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "completed_at" TIMESTAMPTZ(6)
);

-- Session: device list (user_agent, device_id, device_label, ip_address, last_active_at)
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_agent" VARCHAR(500);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "device_id" VARCHAR(255);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "device_label" VARCHAR(255);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(64);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMPTZ(6);

-- User: firm_id, 2FA (TOTP)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firm_id" UUID REFERENCES "firms"("id") ON DELETE SET NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Role: firm_id (null = system role), unique (firm_id, name)
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "firm_id" UUID REFERENCES "firms"("id") ON DELETE CASCADE;
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "roles_firm_id_name_key" ON "roles" ("firm_id", "name");

-- Case-level permission (view / edit / billing / documents)
CREATE TABLE IF NOT EXISTS "case_access" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_billing" BOOLEAN NOT NULL DEFAULT false,
    "can_documents" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    UNIQUE("case_id", "user_id")
);

-- firm_id on main entities
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "firm_id" UUID REFERENCES "firms"("id") ON DELETE SET NULL;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "firm_id" UUID REFERENCES "firms"("id") ON DELETE SET NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "saved_views" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "rate_rules" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "recurring_task_templates" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "retention_policies" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "custom_fields" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "firm_id" UUID;

-- WorkflowTemplate: firm_id, unique (firm_id, slug)
ALTER TABLE "workflow_templates" ADD COLUMN IF NOT EXISTS "firm_id" UUID;
ALTER TABLE "workflow_templates" DROP CONSTRAINT IF EXISTS "workflow_templates_slug_key";
CREATE UNIQUE INDEX IF NOT EXISTS "workflow_templates_firm_id_slug_key" ON "workflow_templates" ("firm_id", "slug");

-- Invoice: allow same invoice_number across firms (drop global unique if exists)
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_invoice_number_key";

-- RetentionPolicy: add @db types if missing (retain_years, is_active)
-- No-op if columns already have types
