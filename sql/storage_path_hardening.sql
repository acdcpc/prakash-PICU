-- P0 security: strict patient-image storage path parsing.
-- Apply after sql/security_hardening.sql (which creates the storage policies).
--
-- Rollback:
--   CREATE OR REPLACE FUNCTION public.patient_id_from_storage_path(path text)
--   RETURNS uuid LANGUAGE plpgsql IMMUTABLE AS $$
--   BEGIN RETURN split_part(path, '/', 2)::uuid;
--   EXCEPTION WHEN invalid_text_representation THEN RETURN NULL; END; $$;
--
-- The original function took any 2nd path segment as the patient id. This
-- version requires the exact `patients/<uuid>/<file>` shape, rejects traversal
-- and backslash paths, pins search_path, and returns NULL (=> policy denies)
-- for anything malformed. The storage policies then apply can_access_patient()
-- on the derived id, so cross-patient access still fails closed.

CREATE OR REPLACE FUNCTION public.patient_id_from_storage_path(path text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  parts text[];
BEGIN
  IF path IS NULL OR path = '' THEN RETURN NULL; END IF;
  IF strpos(path, chr(92)) > 0 THEN RETURN NULL; END IF;   -- no backslashes
  IF left(path, 1) = '/' THEN RETURN NULL; END IF;          -- no absolute paths
  IF strpos(path, '..') > 0 THEN RETURN NULL; END IF;       -- no traversal
  parts := string_to_array(path, '/');
  IF array_length(parts, 1) <> 3 THEN RETURN NULL; END IF;  -- exactly patients/<id>/<file>
  IF parts[1] <> 'patients' THEN RETURN NULL; END IF;
  RETURN parts[2]::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;
