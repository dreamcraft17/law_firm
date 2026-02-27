-- AlterTable: add avatar_url and phone to users (profile photo + phone for mobile)
ALTER TABLE "users" ADD COLUMN "avatar_url" VARCHAR(1024);
ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(64);
