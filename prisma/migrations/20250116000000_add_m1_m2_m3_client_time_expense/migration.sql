-- M1: Client Management
CREATE TABLE IF NOT EXISTS "clients" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "type" VARCHAR(32) NOT NULL DEFAULT 'individual',
    "name" VARCHAR(500) NOT NULL,
    "billing_address" TEXT,
    "npwp" VARCHAR(64),
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "internal_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "client_contacts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL REFERENCES "clients"("id"),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(64),
    "role" VARCHAR(64),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

-- M2: Time Tracking
CREATE TABLE IF NOT EXISTS "time_entries" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL REFERENCES "cases"("id"),
    "task_id" UUID REFERENCES "tasks"("id"),
    "user_id" UUID NOT NULL REFERENCES "users"("id"),
    "description" TEXT,
    "hours" DECIMAL(6, 2) NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "rate" DECIMAL(18, 2),
    "approved_at" TIMESTAMPTZ(6),
    "work_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "rate_cards" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id"),
    "rate" DECIMAL(18, 2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- M3: Expense per Case
CREATE TABLE IF NOT EXISTS "case_expenses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL REFERENCES "cases"("id"),
    "description" VARCHAR(500) NOT NULL,
    "amount" DECIMAL(18, 2) NOT NULL,
    "proof_url" VARCHAR(500),
    "reimbursable" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMPTZ(6),
    "invoice_id" UUID REFERENCES "invoices"("id"),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

-- Audit log (untuk W2 case audit)
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "entity" VARCHAR(64) NOT NULL,
    "entity_id" UUID,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Case: stage, parties; relasi client_id -> clients (bukan users)
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "stage" VARCHAR(32) DEFAULT 'intake';
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "parties" JSONB;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'cases' AND constraint_name = 'cases_client_id_fkey'
    ) THEN
        ALTER TABLE "cases" DROP CONSTRAINT "cases_client_id_fkey";
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

UPDATE "cases" SET "client_id" = NULL WHERE "client_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "clients" c WHERE c.id = cases.client_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'cases' AND constraint_name = 'cases_client_id_fkey'
    ) THEN
        ALTER TABLE "cases" ADD CONSTRAINT "cases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id");
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Task: description, due_date, sla_breach_at, assignee_id
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "due_date" DATE;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "sla_breach_at" TIMESTAMPTZ(6);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignee_id" UUID REFERENCES "users"("id");

-- Document: folder, version, client_visible
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "folder" VARCHAR(255);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "version" SMALLINT DEFAULT 1;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "client_visible" BOOLEAN DEFAULT false;

-- Invoice: invoice_number, paid_amount, client_id, due_date; status diperlebar
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoice_number" VARCHAR(64) UNIQUE;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paid_amount" DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "client_id" UUID REFERENCES "clients"("id");
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "due_date" DATE;
ALTER TABLE "invoices" ALTER COLUMN "status" TYPE VARCHAR(32);
