BEGIN;

ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS faculty_id text;

CREATE UNIQUE INDEX IF NOT EXISTS teacher_profiles_faculty_id_lower_key
  ON public.teacher_profiles (lower(faculty_id))
  WHERE faculty_id IS NOT NULL AND btrim(faculty_id) <> '';

CREATE TABLE IF NOT EXISTS public.student_email_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE RESTRICT,
  college_name text NOT NULL,
  email text NOT NULL,
  student_name text,
  student_id text,
  department text,
  source_file_name text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_email_roster_email_normalized CHECK (email = lower(btrim(email)))
);

CREATE UNIQUE INDEX IF NOT EXISTS student_email_roster_email_lower_key
  ON public.student_email_roster (lower(email));

CREATE INDEX IF NOT EXISTS student_email_roster_college_id_idx
  ON public.student_email_roster (college_id);

CREATE OR REPLACE FUNCTION public.dudex_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'admin'
  );
$function$;

REVOKE ALL ON FUNCTION public.dudex_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dudex_is_admin() TO authenticated;

ALTER TABLE public.student_email_roster ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_email_roster FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_email_roster TO authenticated;

DROP POLICY IF EXISTS student_email_roster_admin_all ON public.student_email_roster;
CREATE POLICY student_email_roster_admin_all
  ON public.student_email_roster
  FOR ALL
  TO authenticated
  USING (public.dudex_is_admin())
  WITH CHECK (public.dudex_is_admin());

