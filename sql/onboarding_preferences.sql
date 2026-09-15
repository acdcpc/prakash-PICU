-- Server-backed, non-PHI onboarding preferences.
-- Apply after sql/migration.sql and sql/security_hardening.sql.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_user_preferences_updated ON public.user_preferences;
--   DROP TABLE IF EXISTS public.user_preferences;
--
-- Stores ONLY non-PHI preferences (care focus, quick-shelf tools, locale,
-- onboarding status/version). Never store patient identifiers, diagnoses,
-- weights, images, or free-text clinical notes here.

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  care_focus         TEXT NOT NULL DEFAULT 'general',
  quick_tools        TEXT[] NOT NULL DEFAULT ARRAY['dose','scores','growth'],
  locale             TEXT NOT NULL DEFAULT 'en',
  onboarding_status  TEXT NOT NULL DEFAULT 'in_progress',
  onboarding_version INTEGER NOT NULL DEFAULT 0,
  safety_ack_version INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_status_check;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_status_check
  CHECK (onboarding_status IN ('in_progress', 'completed', 'skipped', 'needs_update'));
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_focus_check;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_focus_check
  CHECK (care_focus IN ('general', 'acute', 'growth'));
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_tools_check;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_tools_check
  CHECK (quick_tools <@ ARRAY['dose','scores','growth','emergency','infusions','formulary']::TEXT[]);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Least privilege: a clinician may read and update ONLY their own preferences.
-- No DELETE policy and no anon grant: preferences are not client-deletable and
-- are never used as an access-control decision (access stays session + RLS).
DROP POLICY IF EXISTS user_preferences_select_self ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_insert_self ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_update_self ON public.user_preferences;
CREATE POLICY user_preferences_select_self ON public.user_preferences FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY user_preferences_insert_self ON public.user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY user_preferences_update_self ON public.user_preferences FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_user_preferences_updated ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_updated BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Least privilege: hosted Supabase default privileges grant ALL to
-- anon/authenticated, but TRUNCATE is NOT protected by RLS, so tighten it.
REVOKE ALL ON public.user_preferences FROM anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.user_preferences FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
