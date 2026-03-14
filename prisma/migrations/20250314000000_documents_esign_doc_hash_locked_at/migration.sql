-- e-sign: doc hash and locked-at for documents
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "esign_doc_hash" VARCHAR(64);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "esign_locked_at" TIMESTAMPTZ(6);
