-- M4: Intake & Lead Management
-- Leads table (must exist before events.lead_id FK)
CREATE TABLE IF NOT EXISTS "leads" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(64),
    "source" VARCHAR(64),
    "service_category" VARCHAR(128),
    "problem_summary" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'new',
    "client_id" UUID REFERENCES "clients"("id"),
    "case_id" UUID REFERENCES "cases"("id"),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "lead_documents" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
    "name" VARCHAR(500) NOT NULL,
    "file_url" VARCHAR(2048),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "lead_intake_checklist" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
    "case_id" UUID,
    "item_key" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Add lead_id to events for consultation scheduling (after leads exists)
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "lead_id" UUID REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "leads_client_id_idx" ON "leads"("client_id");
CREATE INDEX IF NOT EXISTS "leads_case_id_idx" ON "leads"("case_id");
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads"("status");
CREATE INDEX IF NOT EXISTS "lead_documents_lead_id_idx" ON "lead_documents"("lead_id");
CREATE INDEX IF NOT EXISTS "lead_intake_checklist_lead_id_idx" ON "lead_intake_checklist"("lead_id");
