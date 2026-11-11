-- 059: Batch targeting for live classes, notes and attendance codes.
--
-- Batches are numbered globally across colleges ("Batch 1", "Batch 2", ...;
-- a new college continues the numbering). Live classes, notes and attendance
-- codes now target a list of batches instead of one academic class, and
-- students see what targets their own batch (student_profiles.batch_name).
-- Rows that still carry a class_id keep working through the existing
-- class-membership policies.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Batch lists
-- ---------------------------------------------------------------------------
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS batches text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS batches text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.attendance_codes ADD COLUMN IF NOT EXISTS batches text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.attendance_codes ALTER COLUMN class_id DROP NOT NULL;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS batch_name text;

CREATE INDEX IF NOT EXISTS live_classes_batches_idx ON public.live_classes USING gin (batches);
CREATE INDEX IF NOT EXISTS notes_batches_idx ON public.notes USING gin (batches);

-- Existing class-targeted rows get the batch of their class.
UPDATE public.live_classes AS lc
SET batches = ARRAY[c.batch]
FROM public.classes AS c
WHERE lc.class_id = c.id AND nullif(btrim(c.batch), '') IS NOT NULL AND lc.batches = '{}';

UPDATE public.notes AS n
SET batches = ARRAY[c.batch]
FROM public.classes AS c
WHERE n.class_id = c.id AND nullif(btrim(c.batch), '') IS NOT NULL AND n.batches = '{}';

-- ---------------------------------------------------------------------------
-- 2. Global batch numbering
-- ---------------------------------------------------------------------------
-- crescent was created with its own "Batch 1"; misty cloud owns Batch 1-2.
UPDATE public.colleges SET batches = '{"Batch 3"}' WHERE name = 'crescent' AND batches = '{"Batch 1"}';

-- A batch name belongs to exactly one college.
CREATE OR REPLACE FUNCTION public.dudex_unique_college_batches()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  clash text;
BEGIN
  SELECT b INTO clash
  FROM unnest(NEW.batches) AS b
  WHERE EXISTS (
    SELECT 1 FROM public.colleges AS other
    WHERE other.id <> NEW.id AND b = ANY(other.batches)
  )
  LIMIT 1;
  IF clash IS NOT NULL THEN
    RAISE EXCEPTION '% already belongs to another college; batch numbers are global', clash
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS dudex_unique_college_batches ON public.colleges;
CREATE TRIGGER dudex_unique_college_batches
  BEFORE INSERT OR UPDATE OF batches ON public.colleges
  FOR EACH ROW EXECUTE FUNCTION public.dudex_unique_college_batches();

-- ---------------------------------------------------------------------------
-- 3. Read access by batch
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_student_batch()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select nullif(btrim(batch_name), '') from public.student_profiles where user_id = auth.uid() limit 1
$function$;
REVOKE ALL ON FUNCTION public.my_student_batch() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_student_batch() TO authenticated;

DROP POLICY IF EXISTS lc_student_batch ON public.live_classes;
CREATE POLICY lc_student_batch ON public.live_classes
  FOR SELECT TO authenticated
  USING (public.my_student_batch() = ANY (batches));

DROP POLICY IF EXISTS notes_student_batch ON public.notes;
CREATE POLICY notes_student_batch ON public.notes
  FOR SELECT TO authenticated
  USING (public.my_student_batch() = ANY (batches));

DROP POLICY IF EXISTS na_student_batch ON public.note_attachments;
CREATE POLICY na_student_batch ON public.note_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.notes AS n
    WHERE n.id = note_attachments.note_id AND public.my_student_batch() = ANY (n.batches)
  ));

-- Teachers work with every batch, so they can read student records.
DROP POLICY IF EXISTS sp_teacher_batches ON public.student_profiles;
CREATE POLICY sp_teacher_batches ON public.student_profiles
  FOR SELECT TO authenticated
  USING (public.is_teacher());

