-- Case conflict check snapshot (compliance)
CREATE TABLE IF NOT EXISTS "case_conflict_snapshots" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "case_id" UUID NOT NULL UNIQUE REFERENCES "cases"("id") ON DELETE CASCADE,
  "checked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "has_conflict" BOOLEAN NOT NULL,
  "conflicts" JSONB NOT NULL,
  "checked_by_id" UUID
);

CREATE INDEX IF NOT EXISTS "case_conflict_snapshots_case_id_idx" ON "case_conflict_snapshots"("case_id");