CREATE OR REPLACE FUNCTION public.get_my_student_roster_profile()
RETURNS TABLE (
  full_name text,
  college_name text,
  student_id text,
  department text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT
    COALESCE(roster.student_name, profile.full_name),
    roster.college_name,
    roster.student_id,
    roster.department
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

CREATE OR REPLACE FUNCTION public.complete_my_student_registration(
  p_full_name text,
  p_phone text,
  p_register_number text,
  p_course text,
  p_specialization text,
  p_batch_name text,
  p_section text,
  p_academic_year text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  roster_record public.student_email_roster%ROWTYPE;
  student_user_id uuid := auth.uid();
BEGIN
  IF student_user_id IS NULL THEN
    RAISE EXCEPTION 'A signed-in student account is required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = student_user_id
      AND profile.role = 'student'
  ) THEN
    RAISE EXCEPTION 'Student access is required'
      USING ERRCODE = '42501';
  END IF;

  SELECT roster.*
  INTO roster_record
  FROM auth.users AS auth_user
  JOIN public.student_email_roster AS roster
    ON lower(roster.email) = lower(auth_user.email)
   AND roster.status = 'active'
  WHERE auth_user.id = student_user_id
    AND auth_user.email_confirmed_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'An active, verified student roster entry is required'
      USING ERRCODE = '42501';
  END IF;

  IF nullif(btrim(p_full_name), '') IS NULL
     OR nullif(btrim(p_phone), '') IS NULL
     OR nullif(btrim(p_register_number), '') IS NULL
     OR nullif(btrim(p_course), '') IS NULL
     OR nullif(btrim(p_specialization), '') IS NULL
     OR nullif(btrim(p_batch_name), '') IS NULL
     OR nullif(btrim(p_section), '') IS NULL
     OR nullif(btrim(p_academic_year), '') IS NULL THEN
    RAISE EXCEPTION 'All registration and academic fields are required'
      USING ERRCODE = '22023';
  END IF;

  IF nullif(btrim(roster_record.department), '') IS NULL THEN
    RAISE EXCEPTION 'The active roster entry must include a department'
      USING ERRCODE = '22023';
  END IF;

  IF nullif(btrim(roster_record.student_id), '') IS NOT NULL
     AND lower(btrim(roster_record.student_id)) <> lower(btrim(p_register_number)) THEN
    RAISE EXCEPTION 'The register number does not match the active roster entry'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET full_name = btrim(p_full_name),
      phone = nullif(btrim(p_phone), '')
  WHERE id = student_user_id;

  INSERT INTO public.student_profiles (
    user_id,
    department,
    course_name,
    batch_name,
    section,
    academic_year,
    roll_number,
    status,
    updated_at
  )
  VALUES (
    student_user_id,
    btrim(roster_record.department),
    btrim(p_course) || ' - ' || btrim(p_specialization),
    btrim(p_batch_name),
    btrim(p_section),
    btrim(p_academic_year),
    COALESCE(nullif(btrim(roster_record.student_id), ''), btrim(p_register_number)),
    'active',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET department = EXCLUDED.department,
        course_name = EXCLUDED.course_name,
        batch_name = EXCLUDED.batch_name,
        section = EXCLUDED.section,
        academic_year = EXCLUDED.academic_year,
        roll_number = COALESCE(EXCLUDED.roll_number, student_profiles.roll_number),
        updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_my_student_registration(
  text, text, text, text, text, text, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_my_student_registration(
  text, text, text, text, text, text, text, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.provision_teacher_account(
  target_email text,
  target_full_name text,
  target_faculty_id text,
  target_department_id uuid,
  target_designation text,
  target_phone text DEFAULT NULL,
  target_qualification text DEFAULT NULL,
  target_avatar_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  account_id uuid;
  account_role text;
  teacher_profile_id uuid;
  department_name text;
  normalized_faculty_id text;
BEGIN
  IF NOT public.dudex_is_admin() THEN
    RAISE EXCEPTION 'Administrator access is required'
      USING ERRCODE = '42501';
  END IF;

  IF nullif(btrim(target_email), '') IS NULL
     OR nullif(btrim(target_full_name), '') IS NULL
     OR nullif(btrim(target_designation), '') IS NULL
     OR target_department_id IS NULL THEN
    RAISE EXCEPTION 'Email, full name, designation, and department are required'
      USING ERRCODE = '22023';
  END IF;

  normalized_faculty_id := nullif(btrim(target_faculty_id), '');

  SELECT department.name
  INTO department_name
  FROM public.departments AS department
  WHERE department.id = target_department_id;

  IF department_name IS NULL THEN
    RAISE EXCEPTION 'The selected department does not exist'
      USING ERRCODE = '22023';
  END IF;

  SELECT profile.id, profile.role
  INTO account_id, account_role
  FROM public.profiles AS profile
  WHERE lower(profile.email) = lower(btrim(target_email))
  FOR UPDATE;

  IF account_id IS NULL THEN
    RAISE EXCEPTION 'Create the Auth account before assigning a teacher role'
      USING ERRCODE = 'P0002';
  END IF;

  IF account_role = 'admin' THEN
    RAISE EXCEPTION 'An administrator account cannot be provisioned as a teacher'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET role = 'teacher',
      full_name = btrim(target_full_name),
      phone = nullif(btrim(target_phone), ''),
      avatar_url = nullif(btrim(target_avatar_url), '')
  WHERE id = account_id;

  INSERT INTO public.teacher_profiles (
    user_id,
    faculty_id,
    department,
    designation,
    qualification,
    status
  )
  VALUES (
    account_id,
    normalized_faculty_id,
    department_name,
    btrim(target_designation),
    nullif(btrim(target_qualification), ''),
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET faculty_id = EXCLUDED.faculty_id,
        department = EXCLUDED.department,
        designation = EXCLUDED.designation,
        qualification = EXCLUDED.qualification
  RETURNING id INTO teacher_profile_id;

  RETURN teacher_profile_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.provision_teacher_account(
  text, text, text, uuid, text, text, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_teacher_account(
  text, text, text, uuid, text, text, text, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'Student'
    ),
    'student',
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'phone'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'avatar_url'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'Student'
    ),
    'student',
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'phone'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'avatar_url'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

COMMIT;
