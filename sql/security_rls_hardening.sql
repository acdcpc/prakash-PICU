-- P0 security: RLS + least-privilege hardening.
-- Apply after sql/migration.sql and sql/security_hardening.sql.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_profiles_enforce_privileges ON public.profiles;
--   DROP FUNCTION IF EXISTS public.enforce_profile_privileges();
--   DROP POLICY IF EXISTS profiles_select_self_or_unit ON public.profiles;
--     CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (true);
--   DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
--     CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (auth.uid() = id);
--   -- re-grant privileges if the environment requires them.

-- 1) Stop client-side privilege escalation on profiles.
--    RLS alone cannot compare OLD/NEW, so a trigger blocks a non-admin from
--    changing their own role or unit membership.
CREATE OR REPLACE FUNCTION public.enforce_profile_privileges()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Allow server-side contexts (migrations, service_role, SQL editor) which
  -- have no JWT. Only authenticated clients are restricted.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing your role is not permitted.' USING ERRCODE = '42501';
  END IF;
  IF NEW.unit_name IS DISTINCT FROM OLD.unit_name THEN
    RAISE EXCEPTION 'Changing your unit membership is not permitted.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_enforce_privileges ON public.profiles;
CREATE TRIGGER trg_profiles_enforce_privileges BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_privileges();

-- 2) Every SECURITY DEFINER function must pin search_path.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role = 'admin'::user_role FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 3) TRUNCATE / REFERENCES / TRIGGER are NOT protected by RLS. Hosted Supabase
--    default privileges grant ALL to anon/authenticated, so revoke them and
--    stop granting them on future tables.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

-- 4) anon must not hold table access to clinical or staff data. The only
--    anonymous surfaces are the public plan list and the payment submission.
REVOKE ALL ON public.patients, public.fluid_balance, public.patient_drugs,
  public.investigations, public.patient_notes, public.patient_images,
  public.calc_results, public.clinical_audit_events, public.teddy_bear_monographs,
  public.harriet_lane_monographs, public.user_preferences, public.profiles,
  public.activation_codes, public.subscriptions, public.unit_memberships
  FROM anon;
REVOKE DELETE ON public.payments FROM anon;
GRANT SELECT ON public.subscription_plans TO anon;
GRANT INSERT ON public.payments TO anon;

-- 5) profiles SELECT least privilege: self, same unit, or admin.
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select_self_or_unit ON public.profiles;
CREATE POLICY profiles_select_self_or_unit ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin() OR public.is_unit_member(unit_name));

-- 6) profiles UPDATE: self (non-privileged columns only, enforced above) or admin.
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_admin ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());
