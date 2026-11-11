-- Read-only audit for the shared Dudex Smart Academy Supabase project.
-- Run each SELECT separately in the Supabase SQL Editor and share only the
-- result sets. Do not paste database passwords, API keys, or user rows.

-- 1. Confirm the database and PostgreSQL version.
SELECT
  current_database() AS database_name,
  current_setting('server_version') AS postgres_version,
  current_schema() AS current_schema;

-- 2. Check the expected objects without assuming they exist.
SELECT
  object_name,
  to_regclass('public.' || object_name) AS object_reference
FROM (
  VALUES
    ('profiles'),
    ('user_roles'),
    ('student_profiles'),
    ('teacher_profiles'),
    ('teacher_attendance'),
    ('teacher_leaves'),
    ('student_email_roster'),
    ('colleges'),
    ('departments'),
    ('batches'),
    ('academic_years'),
    ('sections'),
    ('classes'),
    ('class_memberships'),
    ('subjects'),
    ('courses'),
    ('live_classes'),
    ('class_sessions'),
    ('attendance_records'),
    ('calendar_events'),
    ('academic_events'),
    ('assessments'),
    ('assessment_questions'),
    ('question_options'),
    ('mcq_questions'),
    ('student_attempts'),
    ('student_answers'),
    ('notes'),
    ('announcements'),
    ('activity_logs')
) AS expected(object_name)
ORDER BY object_name;

-- 3. List public tables/views and their RLS flags.
SELECT
  n.nspname AS schema_name,
  c.relname AS object_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'p' THEN 'partitioned table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized view'
    WHEN 'f' THEN 'foreign table'
    ELSE c.relkind::text
  END AS object_type,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
ORDER BY object_name;

-- 4. List public columns, types, nullability, and defaults.
SELECT
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 5. List all public RLS policies. Policies are permissive by default and
-- permissive policies are OR-combined, so broad policies matter.
SELECT
  schemaname,
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

-- 6. Highlight unconditional policies.
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    lower(trim(coalesce(qual, ''))) IN ('true', '(true)')
    OR lower(trim(coalesce(with_check, ''))) IN ('true', '(true)')
  )
ORDER BY tablename, policyname;

-- 7. List foreign keys to verify the real relationships before writing policies.
SELECT
  source_ns.nspname AS source_schema,
  source_table.relname AS source_table,
  constraint_row.conname AS constraint_name,
  target_ns.nspname AS target_schema,
  target_table.relname AS target_table,
  pg_get_constraintdef(constraint_row.oid, true) AS definition
FROM pg_constraint AS constraint_row
JOIN pg_class AS source_table ON source_table.oid = constraint_row.conrelid
JOIN pg_namespace AS source_ns ON source_ns.oid = source_table.relnamespace
JOIN pg_class AS target_table ON target_table.oid = constraint_row.confrelid
JOIN pg_namespace AS target_ns ON target_ns.oid = target_table.relnamespace
WHERE constraint_row.contype = 'f'
  AND source_ns.nspname = 'public'
ORDER BY source_table.relname, constraint_row.conname;

-- 8. List Auth/profile triggers and their implementation functions.
SELECT
  trigger_ns.nspname AS table_schema,
  trigger_table.relname AS table_name,
  trigger_row.tgname AS trigger_name,
  pg_get_triggerdef(trigger_row.oid, true) AS trigger_definition,
  function_ns.nspname AS function_schema,
  function_row.proname AS function_name,
  pg_get_functiondef(function_row.oid) AS function_definition
FROM pg_trigger AS trigger_row
JOIN pg_class AS trigger_table ON trigger_table.oid = trigger_row.tgrelid
JOIN pg_namespace AS trigger_ns ON trigger_ns.oid = trigger_table.relnamespace
JOIN pg_proc AS function_row ON function_row.oid = trigger_row.tgfoid
JOIN pg_namespace AS function_ns ON function_ns.oid = function_row.pronamespace
WHERE NOT trigger_row.tgisinternal
  AND (
    (trigger_ns.nspname = 'auth' AND trigger_table.relname = 'users')
    OR (trigger_ns.nspname = 'public' AND trigger_table.relname IN ('profiles', 'student_profiles', 'teacher_profiles'))
  )