DROP POLICY IF EXISTS profiles_teacher_students ON public.profiles;
CREATE POLICY profiles_teacher_students ON public.profiles
  FOR SELECT TO authenticated
  USING (role = 'student' AND public.is_teacher());

-- Students read the teacher profile of live classes / notes for their batch.
DROP POLICY IF EXISTS profiles_student_teachers ON public.profiles;
CREATE POLICY profiles_student_teachers ON public.profiles
  FOR SELECT TO authenticated
  USING (role = 'teacher' AND public.is_student());

-- ---------------------------------------------------------------------------
-- 4. Attendance codes for batches
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_batch_attendance_code(
  p_batches text[],
  p_subject text DEFAULT NULL,
  p_valid_minutes integer DEFAULT 10
)
 RETURNS TABLE(code_id uuid, code text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  new_id uuid;
  new_expiry timestamptz;
  attempts integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_teacher() OR public.dudex_is_admin()) THEN
    RAISE EXCEPTION 'A signed-in teacher is required' USING ERRCODE = '42501';
  END IF;
  IF p_batches IS NULL OR cardinality(p_batches) = 0 THEN
    RAISE EXCEPTION 'Select at least one batch' USING ERRCODE = '22023';
  END IF;
  IF p_valid_minutes IS NULL OR p_valid_minutes < 1 OR p_valid_minutes > 180 THEN
    RAISE EXCEPTION 'Code validity must be between 1 and 180 minutes' USING ERRCODE = '22023';
  END IF;

  UPDATE public.attendance_codes AS ac
  SET expires_at = now()
  WHERE ac.created_by = auth.uid() AND ac.class_id IS NULL AND ac.expires_at > now();

  LOOP
    attempts := attempts + 1;
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.attendance_codes AS ac WHERE ac.code = new_code AND ac.expires_at > now()
    );
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not allocate a unique attendance code';
    END IF;
  END LOOP;

  new_expiry := now() + make_interval(mins => p_valid_minutes);
  INSERT INTO public.attendance_codes (class_id, batches, subject, code, created_by, expires_at)
  VALUES (NULL, p_batches, nullif(btrim(p_subject), ''), new_code, auth.uid(), new_expiry)
  RETURNING id INTO new_id;

  RETURN QUERY SELECT new_id, new_code, new_expiry;
END;
$function$;
REVOKE ALL ON FUNCTION public.start_batch_attendance_code(text[], text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_batch_attendance_code(text[], text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_attendance_with_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  code_row public.attendance_codes%ROWTYPE;
  existing_id uuid;
  student_batch text := public.my_student_batch();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A signed-in student is required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student') THEN
    RAISE EXCEPTION 'Student access is required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO code_row
  FROM public.attendance_codes
  WHERE code = upper(btrim(p_code)) AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired attendance code' USING ERRCODE = 'P0002';
  END IF;

  IF code_row.class_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.class_memberships
      WHERE class_id = code_row.class_id AND student_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'You are not enrolled in this class' USING ERRCODE = '42501';
    END IF;
  ELSIF student_batch IS NULL OR NOT (student_batch = ANY (code_row.batches)) THEN
    RAISE EXCEPTION 'This code is not for your batch' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO existing_id
  FROM public.attendance_records
  WHERE student_id = auth.uid()
    AND class_id IS NOT DISTINCT FROM code_row.class_id
    AND date = current_date
    AND subject = coalesce(code_row.subject, 'General')
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_marked', 'record_id', existing_id);
  END IF;

  INSERT INTO public.attendance_records (
    student_id, class_id, batch_name, teacher_id, date, session_time, mode, subject, status
  )
  VALUES (
    auth.uid(), code_row.class_id, student_batch, code_row.created_by, current_date,
    'Code check-in', 'offline', coalesce(code_row.subject, 'General'), 'Present'
  )
  RETURNING id INTO existing_id;

  RETURN jsonb_build_object('status', 'marked', 'record_id', existing_id);
END;
$function$;

COMMIT;
