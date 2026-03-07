-- Disbursements & Expenses
CREATE TABLE IF NOT EXISTS "expense_categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "case_disbursements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "case_id" UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
  "category_id" UUID REFERENCES "expense_categories"("id") ON DELETE SET NULL,
  "amount" DECIMAL(15, 2) NOT NULL,
  "tax_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(15, 2) NOT NULL,
  "description" TEXT,
  "receipt_url" TEXT,
  "spent_at" DATE NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "invoice_id" UUID REFERENCES "invoices"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "case_disbursements_case_id_idx" ON "case_disbursements"("case_id");
CREATE INDEX IF NOT EXISTS "case_disbursements_invoice_id_idx" ON "case_disbursements"("invoice_id");

-- Calendar sync: provider event id on events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "provider_event_id" VARCHAR(255);

-- OAuth tokens for Google/Outlook calendar
CREATE TABLE IF NOT EXISTS "user_calendar_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" VARCHAR(32) NOT NULL,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "expires_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE("user_id", "provider")
);
CREATE INDEX IF NOT EXISTS "user_calendar_connections_user_id_idx" ON "user_calendar_connections"("user_id");
