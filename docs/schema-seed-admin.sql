-- Seed user admin untuk login (panel admin + mobile). Idempotent.
-- Butuh extension pgcrypto untuk bcrypt (Railway PostgreSQL biasanya sudah ada).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (email, name, role, password_hash, created_at, updated_at)
SELECT
  'admin@firm.com',
  'Admin',
  'admin',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@firm.com' AND deleted_at IS NULL
);
