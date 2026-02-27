-- Billing W5+: trust, write-off, credit note, tax, rate rules, payment export
-- Task workflow: dependencies, milestones, recurring templates
-- Event: case/task link, attendees, reminder

-- Task: recurring template FK
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "recurring_template_id" UUID;

-- Task dependencies
CREATE TABLE IF NOT EXISTS "task_dependencies" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
    "depends_on_task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    UNIQUE("task_id", "depends_on_task_id")
);

-- Case milestones
CREATE TABLE IF NOT EXISTS "case_milestones" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "due_date" DATE,
    "completed_at" TIMESTAMPTZ(6),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Recurring task templates (before FK from tasks)
CREATE TABLE IF NOT EXISTS "recurring_task_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "case_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "assignee_id" UUID,
    "recurrence" VARCHAR(64) NOT NULL,
    "next_run_at" TIMESTAMPTZ(6) NOT NULL,
    "last_generated_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6)
);

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurring_template_id_fkey"
  FOREIGN KEY ("recurring_template_id") REFERENCES "recurring_task_templates"("id");

-- Event: case_id, task_id, location, reminder_minutes
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "case_id" UUID REFERENCES "cases"("id");
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "task_id" UUID REFERENCES "tasks"("id");
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "location" VARCHAR(500);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "reminder_minutes" SMALLINT;

-- Event attendees
CREATE TABLE IF NOT EXISTS "event_attendees" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
    "attendee_type" VARCHAR(32) NOT NULL,
    "user_id" UUID,
    "client_contact_id" UUID,
    "reminder_minutes" SMALLINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Invoice: write-off, tax, currency, retainer drawdown
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "write_off_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "write_off_reason" VARCHAR(255);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "write_off_at" TIMESTAMPTZ(6);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(5,2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(8) NOT NULL DEFAULT 'IDR';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "retainer_drawdown_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- Client trust account
CREATE TABLE IF NOT EXISTS "client_trust_accounts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL UNIQUE REFERENCES "clients"("id") ON DELETE CASCADE,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'IDR',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Trust transactions
CREATE TABLE IF NOT EXISTS "trust_transactions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL REFERENCES "client_trust_accounts"("id") ON DELETE CASCADE,
    "type" VARCHAR(32) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reference_id" UUID,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Credit notes
CREATE TABLE IF NOT EXISTS "credit_notes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
    "amount" DECIMAL(18,2) NOT NULL,
    "reason" VARCHAR(500),
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Rate rules
CREATE TABLE IF NOT EXISTS "rate_rules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "case_id" UUID,
    "user_id" UUID,
    "activity_type" VARCHAR(64),
    "rate_type" VARCHAR(32) NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6)
);

-- Payment export (reconciliation / Xero/QuickBooks)
CREATE TABLE IF NOT EXISTS "payment_exports" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "invoice_id" UUID REFERENCES "invoices"("id") ON DELETE SET NULL,
    "provider" VARCHAR(32) NOT NULL,
    "external_id" VARCHAR(255),
    "payload" JSONB,
    "exported_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "task_dependencies_task_id_idx" ON "task_dependencies"("task_id");
CREATE INDEX IF NOT EXISTS "case_milestones_case_id_idx" ON "case_milestones"("case_id");
CREATE INDEX IF NOT EXISTS "event_attendees_event_id_idx" ON "event_attendees"("event_id");
CREATE INDEX IF NOT EXISTS "events_case_id_idx" ON "events"("case_id");
CREATE INDEX IF NOT EXISTS "events_task_id_idx" ON "events"("task_id");
CREATE INDEX IF NOT EXISTS "trust_transactions_account_id_idx" ON "trust_transactions"("account_id");
CREATE INDEX IF NOT EXISTS "credit_notes_invoice_id_idx" ON "credit_notes"("invoice_id");
