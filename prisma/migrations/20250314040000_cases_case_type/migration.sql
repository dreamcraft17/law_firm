-- Cases: case_type for SLA (litigation | corporate | etc)
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "case_type" VARCHAR(64);
