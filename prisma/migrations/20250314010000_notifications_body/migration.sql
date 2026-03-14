-- Notifications: body, case_id, entity_type (add if missing)
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "body" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "case_id" UUID;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "entity_type" VARCHAR(32);
