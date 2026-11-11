-- 053: Degrees and batches per college, and admin-assigned batches.
--
-- * colleges.degrees / colleges.batches: the admin "Create Academic Institution"
--   form collects these but there was nowhere to store them, so the student
--   registration form always showed an empty Degree list.
-- * student_email_roster.batch_name: the admin assigns each student's batch when
--   adding their college email; registration uses it instead of free text.
-- Additive, except get_my_student_roster_profile is recreated (same grants) to
-- also return batch_name.

BEGIN;

ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS degrees text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS batches text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.student_email_roster
  ADD COLUMN IF NOT EXISTS batch_name text;

DROP FUNCTION IF EXISTS public.get_my_student_roster_profile();
CREATE FUNCTION public.get_my_student_roster_profile()
 RETURNS TABLE(full_name text, college_name text, student_id text, department text, batch_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
  SELECT
    COALESCE(roster.student_name, profile.full_name),
    roster.college_name,
    roster.student_id,
    roster.department,
    roster.batch_name
  FROM auth.users AS auth_user
  JOIN public.profiles AS profile
    ON profile.id = auth_user.id
   AND profile.role = 'student'
  JOIN public.student_email_roster AS roster
    ON lower(roster.email) = lower(auth_user.email)
   AND roster.status = 'active'
  WHERE auth_user.id = auth.uid()
    AND auth_user.email_confirmed_at IS NOT NULL
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_my_student_roster_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_student_roster_profile() TO authenticated;

-- Registration: the admin-assigned batch (if any) wins over what was typed.
DO $do$
DECLARE
  def text := pg_get_functiondef(
    'public.complete_my_student_registration(text, text, text, text, text, text, text, text)'::regprocedure
  );
  patched text;
BEGIN
  IF position('roster_record.batch_name' in def) > 0 THEN
    RETURN; -- already applied
  END IF;
  -- Only the VALUES line that is exactly "btrim(p_batch_name)," (the required-
  -- field check also mentions p_batch_name but is followed by ", ''").
  patched := regexp_replace(
    def,
    '(\n\s*)btrim\(p_batch_name\),(\s*\r?\n)',
    E'\\1coalesce(nullif(btrim(roster_record.batch_name), ''''), btrim(p_batch_name)),\\2'
  );
  IF patched = def THEN
    RAISE EXCEPTION 'complete_my_student_registration does not match the expected definition';
  END IF;
  EXECUTE patched;
END
$do$;

COMMIT;
