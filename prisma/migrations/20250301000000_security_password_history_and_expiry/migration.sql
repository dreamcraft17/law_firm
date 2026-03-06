-- Security: password history (no reuse) + optional password expiry
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_expires_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "password_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "password_hash" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "password_history_user_id_idx" ON "password_history"("user_id");
