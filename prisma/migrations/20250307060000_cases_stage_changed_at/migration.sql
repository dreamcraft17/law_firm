-- Kolom untuk SLA: kapan stage terakhir diubah (due from stage_changed)
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "stage_changed_at" TIMESTAMPTZ(6);
