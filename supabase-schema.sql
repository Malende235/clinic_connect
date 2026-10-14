-- =====================================================================
--  ClinicConnect — Supabase (PostgreSQL) Schema
--  Run in: Supabase Dashboard → SQL Editor → New query → Run
--
--  Supabase Auth handles:
--    • users table (auth.users)
--    • email verification
--    • password reset
--    • sessions / JWTs
--
--  We store app-specific profile data in a public.profiles table
--  linked to auth.users via id (UUID).
-- =====================================================================

-- Enable pgcrypto for uuid generation (already enabled in Supabase)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------
--  profiles  (one row per auth.users entry)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('patient', 'doctor')),
  doctor_type   TEXT        CHECK (doctor_type IN ('general', 'specialist')),
  specialty     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- When a new auth.users row is created, auto-create a profiles stub.
-- (The app will UPSERT the full profile during sign-up.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- -----------------------------------------------------------------------
--  cases
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cases (
  id            BIGSERIAL   PRIMARY KEY,
  patient_id    UUID        NOT NULL REFERENCES auth.users(id),
  subject       TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'with_general', 'forwarded', 'closed')),
  general_id    UUID        REFERENCES auth.users(id),
  specialist_id UUID        REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cases_patient_idx    ON public.cases(patient_id);
CREATE INDEX IF NOT EXISTS cases_general_idx    ON public.cases(general_id);
CREATE INDEX IF NOT EXISTS cases_specialist_idx ON public.cases(specialist_id);
CREATE INDEX IF NOT EXISTS cases_status_idx     ON public.cases(status);
CREATE INDEX IF NOT EXISTS cases_updated_idx    ON public.cases(updated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cases_updated_at ON public.cases;
CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- -----------------------------------------------------------------------
--  messages
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id         BIGSERIAL   PRIMARY KEY,
  case_id    BIGINT      NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  sender_id  UUID        REFERENCES auth.users(id),
  is_system  BOOLEAN     NOT NULL DEFAULT FALSE,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_case_idx ON public.messages(case_id);

-- -----------------------------------------------------------------------
--  login_attempts  (brute-force throttle)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.login_attempts (
  email        TEXT        PRIMARY KEY,
  attempts     INT         NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------
--  Row-Level Security
-- -----------------------------------------------------------------------

-- profiles: users can read any profile (needed to show doctor names),
-- but only update their own.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- cases: patients see their own; doctors see relevant cases.
-- We use a permissive "backend only" approach via service-role key in API routes,
-- so RLS can be kept simple or disabled for cases/messages (API routes use service role).
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cases_service_role" ON public.cases USING (TRUE);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_service_role" ON public.messages USING (TRUE);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_service_role" ON public.login_attempts USING (TRUE);
