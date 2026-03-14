-- Time entries: link to invoice when billed
ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "invoice_id" UUID REFERENCES "invoices"("id") ON DELETE SET NULL;
