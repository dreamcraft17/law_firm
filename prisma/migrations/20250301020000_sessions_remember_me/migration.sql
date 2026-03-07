-- Remember me: session lebih lama (90 hari) bila user centang "Ingat saya"
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "remember_me" BOOLEAN NOT NULL DEFAULT false;
