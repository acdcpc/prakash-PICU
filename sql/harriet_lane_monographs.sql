-- Private institutional Harriet Lane (Neonate) monograph review table.
-- Apply after sql/migration.sql and sql/security_hardening.sql.
-- Populate with the separately generated seed file only when the institution has authorization.

CREATE TABLE IF NOT EXISTS public.harriet_lane_monographs (
  source_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_file TEXT NOT NULL,
  source_offset INTEGER,
  content TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending-clinical-verification' CHECK (review_status IN ('pending-clinical-verification', 'in-review', 'approved', 'rejected')),
  record_kind TEXT NOT NULL DEFAULT 'monograph' CHECK (record_kind IN ('monograph', 'section', 'reference')),
  verified_dose TEXT,
  dose_unit TEXT,
  maximum_dose TEXT,
  route_formulation TEXT,
  indication TEXT,
  renal_dialysis_notes TEXT,
  neonatal_notes TEXT,
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  version TEXT NOT NULL DEFAULT '24th-edition',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_harriet_lane_name ON public.harriet_lane_monographs USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_harriet_lane_status ON public.harriet_lane_monographs(review_status);
ALTER TABLE public.harriet_lane_monographs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS harriet_lane_select_unit ON public.harriet_lane_monographs;
DROP POLICY IF EXISTS harriet_lane_update_reviewer ON public.harriet_lane_monographs;
CREATE POLICY harriet_lane_select_unit ON public.harriet_lane_monographs FOR SELECT
  USING (public.is_unit_member('PICU'));
CREATE POLICY harriet_lane_update_reviewer ON public.harriet_lane_monographs FOR UPDATE
  USING (public.is_unit_member('PICU') AND (review_status <> 'approved' OR reviewer_id = auth.uid() OR public.is_admin()))
  WITH CHECK (public.is_unit_member('PICU') AND (reviewer_id = auth.uid() OR public.is_admin()));

DROP TRIGGER IF EXISTS trg_harriet_lane_updated ON public.harriet_lane_monographs;
CREATE TRIGGER trg_harriet_lane_updated BEFORE UPDATE ON public.harriet_lane_monographs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Review status is deliberately separate from the clinical starter drug table.
-- Promotion into approved calculator data must be a governed, human-reviewed process.
