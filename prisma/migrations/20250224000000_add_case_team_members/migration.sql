-- Case team members (assign team per case)
CREATE TABLE IF NOT EXISTS "case_team_members" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "role" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("case_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "case_team_members_case_id_idx" ON "case_team_members"("case_id");
CREATE INDEX IF NOT EXISTS "case_team_members_user_id_idx" ON "case_team_members"("user_id");
