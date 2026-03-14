-- Cases: SLA and archive columns (for case.create and full Case model)
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "sla_due_date" TIMESTAMPTZ(6);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "escalated_at" TIMESTAMPTZ(6);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "escalation_resolved_at" TIMESTAMPTZ(6);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "escalation_note" VARCHAR(500);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "sla_paused_at" TIMESTAMPTZ(6);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "sla_paused_reason" VARCHAR(255);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "budget_amount" DECIMAL(18,2);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "budget_hours" DECIMAL(12,2);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ(6);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "archived_by" UUID;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "archived_reason" VARCHAR(500);
