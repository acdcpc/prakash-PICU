-- ============================================================
--  OurPICU — COMBINED ONE-PASTE DATABASE SETUP
--  Paste this ENTIRE file into the Supabase SQL Editor and run ONCE.
--  Order: core schema -> payment system -> security hardening -> storage bucket -> grants
--  NOTE: do NOT also run the individual files separately after running this.
-- ============================================================

-- ───────────────────────── [1] CORE SCHEMA (sql/migration.sql) ─────────────────────────

-- ============================================================
--  OurPICU — Supabase Database Migration
--  Run this in the Supabase SQL Editor (one-time setup)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'nurse', 'viewer');

-- ── Profiles Table ──
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'doctor',
  full_name   TEXT,
  designation TEXT,
  hospital    TEXT,
  unit_name   TEXT DEFAULT 'PICU',
  beds        INT DEFAULT 10,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Education Settings ──
CREATE TABLE public.education (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  videos         JSONB DEFAULT '[]'::jsonb,
  teaching_notes JSONB DEFAULT '[]'::jsonb,
  mcqs           JSONB DEFAULT '[]'::jsonb,
  social_media   JSONB DEFAULT '{}'::jsonb,
  updated_at     TIMESTAMPTZ DEFAULT now(),
  updated_by     UUID REFERENCES auth.users(id)
);
CREATE UNIQUE INDEX education_single_row ON public.education ((true));

