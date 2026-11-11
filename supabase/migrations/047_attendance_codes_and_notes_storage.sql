-- 047: Attendance-code check-in and the `notes` storage bucket.
--
-- Adds only new objects; it does not alter or drop existing tables, columns
-- or policies. Written against the live schema as probed through the Data API:
--   * teacher_id / student_id columns reference public.profiles(id)
--   * attendance_records(student_id, class_id, teacher_id, date, session_time,
--     mode, subject, status) has no session_id
--   * attendance_sessions has no code column
--   * public.dudex_is_admin() exists (migration 045)
-- Apply to a staging/branch database first, then production.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Attendance codes
-- ---------------------------------------------------------------------------
-- Codes live in their own table so they are never exposed by existing
-- attendance_sessions policies. Students reach them only through
-- mark_attendance_with_code(); teachers only see codes they created.

CREATE TABLE IF NOT EXISTS public.attendance_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject text,
  code text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS attendance_codes_code_idx
  ON public.attendance_codes (code, expires_at);

ALTER TABLE public.attendance_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.attendance_codes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.attendance_codes TO authenticated;

DROP POLICY IF EXISTS attendance_codes_creator_read ON public.attendance_codes;
CREATE POLICY attendance_codes_creator_read ON public.attendance_codes
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.dudex_is_admin());

-- True when the caller is a teacher assigned to (or owning) the class.
CREATE OR REPLACE FUNCTION public.dudex_teaches_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
           SELECT 1 FROM public.profiles
           WHERE id = auth.uid() AND role = 'teacher'
         )
     AND (
           EXISTS (
             SELECT 1 FROM public.teacher_assignments
             WHERE teacher_id = auth.uid() AND class_id = p_class_id
           )
           OR EXISTS (
             SELECT 1 FROM public.classes
             WHERE id = p_class_id AND teacher_id = auth.uid()
           )
         );
$function$;

REVOKE ALL ON FUNCTION public.dudex_teaches_class(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dudex_teaches_class(uuid) TO authenticated;

-- Teacher starts a code session for a class. Any earlier live code the same
-- teacher issued for that class is expired.
CREATE OR REPLACE FUNCTION public.start_attendance_code_session(
  p_class_id uuid,
  p_subject text DEFAULT NULL,
  p_valid_minutes integer DEFAULT 10
)
RETURNS TABLE (code_id uuid, code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  new_id uuid;
  new_expiry timestamptz;
  attempts integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A signed-in teacher is required' USING ERRCODE = '42501';
  END IF;

  IF NOT (public.dudex_teaches_class(p_class_id) OR public.dudex_is_admin()) THEN
    RAISE EXCEPTION 'You are not assigned to this class' USING ERRCODE = '42501';
  END IF;

  IF p_valid_minutes IS NULL OR p_valid_minutes < 1 OR p_valid_minutes > 180 THEN
    RAISE EXCEPTION 'Code validity must be between 1 and 180 minutes' USING ERRCODE = '22023';
  END IF;

  UPDATE public.attendance_codes AS ac
  SET expires_at = now()
  WHERE ac.class_id = p_class_id
    AND ac.created_by = auth.uid()
    AND ac.expires_at > now();

  LOOP
    attempts := attempts + 1;
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.attendance_codes AS ac
      WHERE ac.code = new_code AND ac.expires_at > now()
    );
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not allocate a unique attendance code';
    END IF;
  END LOOP;

  new_expiry := now() + make_interval(mins => p_valid_minutes);

  INSERT INTO public.attendance_codes (class_id, subject, code, created_by, expires_at)
  VALUES (p_class_id, nullif(btrim(p_subject), ''), new_code, auth.uid(), new_expiry)
  RETURNING id INTO new_id;

  RETURN QUERY SELECT new_id, new_code, new_expiry;
END;
$function$;

REVOKE ALL ON FUNCTION public.start_attendance_code_session(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_attendance_code_session(uuid, text, integer) TO authenticated;

-- Teacher stops a code early.
CREATE OR REPLACE FUNCTION public.stop_attendance_code_session(p_code_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  UPDATE public.attendance_codes
  SET expires_at = now()
  WHERE id = p_code_id
    AND (created_by = auth.uid() OR public.dudex_is_admin())
    AND expires_at > now();
END;
$function$;

REVOKE ALL ON FUNCTION public.stop_attendance_code_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stop_attendance_code_session(uuid) TO authenticated;

-- Student checks in with a code. Only students enrolled in the code's class
-- can mark themselves present, once per code's class/subject/day.
CREATE OR REPLACE FUNCTION public.mark_attendance_with_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  code_row public.attendance_codes%ROWTYPE;
  existing_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A signed-in student is required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Student access is required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO code_row
  FROM public.attendance_codes
  WHERE code = upper(btrim(p_code))
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired attendance code' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.class_memberships
    WHERE class_id = code_row.class_id AND student_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not enrolled in this class' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO existing_id
  FROM public.attendance_records
  WHERE student_id = auth.uid()
    AND class_id = code_row.class_id
    AND date = current_date
    AND subject = coalesce(code_row.subject, 'General')
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_marked', 'record_id', existing_id);
  END IF;

  INSERT INTO public.attendance_records (
    student_id, class_id, teacher_id, date, session_time, mode, subject, status
  )
  VALUES (
    auth.uid(), code_row.class_id, code_row.created_by, current_date,
    'Code check-in', 'offline', coalesce(code_row.subject, 'General'), 'Present'
  )
  RETURNING id INTO existing_id;

  RETURN jsonb_build_object('status', 'marked', 'record_id', existing_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_attendance_with_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_attendance_with_code(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. `notes` storage bucket (teacher note/material attachments)
-- ---------------------------------------------------------------------------
-- Private bucket: files are read through signed URLs by signed-in users.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('notes', 'notes', false, 52428800)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS dudex_notes_read ON storage.objects;
CREATE POLICY dudex_notes_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'notes');

DROP POLICY IF EXISTS dudex_notes_teacher_upload ON storage.objects;
CREATE POLICY dudex_notes_teacher_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'notes'
    AND (
      public.dudex_is_admin()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
    )
  );

DROP POLICY IF EXISTS dudex_notes_owner_delete ON storage.objects;
CREATE POLICY dudex_notes_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'notes' AND (owner = auth.uid() OR public.dudex_is_admin()));

COMMIT;
