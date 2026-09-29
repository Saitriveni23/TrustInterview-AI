CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  firebase_uid TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('candidate', 'recruiter')),
  company_id UUID REFERENCES companies(id),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_profiles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  required_skills JSONB NOT NULL DEFAULT '[]',
  preferred_skills JSONB NOT NULL DEFAULT '[]',
  min_experience_years NUMERIC(4,1) NOT NULL DEFAULT 0,
  academic_expectations JSONB NOT NULL DEFAULT '{}',
  weights JSONB NOT NULL DEFAULT '{"technical":50,"experience":30,"academic":20}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills JSONB NOT NULL DEFAULT '[]',
  preferred_skills JSONB NOT NULL DEFAULT '[]',
  min_experience_years NUMERIC(4,1) NOT NULL DEFAULT 0,
  academic_expectations JSONB NOT NULL DEFAULT '{}',
  weights JSONB NOT NULL DEFAULT '{"technical":50,"experience":30,"academic":20}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT NOT NULL REFERENCES users(firebase_uid),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mock_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_uid TEXT NOT NULL REFERENCES users(firebase_uid),
  target_type TEXT NOT NULL CHECK (target_type IN ('role', 'company_role')),
  role_profile_id TEXT REFERENCES role_profiles(id),
  company_role_id UUID REFERENCES company_roles(id),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','ready','in_progress','completed','failed')),
  question_status TEXT NOT NULL DEFAULT 'queued' CHECK (question_status IN ('queued','processing','ready','failed')),
  processing_error TEXT,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((target_type = 'role' AND role_profile_id IS NOT NULL AND company_role_id IS NULL)
      OR (target_type = 'company_role' AND company_role_id IS NOT NULL AND role_profile_id IS NULL))
);

CREATE TABLE IF NOT EXISTS ats_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_session_id UUID NOT NULL UNIQUE REFERENCES mock_sessions(id) ON DELETE CASCADE,
  scoring_version TEXT NOT NULL,
  overall_score NUMERIC(5,2) NOT NULL,
  breakdown JSONB NOT NULL,
  matched_criteria JSONB NOT NULL DEFAULT '[]',
  missing_criteria JSONB NOT NULL DEFAULT '[]',
  evidence JSONB NOT NULL DEFAULT '[]',
  advice JSONB NOT NULL DEFAULT '[]',
  advice_unavailable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_session_id UUID NOT NULL UNIQUE REFERENCES mock_sessions(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  generator TEXT NOT NULL,
  model_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_session_id UUID NOT NULL UNIQUE REFERENCES mock_sessions(id) ON DELETE CASCADE,
  interview_score NUMERIC(5,2),
  result JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mock_sessions_candidate ON mock_sessions(candidate_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_roles_company ON company_roles(company_id, active);
CREATE INDEX IF NOT EXISTS idx_ats_reports_score ON ats_reports(overall_score DESC);
