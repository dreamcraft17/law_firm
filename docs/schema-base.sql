-- Schema dasar (tabel inti) untuk deploy. Idempotent (IF NOT EXISTS).
-- Dijalankan dulu sebelum schema-web-tables.sql.
-- Sesuai DATABASE_STRATEGY: satu DB untuk mobile + admin, soft delete.

-- users (auth + role)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(64) NOT NULL DEFAULT 'staff',
  password_hash VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email) WHERE deleted_at IS NULL;

-- cases (perkara)
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'open',
  client_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases (client_id) WHERE deleted_at IS NULL;
