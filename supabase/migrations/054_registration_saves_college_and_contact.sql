-- 054: Student registration saves the college, register number, specialization
-- and phone on student_profiles.
--
-- complete_my_student_registration only wrote department/course/batch/section/
-- year, so student_profiles.college_name kept its column default ("Dudex Smart
-- Academy") and register_number, specialization and phone stayed null. Teacher
-- and admin views that read student_profiles showed the wrong college.
-- The function is recreated in full (same signature and grants), keeping 053's
-- admin-assigned batch, and existing rows are backfilled from the roster.

BEGIN;

CREATE OR REPLACE FUNCTION public.complete_my_student_registration(p_full_name text, p_phone text, p_register_number text, p_course text, p_specialization text, p_batch_name text, p_section text, p_academic_year text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
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
    college_name,
    department,
    course_name,
    specialization,
    batch_name,
    section,
    academic_year,
    roll_number,
    register_number,
    phone,
    status,
    updated_at
  )
  VALUES (
    student_user_id,
    roster_record.college_name,
    coalesce(nullif(btrim(roster_record.department), ''), btrim(p_specialization)),
    btrim(p_course) || ' - ' || btrim(p_specialization),
    btrim(p_specialization),
    -- The admin-assigned batch (if any) wins over what was typed.
    coalesce(nullif(btrim(roster_record.batch_name), ''), btrim(p_batch_name)),
    btrim(p_section),
    btrim(p_academic_year),
    COALESCE(nullif(btrim(roster_record.student_id), ''), btrim(p_register_number)),
    btrim(p_register_number),
    btrim(p_phone),
    'active',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET college_name = EXCLUDED.college_name,
        department = EXCLUDED.department,
        course_name = EXCLUDED.course_name,
        specialization = EXCLUDED.specialization,
        batch_name = EXCLUDED.batch_name,
        section = EXCLUDED.section,
        academic_year = EXCLUDED.academic_year,
        roll_number = COALESCE(EXCLUDED.roll_number, student_profiles.roll_number),
        register_number = EXCLUDED.register_number,
        phone = EXCLUDED.phone,
        updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_my_student_registration(text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_my_student_registration(text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_my_student_registration(text, text, text, text, text, text, text, text) TO service_role;

-- Backfill students who registered before this fix.
UPDATE public.student_profiles AS sp
SET college_name = roster.college_name,
    register_number = coalesce(sp.register_number, sp.roll_number),
    phone = coalesce(sp.phone, profile.phone)
FROM auth.users AS auth_user
JOIN public.student_email_roster AS roster
  ON lower(roster.email) = lower(auth_user.email)
 AND roster.status = 'active'
LEFT JOIN public.profiles AS profile
  ON profile.id = auth_user.id
WHERE auth_user.id = sp.user_id
  AND (sp.college_name IS DISTINCT FROM roster.college_name
       OR sp.register_number IS NULL
       OR sp.phone IS NULL);

COMMIT;