ORDER BY trigger_ns.nspname, trigger_table.relname, trigger_row.tgname;

-- 9. List public SECURITY DEFINER functions and their signatures.
SELECT
  function_row.proname AS function_name,
  pg_get_function_identity_arguments(function_row.oid) AS arguments,
  pg_get_function_result(function_row.oid) AS result_type,
  function_row.proconfig AS function_settings,
  pg_get_functiondef(function_row.oid) AS definition
FROM pg_proc AS function_row
JOIN pg_namespace AS function_ns ON function_ns.oid = function_row.pronamespace
WHERE function_ns.nspname = 'public'
  AND function_row.prosecdef
ORDER BY function_row.proname, arguments;

-- 10. Inspect grants for Data API roles without returning application rows.
SELECT
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

-- 11. Inspect user_roles view definition and view options, if it exists.
SELECT
  to_regclass('public.user_roles') AS user_roles_object,
  CASE
    WHEN class_row.relkind = 'v' THEN pg_get_viewdef(class_row.oid, true)
  END AS view_definition,
  class_row.reloptions AS view_options
FROM (SELECT to_regclass('public.user_roles') AS object_oid) AS checked
LEFT JOIN pg_class AS class_row ON class_row.oid = checked.object_oid;

-- 12. Aggregate role conflicts without exposing identities.
-- Run only if public.user_roles exposes user_id and role.
SELECT count(*) AS users_with_multiple_role_rows
FROM (
  SELECT user_id
  FROM public.user_roles
  GROUP BY user_id
  HAVING count(*) > 1
) AS conflicting_users;

-- 13. Aggregate teacher-profile/role mismatches without exposing identities.
-- Run only if teacher_profiles.user_id exists.
SELECT count(*) AS teacher_profiles_not_assigned_teacher_role
FROM public.teacher_profiles AS teacher_profile
LEFT JOIN public.user_roles AS user_role
  ON user_role.user_id = teacher_profile.user_id
 AND user_role.role = 'teacher'
WHERE user_role.user_id IS NULL;

-- 14. Identify Data API roles with grants on tables that do not have RLS.
SELECT
  table_privileges.table_name,
  table_privileges.grantee,
  table_privileges.privilege_type
FROM information_schema.role_table_grants AS table_privileges
JOIN pg_class AS table_row
  ON table_row.relname = table_privileges.table_name
JOIN pg_namespace AS table_ns
  ON table_ns.oid = table_row.relnamespace
 AND table_ns.nspname = table_privileges.table_schema
WHERE table_privileges.table_schema = 'public'
  AND table_privileges.grantee IN ('anon', 'authenticated')
  AND table_row.relkind IN ('r', 'p')
  AND NOT table_row.relrowsecurity
ORDER BY table_privileges.table_name, table_privileges.grantee, table_privileges.privilege_type;

-- 15. Inspect Data API role grants on public functions/RPCs.
SELECT
  routine_name,
  specific_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE specific_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY routine_name, specific_name, grantee, privilege_type;

-- 16. Inspect storage policies without returning storage object names or user data.
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename IN ('objects', 'buckets')
ORDER BY tablename, policyname;

-- 17. Find future public-table grants inherited by Data API roles.
SELECT
  namespace_row.nspname AS schema_name,
  role_row.rolname AS grantor_role,
  grantee_row.rolname AS grantee_role,
  default_acl_row.defaclobjtype AS object_type,
  default_acl_row.defaclacl AS default_privileges
FROM pg_default_acl AS default_acl_row
JOIN pg_namespace AS namespace_row
  ON namespace_row.oid = default_acl_row.defaclnamespace
JOIN pg_roles AS role_row
  ON role_row.oid = default_acl_row.defaclrole
CROSS JOIN LATERAL aclexplode(default_acl_row.defaclacl) AS acl_entry
JOIN pg_roles AS grantee_row
  ON grantee_row.oid = acl_entry.grantee
WHERE namespace_row.nspname = 'public'
  AND grantee_row.rolname IN ('anon', 'authenticated')
ORDER BY object_type, grantor_role, grantee_role;
