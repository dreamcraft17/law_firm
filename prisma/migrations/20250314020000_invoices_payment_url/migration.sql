-- Invoices: optional payment link URL
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payment_url" VARCHAR(2048);
