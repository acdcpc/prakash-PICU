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