-- ── Patients ──
CREATE TABLE public.patients (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bed_number       INT NOT NULL,
  age              NUMERIC(5,2),
  weight           NUMERIC(6,2),
  admission_weight NUMERIC(6,2),
  diagnosis        TEXT,
  admission_date   DATE,
  active           BOOLEAN DEFAULT true,
  latest_fo        NUMERIC(5,2) DEFAULT 0,
  sex              TEXT,
  height           NUMERIC(6,2),
  created_at       TIMESTAMPTZ DEFAULT now(),
  created_by       UUID REFERENCES auth.users(id),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_patients_active ON public.patients(active);
CREATE INDEX idx_patients_bed ON public.patients(bed_number);

-- ── Fluid Balance ──
CREATE TABLE public.fluid_balance (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  date               DATE NOT NULL,
  inputs             JSONB DEFAULT '[]'::jsonb,
  drains             JSONB DEFAULT '[]'::jsonb,
  urine              NUMERIC(8,1) DEFAULT 0,
  stool              NUMERIC(8,1) DEFAULT 0,
  total_input        NUMERIC(8,1) DEFAULT 0,
  total_output       NUMERIC(8,1) DEFAULT 0,
  net_balance        NUMERIC(8,1) DEFAULT 0,
  cum_input          NUMERIC(8,1) DEFAULT 0,
  cum_output         NUMERIC(8,1) DEFAULT 0,
  fluid_overload_pct NUMERIC(5,2) DEFAULT 0,
  isl                NUMERIC(5,1),
  isl_daily          NUMERIC(7,0),
  fo_status          TEXT,
  temp               NUMERIC(4,1),
  vent               TEXT,
  crrt               TEXT,
  admission_weight   NUMERIC(6,2),
  created_at         TIMESTAMPTZ DEFAULT now(),
  created_by         UUID REFERENCES auth.users(id)
);
CREATE UNIQUE INDEX idx_fb_patient_date ON public.fluid_balance(patient_id, date);
CREATE INDEX idx_fb_patient ON public.fluid_balance(patient_id);

-- ── Patient Drugs ──
CREATE TABLE public.patient_drugs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  drug_name     TEXT NOT NULL,
  dose_per_kg   TEXT,
  max_dose      TEXT,
  frequency     TEXT,
  route         TEXT,
  prep          TEXT,
  dose_override TEXT,
  notes         TEXT,
  start_date    DATE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  created_by    UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_drugs_patient ON public.patient_drugs(patient_id);

-- ── Investigations ──
CREATE TABLE public.investigations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  lab_values JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_inv_patient ON public.investigations(patient_id);

-- ── Patient Notes ──
CREATE TABLE public.patient_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'progress',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_notes_patient ON public.patient_notes(patient_id);

-- ── Patient Images ──
CREATE TABLE public.patient_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id  UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  storage_url TEXT NOT NULL,
  description TEXT,
  type        TEXT,
  file_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_images_patient ON public.patient_images(patient_id);

-- ── Calculator Results ──
CREATE TABLE public.calc_results (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_calc_patient ON public.calc_results(patient_id);

-- ── Drug Library (global) ──
CREATE TABLE public.drug_library (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  dose       TEXT,
  max        TEXT,
  freq       TEXT,
  route      TEXT,
  prep       TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluid_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calc_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_library ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT role = 'admin'::user_role FROM public.profiles WHERE id = auth.uid(); $$;

-- Profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Education
CREATE POLICY "edu_select" ON public.education FOR SELECT USING (true);
CREATE POLICY "edu_insert" ON public.education FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "edu_update" ON public.education FOR UPDATE USING (public.is_admin());
CREATE POLICY "edu_delete" ON public.education FOR DELETE USING (public.is_admin());

-- Patients
CREATE POLICY "pts_select" ON public.patients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pts_insert" ON public.patients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pts_update" ON public.patients FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "pts_delete" ON public.patients FOR DELETE USING (public.is_admin());

-- Fluid Balance
CREATE POLICY "fb_select" ON public.fluid_balance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "fb_insert" ON public.fluid_balance FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "fb_update" ON public.fluid_balance FOR UPDATE USING (auth.role() = 'authenticated');

-- Patient Drugs
CREATE POLICY "pdr_select" ON public.patient_drugs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pdr_insert" ON public.patient_drugs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pdr_delete" ON public.patient_drugs FOR DELETE USING (auth.role() = 'authenticated');

-- Investigations
CREATE POLICY "inv_select" ON public.investigations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "inv_insert" ON public.investigations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Notes
CREATE POLICY "notes_select" ON public.patient_notes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "notes_insert" ON public.patient_notes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Images
CREATE POLICY "img_select" ON public.patient_images FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "img_insert" ON public.patient_images FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Calc Results
CREATE POLICY "calc_select" ON public.calc_results FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "calc_insert" ON public.calc_results FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Drug Library
CREATE POLICY "dlib_select" ON public.drug_library FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "dlib_insert" ON public.drug_library FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "dlib_update" ON public.drug_library FOR UPDATE USING (public.is_admin());
CREATE POLICY "dlib_delete" ON public.drug_library FOR DELETE USING (public.is_admin());

-- ============================================================
--  STORAGE POLICIES
-- ============================================================
-- patient-images bucket is public (read). Uploads still require an explicit policy.
CREATE POLICY "patient_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-images');

-- ============================================================
--  TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_patients_updated ON public.patients;
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
--  ADMIN USER SETUP
-- ============================================================
-- After running this migration, create an administrator through the normal signup flow
-- or Supabase Dashboard using an organization-controlled account. Never commit credentials.
-- Then promote the approved account:
--    UPDATE public.profiles SET role = 'admin' WHERE id = '<approved-user-uuid>';

-- ───────────────────────── [2] PAYMENT SYSTEM (sql/subscriptions.sql) ─────────────────────────

-- prakash-PICU — subscription & payment system (Kapoori-ka model)
-- Flow:
--   1. User pays externally (eSewa / Khalti / Fonepay / Bank transfer).
--   2. User submits a payment record + optional screenshot from the hosted payment page.
--   3. An administrator verifies the transaction and issues a one-time activation code.
--   4. The user redeems the code in the app to activate their subscription.
-- Live card/mobile-wallet charging must be implemented server-side with a licensed provider.

-- ── Plans (single plan, NPR 2500 / year) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  price_npr     INTEGER NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  features      JSONB NOT NULL DEFAULT '[]'::jsonb,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_plans (id, name, description, price_npr, duration_days, features)
VALUES
  ('full-access', 'PICU Full Access', 'Full access to the PICU clinical workspace for one year.', 2500, 365,
   '["All clinical calculators", "High-risk infusion reference", "Emergency Mode", "Clinical Tools workspace", "Child health workspace", "Pediatric updates", "Excel exports"]'::jsonb)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_npr = EXCLUDED.price_npr,
      duration_days = EXCLUDED.duration_days,
      features = EXCLUDED.features;

-- ── Payment submissions (inserted anonymously from the hosted payment page) ──
CREATE TABLE IF NOT EXISTS public.payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  mobile           TEXT,
  amount           INTEGER NOT NULL,
  transaction_id   TEXT,
  screenshot_url   TEXT,
  plan             TEXT NOT NULL DEFAULT 'full-access',
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at      TIMESTAMPTZ,
  verified_by      UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS payments_status_created_idx ON public.payments(status, created_at DESC);

-- ── Activation codes (stored as SHA-256 hashes, never plaintext) ──
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.activation_codes (
  code_hash               TEXT PRIMARY KEY,
  status                  TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','used')),
  plan                    TEXT NOT NULL DEFAULT 'full-access',
  amount                  INTEGER,
  original_transaction_id TEXT,
  used_by                 UUID REFERENCES auth.users(id),
  used_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Redemption rate limiting (5 attempts / 15 minutes) ──
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  count        INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Subscriptions (Kapoori-ka style) ──
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status               TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none','active','expired')),
  plan                 TEXT NOT NULL DEFAULT 'full-access',
  start_date           TIMESTAMPTZ,
  end_date             TIMESTAMPTZ,
  auto_renew           BOOLEAN NOT NULL DEFAULT false,
  price                INTEGER,
  redeemed_code_hash   TEXT,
  activated_by_payment UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Row Level Security ──────────────────────────────────────────────────
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_public_read ON public.subscription_plans;
CREATE POLICY subscription_plans_public_read ON public.subscription_plans
  FOR SELECT USING (active = true);

-- Hosted payment page is unauthenticated: allow anonymous inserts only.
DROP POLICY IF EXISTS payments_anon_insert ON public.payments;
CREATE POLICY payments_anon_insert ON public.payments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS payments_read ON public.payments;
CREATE POLICY payments_read ON public.payments
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS payments_admin_update ON public.payments;
CREATE POLICY payments_admin_update ON public.payments
  FOR UPDATE USING (public.is_admin());

-- Activation codes are secrets: no client-side read at all. The RPC redeems them.
DROP POLICY IF EXISTS rate_limits_own_read ON public.rate_limits;
CREATE POLICY rate_limits_own_read ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS subscriptions_read ON public.subscriptions;
CREATE POLICY subscriptions_read ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- ── RPC: redeem an activation code ──────────────────────────────────────
-- Rate-limited (5 attempts / 15 min); code is SHA-256 hashed before lookup.
CREATE OR REPLACE FUNCTION public.redeem_activation_code(p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_code      TEXT;
  v_code_hash TEXT;
  v_code_row  public.activation_codes%ROWTYPE;
  v_plan      TEXT;
  v_days      INT;
  v_end_date  TIMESTAMPTZ;
  v_now       TIMESTAMPTZ := now();
  v_rate      public.rate_limits%ROWTYPE;
  v_wait      INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Must be signed in.');
  END IF;

  v_code := upper(regexp_replace(p_code, '[^A-Z0-9]', '', 'g'));
  IF length(v_code) < 6 OR length(v_code) > 32 THEN
    RETURN jsonb_build_object('error', 'Invalid code format.');
  END IF;
  v_code_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');

  -- Rate limiting: max 5 failed attempts per 15 minutes
  SELECT * INTO v_rate FROM public.rate_limits WHERE user_id = v_user_id;
  IF FOUND THEN
    IF EXTRACT(EPOCH FROM (v_now - v_rate.window_start)) > 900 THEN
      UPDATE public.rate_limits SET count = 1, window_start = v_now WHERE user_id = v_user_id;
    ELSIF v_rate.count >= 5 THEN
      v_wait := CEIL(900 - EXTRACT(EPOCH FROM (v_now - v_rate.window_start)));
      RETURN jsonb_build_object('error', 'Too many attempts. Wait ' || v_wait || 's.');
    ELSE
      UPDATE public.rate_limits SET count = count + 1 WHERE user_id = v_user_id;
    END IF;
  ELSE
    INSERT INTO public.rate_limits (user_id, count, window_start) VALUES (v_user_id, 1, v_now);
  END IF;

  SELECT * INTO v_code_row FROM public.activation_codes WHERE code_hash = v_code_hash;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Invalid code.'); END IF;
  IF v_code_row.status != 'valid' THEN RETURN jsonb_build_object('error', 'Code already used.'); END IF;

  v_plan := COALESCE(v_code_row.plan, 'full-access');
  v_days := CASE WHEN v_plan = 'full-access' THEN 365 ELSE 30 END;
  v_end_date := v_now + (v_days || ' days')::INTERVAL;

  UPDATE public.activation_codes
     SET status = 'used', used_by = v_user_id, used_at = v_now
   WHERE code_hash = v_code_hash;

  INSERT INTO public.subscriptions
    (user_id, status, plan, start_date, end_date, auto_renew, price, redeemed_code_hash)
  VALUES
    (v_user_id, 'active', v_plan, v_now, v_end_date, false, v_code_row.amount, v_code_hash)
  ON CONFLICT (user_id) DO UPDATE
     SET status = 'active',
         plan = v_plan,
         start_date = v_now,
         end_date = v_end_date,
         auto_renew = false,
         price = v_code_row.amount,
         redeemed_code_hash = v_code_hash,
         updated_at = v_now;

  DELETE FROM public.rate_limits WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'plan', v_plan, 'end_date', v_end_date);
END;
$$;

-- ── RPC: void outstanding codes for a transaction (regenerate flow) ────
CREATE OR REPLACE FUNCTION public.admin_void_codes(p_original_transaction_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'Admin access required.');
  END IF;
  UPDATE public.activation_codes
     SET status = 'used'
   WHERE original_transaction_id = p_original_transaction_id
     AND status = 'valid';
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ───────────────────────── [3] SECURITY HARDENING (sql/security_hardening.sql) ─────────────────────────

-- prakash-PICU security hardening migration
-- Run after sql/migration.sql and review with the institution's Supabase administrator.
-- This migration assumes every patient belongs to a PICU unit identified by unit_name.

CREATE TABLE IF NOT EXISTS public.unit_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, unit_name)
);
CREATE INDEX IF NOT EXISTS idx_unit_memberships_user_unit ON public.unit_memberships(user_id, unit_name) WHERE active;
ALTER TABLE public.unit_memberships ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS unit_name TEXT NOT NULL DEFAULT 'PICU';
ALTER TABLE public.patient_images ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.patient_images ALTER COLUMN storage_url DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.clinical_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN ('emergency_dose_calculated', 'emergency_self_recheck', 'high_risk_infusion_self_recheck')),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  unit_name TEXT NOT NULL DEFAULT 'PICU',
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  drug_name TEXT,
  infusion_id TEXT,
  weight_kg NUMERIC(8,3),
  target_dose NUMERIC(12,5),
  dose_unit TEXT,
  calculated_amount NUMERIC(14,5),
  capped_by_max BOOLEAN,
  final_concentration NUMERIC(14,5),
  pump_rate_ml_hr NUMERIC(14,5),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_unit_time ON public.clinical_audit_events(unit_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_patient_time ON public.clinical_audit_events(patient_id, created_at DESC);
ALTER TABLE public.clinical_audit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_unit_member(target_unit TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.unit_memberships
    WHERE user_id = auth.uid() AND unit_name = target_unit AND active = true
  ) OR public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.can_access_patient(target_patient UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = target_patient AND public.is_unit_member(p.unit_name)
  );
$$;

-- Memberships: users can see their own active memberships; admins manage membership.
DROP POLICY IF EXISTS unit_memberships_self_select ON public.unit_memberships;
DROP POLICY IF EXISTS unit_memberships_admin_all ON public.unit_memberships;
CREATE POLICY unit_memberships_self_select ON public.unit_memberships FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY unit_memberships_admin_all ON public.unit_memberships FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Replace broad patient policies with unit-scoped policies.
DROP POLICY IF EXISTS pts_select ON public.patients;
DROP POLICY IF EXISTS pts_insert ON public.patients;
DROP POLICY IF EXISTS pts_update ON public.patients;
DROP POLICY IF EXISTS pts_delete ON public.patients;
CREATE POLICY pts_select_unit ON public.patients FOR SELECT USING (public.is_unit_member(unit_name));
CREATE POLICY pts_insert_unit ON public.patients FOR INSERT WITH CHECK (public.is_unit_member(unit_name));
CREATE POLICY pts_update_unit ON public.patients FOR UPDATE USING (public.is_unit_member(unit_name)) WITH CHECK (public.is_unit_member(unit_name));
CREATE POLICY pts_delete_admin ON public.patients FOR DELETE USING (public.is_admin());

-- Patient child records are accessible only through an accessible patient.
DROP POLICY IF EXISTS fb_select ON public.fluid_balance;
DROP POLICY IF EXISTS fb_insert ON public.fluid_balance;
DROP POLICY IF EXISTS fb_update ON public.fluid_balance;
CREATE POLICY fb_select_unit ON public.fluid_balance FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY fb_insert_unit ON public.fluid_balance FOR INSERT WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY fb_update_unit ON public.fluid_balance FOR UPDATE USING (public.can_access_patient(patient_id)) WITH CHECK (public.can_access_patient(patient_id));

DROP POLICY IF EXISTS pdr_select ON public.patient_drugs;
DROP POLICY IF EXISTS pdr_insert ON public.patient_drugs;
DROP POLICY IF EXISTS pdr_delete ON public.patient_drugs;
CREATE POLICY pdr_select_unit ON public.patient_drugs FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY pdr_insert_unit ON public.patient_drugs FOR INSERT WITH CHECK (public.can_access_patient(patient_id));
CREATE POLICY pdr_delete_unit ON public.patient_drugs FOR DELETE USING (public.can_access_patient(patient_id));

DROP POLICY IF EXISTS inv_select ON public.investigations;
DROP POLICY IF EXISTS inv_insert ON public.investigations;
CREATE POLICY inv_select_unit ON public.investigations FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY inv_insert_unit ON public.investigations FOR INSERT WITH CHECK (public.can_access_patient(patient_id));

DROP POLICY IF EXISTS notes_select ON public.patient_notes;
DROP POLICY IF EXISTS notes_insert ON public.patient_notes;
CREATE POLICY notes_select_unit ON public.patient_notes FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY notes_insert_unit ON public.patient_notes FOR INSERT WITH CHECK (public.can_access_patient(patient_id));

DROP POLICY IF EXISTS img_select ON public.patient_images;
DROP POLICY IF EXISTS img_insert ON public.patient_images;
CREATE POLICY img_select_unit ON public.patient_images FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY img_insert_unit ON public.patient_images FOR INSERT WITH CHECK (public.can_access_patient(patient_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS calc_select ON public.calc_results;
DROP POLICY IF EXISTS calc_insert ON public.calc_results;
CREATE POLICY calc_select_unit ON public.calc_results FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY calc_insert_unit ON public.calc_results FOR INSERT WITH CHECK (public.can_access_patient(patient_id) AND created_by = auth.uid());

-- Clinical audit: append-only for the actor; unit members/admins can read their unit.
DROP POLICY IF EXISTS clinical_audit_select_unit ON public.clinical_audit_events;
DROP POLICY IF EXISTS clinical_audit_insert_actor ON public.clinical_audit_events;
CREATE POLICY clinical_audit_select_unit ON public.clinical_audit_events FOR SELECT USING (public.is_unit_member(unit_name));
CREATE POLICY clinical_audit_insert_actor ON public.clinical_audit_events FOR INSERT WITH CHECK (actor_id = auth.uid() AND public.is_unit_member(unit_name) AND (patient_id IS NULL OR public.can_access_patient(patient_id)));

-- Private patient-image bucket. Existing public URLs must be migrated before production use.
CREATE OR REPLACE FUNCTION public.patient_id_from_storage_path(path TEXT)
RETURNS UUID
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN split_part(path, '/', 2)::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;
UPDATE storage.buckets SET public = false WHERE id = 'patient-images';
DROP POLICY IF EXISTS patient_images_upload ON storage.objects;
DROP POLICY IF EXISTS patient_images_select ON storage.objects;
DROP POLICY IF EXISTS patient_images_update ON storage.objects;
DROP POLICY IF EXISTS patient_images_delete ON storage.objects;
CREATE POLICY patient_images_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-images' AND public.can_access_patient(public.patient_id_from_storage_path(name)));
CREATE POLICY patient_images_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-images' AND public.can_access_patient(public.patient_id_from_storage_path(name)));
CREATE POLICY patient_images_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'patient-images' AND public.can_access_patient(public.patient_id_from_storage_path(name)));
CREATE POLICY patient_images_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'patient-images' AND public.can_access_patient(public.patient_id_from_storage_path(name)));

-- Seed membership for an approved doctor through a separately reviewed statement:
-- INSERT INTO public.unit_memberships (user_id, unit_name) VALUES ('<approved-user-uuid>', 'PICU');

-- ───────────────────────── [4] PAYMENT SCREENSHOTS BUCKET (sql/payment_screenshots.sql) ─────────────────────────

-- prakash-PICU — storage bucket for the hosted payment page screenshots.
--
-- The hosted payment page (public/payment.html) is unauthenticated, so it needs
-- anonymous INSERT access to this bucket. Admins read objects to generate the
-- signed URLs shown in Admin Panel → Payments.
--
-- Run this after sql/migration.sql and sql/subscriptions.sql.

-- 1. Create the private bucket (idempotent).
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow anonymous uploads (the payment page submits without a login).
DROP POLICY IF EXISTS payment_screenshots_anon_upload ON storage.objects;
CREATE POLICY payment_screenshots_anon_upload ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'payment-screenshots');

-- 3. Allow admins to read objects (needed to create signed URLs for review).
DROP POLICY IF EXISTS payment_screenshots_admin_read ON storage.objects;
CREATE POLICY payment_screenshots_admin_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-screenshots' AND public.is_admin());

-- ───────────────────────── [5] ROLE GRANTS (sql/grants.sql) ─────────────────────────

-- prakash-PICU — database role grants.
--
-- Supabase RLS is the security boundary; these grants expose the public schema to
-- the anon / authenticated / service_role roles subject to those row-level policies.
-- Raw `CREATE TABLE` statements do not always inherit Supabase's default grants,
-- so this file applies them explicitly. Run after all table-creating migrations.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
