-- Read-only verification for 045_live_portal_contracts.sql.
-- Run after applying the migration. These queries return catalog metadata only.

SELECT
  to_regclass('public.student_email_roster') AS roster_table,
  to_regclass('public.teacher_profiles') AS teacher_profiles_table,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teacher_profiles'
      AND column_name = 'faculty_id'
  ) AS teacher_faculty_id_column_exists,
  COALESCE((
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = to_regclass('public.student_email_roster')
  ), false) AS roster_rls_enabled;

SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'student_email_roster';

SELECT
  procedure.proname AS function_name,
  pg_get_function_identity_arguments(procedure.oid) AS arguments,
  procedure.prosecdef AS security_definer,
  has_function_privilege('anon', procedure.oid, 'EXECUTE') AS executable_by_anon,
  has_function_privilege('authenticated', procedure.oid, 'EXECUTE') AS executable_by_authenticated
FROM pg_proc AS procedure
JOIN pg_namespace AS namespace
  ON namespace.oid = procedure.pronamespace
WHERE namespace.nspname = 'public'
  AND procedure.proname IN (
    'dudex_is_admin',
    'get_my_student_roster_profile',
    'complete_my_student_registration',
    'provision_teacher_account'
  )
ORDER BY procedure.proname, arguments;

SELECT
  trigger_row.tgname AS trigger_name,
  function_row.proname AS function_name
FROM pg_trigger AS trigger_row
JOIN pg_class AS table_row
  ON table_row.oid = trigger_row.tgrelid
JOIN pg_namespace AS table_namespace
  ON table_namespace.oid = table_row.relnamespace
JOIN pg_proc AS function_row
  ON function_row.oid = trigger_row.tgfoid
JOIN pg_namespace AS function_namespace
  ON function_namespace.oid = function_row.pronamespace
WHERE table_namespace.nspname = 'auth'
  AND table_row.relname = 'users'
  AND function_namespace.nspname = 'public'
  AND function_row.proname IN ('handle_new_user', 'handle_new_auth_user_profile')
  AND NOT trigger_row.tgisinternal
ORDER BY trigger_row.tgname;
