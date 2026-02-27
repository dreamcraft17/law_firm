-- Client Portal: case_messages, approval_requests
-- W9: notification_rules, user_notification_prefs

CREATE TABLE IF NOT EXISTS "case_messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
    "sender_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "body" TEXT NOT NULL,
    "attachment_url" VARCHAR(2048),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "approval_requests" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
    "client_id" UUID NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "type" VARCHAR(32) NOT NULL,
    "entity_id" UUID NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "requested_by" UUID,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "responded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification_rules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_type" VARCHAR(64) NOT NULL,
    "channel" VARCHAR(32) NOT NULL,
    "target_type" VARCHAR(32) NOT NULL,
    "target_id" UUID NOT NULL,
    "case_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_notification_prefs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "mute_case_ids" JSONB,
    "quiet_hours_start" VARCHAR(5),
    "quiet_hours_end" VARCHAR(5),
    "daily_digest" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "case_messages_case_id_idx" ON "case_messages"("case_id");
CREATE INDEX IF NOT EXISTS "approval_requests_client_id_idx" ON "approval_requests"("client_id");
CREATE INDEX IF NOT EXISTS "approval_requests_status_idx" ON "approval_requests"("status");
