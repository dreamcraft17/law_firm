-- Referensi DDL: tabel tambahan untuk web (RLS & soft delete diterapkan di lapisan policy).
-- Sesuaikan dengan DB engine (contoh PostgreSQL).
-- Pakai IF NOT EXISTS agar aman dijalankan ulang (idempotent).

-- system_settings (W9)
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(128) NOT NULL UNIQUE,
  value JSONB,
  category VARCHAR(64) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- workflow_templates (W3)
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(128) NOT NULL UNIQUE,
  case_type VARCHAR(64),
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- retention_policies (W4)
CREATE TABLE IF NOT EXISTS retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  document_type VARCHAR(64),
  case_status VARCHAR(64),
  retain_years INT NOT NULL,
  action_after VARCHAR(32) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- custom_fields (W9)
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity VARCHAR(64) NOT NULL,
  case_type VARCHAR(64),
  field_key VARCHAR(128) NOT NULL,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(32) NOT NULL,
  options JSONB,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS custom_fields_entity_key ON custom_fields (entity, COALESCE(case_type, ''), field_key) WHERE deleted_at IS NULL;

-- case_risk_scores (W2)
CREATE TABLE IF NOT EXISTS case_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id),
  score DECIMAL(5,2) NOT NULL,
  factors JSONB,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_risk_scores_case_id ON case_risk_scores (case_id);

-- lawyer_performance_metrics (W5/W6)
CREATE TABLE IF NOT EXISTS lawyer_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  period_type VARCHAR(16) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  cases_closed INT NOT NULL DEFAULT 0,
  revenue_billed DECIMAL(18,2) NOT NULL DEFAULT 0,
  revenue_collected DECIMAL(18,2) NOT NULL DEFAULT 0,
  utilization_pct DECIMAL(5,2),
  avg_case_duration_days INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_lawyer_performance_user_period ON lawyer_performance_metrics (user_id, period_type, period_start);
