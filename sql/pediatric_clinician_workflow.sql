-- Pediatric clinician workflow migration
-- Run after sql/security_hardening.sql and before using the redesigned patient workspace.
-- Existing rows with NULL created_by remain hidden from ordinary users until the institution
-- explicitly assigns ownership; do not bulk-assign PHI without governance approval.

ALTER TABLE public.patients ALTER COLUMN bed_number DROP NOT NULL;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'Other';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS date_of_birth_bs TEXT;
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_source_type_check;
ALTER TABLE public.patients ADD CONSTRAINT patients_source_type_check CHECK (source_type IN ('OPD', 'Ward', 'Clinic', 'Referral', 'Other'));
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON public.patients(created_by, created_at DESC);

CREATE OR REPLACE FUNCTION public.can_access_patient(target_patient UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = target_patient
      AND (p.created_by = auth.uid() OR public.is_admin())
  );
$$;

DROP POLICY IF EXISTS pts_select_unit ON public.patients;
DROP POLICY IF EXISTS pts_insert_unit ON public.patients;
DROP POLICY IF EXISTS pts_update_unit ON public.patients;
DROP POLICY IF EXISTS pts_delete_admin ON public.patients;
CREATE POLICY pts_select_owner ON public.patients FOR SELECT USING (created_by = auth.uid() OR public.is_admin());
CREATE POLICY pts_insert_owner ON public.patients FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY pts_update_owner ON public.patients FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());
CREATE POLICY pts_delete_owner ON public.patients FOR DELETE USING (created_by = auth.uid() OR public.is_admin());

-- Replace child-record policies so they inherit the same owner boundary.
DROP POLICY IF EXISTS fb_select_unit ON public.fluid_balance;
DROP POLICY IF EXISTS fb_insert_unit ON public.fluid_balance;
DROP POLICY IF EXISTS fb_update_unit ON public.fluid_balance;
CREATE POLICY fb_select_owner ON public.fluid_balance FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY fb_insert_owner ON public.fluid_balance FOR INSERT WITH CHECK (public.can_access_patient(patient_id) AND created_by = auth.uid());
CREATE POLICY fb_update_owner ON public.fluid_balance FOR UPDATE USING (public.can_access_patient(patient_id)) WITH CHECK (public.can_access_patient(patient_id));

DROP POLICY IF EXISTS pdr_select_unit ON public.patient_drugs;
DROP POLICY IF EXISTS pdr_insert_unit ON public.patient_drugs;
DROP POLICY IF EXISTS pdr_delete_unit ON public.patient_drugs;
CREATE POLICY pdr_select_owner ON public.patient_drugs FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY pdr_insert_owner ON public.patient_drugs FOR INSERT WITH CHECK (public.can_access_patient(patient_id) AND created_by = auth.uid());
CREATE POLICY pdr_delete_owner ON public.patient_drugs FOR DELETE USING (public.can_access_patient(patient_id));

DROP POLICY IF EXISTS inv_select_unit ON public.investigations;
DROP POLICY IF EXISTS inv_insert_unit ON public.investigations;
CREATE POLICY inv_select_owner ON public.investigations FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY inv_insert_owner ON public.investigations FOR INSERT WITH CHECK (public.can_access_patient(patient_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS notes_select_unit ON public.patient_notes;
DROP POLICY IF EXISTS notes_insert_unit ON public.patient_notes;
CREATE POLICY notes_select_owner ON public.patient_notes FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY notes_insert_owner ON public.patient_notes FOR INSERT WITH CHECK (public.can_access_patient(patient_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS img_select_unit ON public.patient_images;
DROP POLICY IF EXISTS img_insert_unit ON public.patient_images;
CREATE POLICY img_select_owner ON public.patient_images FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY img_insert_owner ON public.patient_images FOR INSERT WITH CHECK (public.can_access_patient(patient_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS calc_select_unit ON public.calc_results;
DROP POLICY IF EXISTS calc_insert_unit ON public.calc_results;
CREATE POLICY calc_select_owner ON public.calc_results FOR SELECT USING (public.can_access_patient(patient_id));
CREATE POLICY calc_insert_owner ON public.calc_results FOR INSERT WITH CHECK (public.can_access_patient(patient_id) AND created_by = auth.uid());
