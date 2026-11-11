-- Read-only verification for 046_shared_portal_rls.sql.
-- These queries return catalog metadata only, not application records.

SELECT
  relation.relname AS table_name,
  relation.relrowsecurity AS rls_enabled,
  relation.relforcerowsecurity AS rls_forced
FROM pg_class AS relation
JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relkind IN ('r', 'p')
  AND NOT relation.relrowsecurity
ORDER BY relation.relname;

SELECT
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

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
ORDER BY tablename, policyname;

SELECT
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

SELECT
  function_row.proname AS function_name,
  pg_get_function_identity_arguments(function_row.oid) AS arguments,
  function_row.prosecdef AS security_definer,
  has_function_privilege('anon', function_row.oid, 'EXECUTE') AS executable_by_anon,
  has_function_privilege('authenticated', function_row.oid, 'EXECUTE') AS executable_by_authenticated
FROM pg_proc AS function_row
JOIN pg_namespace AS namespace ON namespace.oid = function_row.pronamespace
WHERE namespace.nspname = 'public'
  AND function_row.proname LIKE 'dudex_%'
ORDER BY function_row.proname, arguments;

SELECT
  to_regclass('public.student_mcq_questions') AS student_safe_question_view,
  to_regclass('public.student_assessment_questions') AS student_safe_assessment_question_view,
  to_regclass('public.student_question_options') AS student_safe_option_view;
