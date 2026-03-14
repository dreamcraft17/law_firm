-- Case milestones: SLA columns
ALTER TABLE "case_milestones" ADD COLUMN IF NOT EXISTS "sla_due_date" TIMESTAMPTZ(6);
ALTER TABLE "case_milestones" ADD COLUMN IF NOT EXISTS "escalated_at" TIMESTAMPTZ(6);
