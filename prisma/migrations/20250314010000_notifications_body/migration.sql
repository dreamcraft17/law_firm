-- Notifications: optional body column for longer content
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "body" TEXT;
