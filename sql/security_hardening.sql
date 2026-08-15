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
