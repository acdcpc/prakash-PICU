-- P0 security: append-only audit hardening (defence in depth).
-- Apply after sql/security_hardening.sql.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_audit_metadata_keys ON public.clinical_audit_events;
--   DROP FUNCTION IF EXISTS public.enforce_audit_metadata_keys();
--   ALTER TABLE public.clinical_audit_events
--     DROP CONSTRAINT IF EXISTS clinical_audit_drug_name_len,
--     DROP CONSTRAINT IF EXISTS clinical_audit_dose_unit_len,
--     DROP CONSTRAINT IF EXISTS clinical_audit_infusion_id_len;
--
-- The client already allowlists audit metadata, but the database must not rely
-- on the client: free-text fields are length-capped and metadata keys must be
-- on the allowlist, so PHI cannot be smuggled into an audit record.
-- clinical_audit_events has SELECT + INSERT policies only (no UPDATE/DELETE),
-- which keeps the table append-only at the RLS layer.

ALTER TABLE public.clinical_audit_events DROP CONSTRAINT IF EXISTS clinical_audit_drug_name_len;
ALTER TABLE public.clinical_audit_events ADD CONSTRAINT clinical_audit_drug_name_len
  CHECK (drug_name IS NULL OR length(drug_name) <= 120);
ALTER TABLE public.clinical_audit_events DROP CONSTRAINT IF EXISTS clinical_audit_dose_unit_len;
ALTER TABLE public.clinical_audit_events ADD CONSTRAINT clinical_audit_dose_unit_len
  CHECK (dose_unit IS NULL OR length(dose_unit) <= 40);
ALTER TABLE public.clinical_audit_events DROP CONSTRAINT IF EXISTS clinical_audit_infusion_id_len;
ALTER TABLE public.clinical_audit_events ADD CONSTRAINT clinical_audit_infusion_id_len
  CHECK (infusion_id IS NULL OR length(infusion_id) <= 80);

CREATE OR REPLACE FUNCTION public.enforce_audit_metadata_keys()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE k text;
BEGIN
  IF NEW.metadata IS NULL THEN RETURN NEW; END IF;
  FOR k IN SELECT jsonb_object_keys(NEW.metadata) LOOP
    IF k NOT IN ('route', 'frequency', 'indication', 'reference', 'source', 'verification_stage') THEN
      RAISE EXCEPTION 'Audit metadata key "%" is not allowlisted', k USING ERRCODE = '22023';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_metadata_keys ON public.clinical_audit_events;
CREATE TRIGGER trg_audit_metadata_keys BEFORE INSERT ON public.clinical_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_audit_metadata_keys();
