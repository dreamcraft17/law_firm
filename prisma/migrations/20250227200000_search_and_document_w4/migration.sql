-- Search & Filter: saved_views
-- Document W4+: document columns, document_audit_logs, document_templates

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "checked_out_by_id" UUID REFERENCES "users"("id");
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "checked_out_at" TIMESTAMPTZ(6);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "esign_envelope_id" VARCHAR(255);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "esign_status" VARCHAR(32);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "esign_signed_at" TIMESTAMPTZ(6);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "permission_policy" JSONB;

CREATE TABLE IF NOT EXISTS "document_audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
    "user_id" UUID,
    "action" VARCHAR(32) NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "document_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "template_key" VARCHAR(128),
    "file_url" VARCHAR(2048),
    "merge_fields" JSONB,
    "category" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "saved_views" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(32) NOT NULL,
    "filters" JSONB NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "document_audit_logs_document_id_idx" ON "document_audit_logs"("document_id");
CREATE INDEX IF NOT EXISTS "saved_views_user_id_idx" ON "saved_views"("user_id");
