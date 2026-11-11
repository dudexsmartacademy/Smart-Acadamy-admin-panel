-- 057: Fixes from the security audit (see SECURITY_QA_AUDIT_REPORT.md).
--
-- AUD-01  Exam content before the window opens. student_can_access_assessment
--         only checks "published" and class membership, so the student views
--         returned question text, options and coding problems for scheduled
--         exams that had not started (submission already refuses before
--         start_date). Content is now readable only once the exam has started.
-- AUD-02  is_email_allowed was executable by anon, letting anyone test whether
--         an email is an enrolled student or allow-listed teacher. No portal
--         calls it; only service_role keeps EXECUTE.
-- AUD-03  Every student could read every teacher's profile row (email, phone).
--         Students now see only teachers of classes they are enrolled in.
--         Teachers still see all teachers; admins see everyone.
-- AUD-04  Hardening: fixed search_path on two SECURITY DEFINER helpers and no
--         PUBLIC/anon EXECUTE on the unused auth trigger function.

BEGIN;

-- AUD-01 -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_can_view_assessment_content(aid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.student_can_access_assessment(aid)
     and exists (
       select 1 from public.assessments a
       where a.id = aid
         and (a.start_date is null or now() >= a.start_date)
     )
$function$;

REVOKE ALL ON FUNCTION public.student_can_view_assessment_content(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_view_assessment_content(uuid) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.student_assessment_questions WITH (security_invoker = false) AS
  SELECT id, assessment_id, question_text, question_type, code_snippet, marks, order_index
  FROM public.assessment_questions q
  WHERE public.student_can_view_assessment_content(assessment_id);

CREATE OR REPLACE VIEW public.student_question_options WITH (security_invoker = false) AS
  SELECT o.id, o.question_id, o.option_label, o.option_text
  FROM public.question_options o
  JOIN public.assessment_questions q ON q.id = o.question_id
  WHERE public.student_can_view_assessment_content(q.assessment_id);

CREATE OR REPLACE VIEW public.student_coding_problems WITH (security_invoker = false) AS
  SELECT id, assessment_id, title, description, difficulty, language, starter_code, public_examples, marks
  FROM public.coding_problems p
  WHERE public.student_can_view_assessment_content(assessment_id);

-- Legacy view (no portal uses it): same start-time rule as the others.
CREATE OR REPLACE VIEW public.coding_problems_student WITH (security_invoker = false) AS
  SELECT p.id, p.assessment_id, p.title, p.description, p.difficulty, p.language,
         p.starter_code, p.public_examples, p.marks
  FROM public.coding_problems p
  JOIN public.assessments a ON a.id = p.assessment_id
  WHERE a.published AND a.class_id IS NOT NULL AND public.in_class(a.class_id)
    AND (a.start_date IS NULL OR a.start_date <= now());

-- AUD-02 -------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.is_email_allowed(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO service_role;

-- AUD-03 -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_has_teacher(p_teacher_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.class_memberships m
    join public.classes c on c.id = m.class_id
    where m.student_id = auth.uid()
      and (c.teacher_id = p_teacher_id
           or exists (select 1 from public.teacher_assignments ta
                      where ta.class_id = c.id and ta.teacher_id = p_teacher_id))
  )
$function$;

REVOKE ALL ON FUNCTION public.student_has_teacher(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_has_teacher(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (id = auth.uid())
    OR ((role = 'teacher') AND is_teacher())
    OR ((role = 'teacher') AND is_student() AND student_has_teacher(id))
    OR ((role = 'student') AND is_teacher() AND teacher_has_student(id))
  );

-- AUD-04 -------------------------------------------------------------------
ALTER FUNCTION public.current_user_role() SET search_path TO 'public';
ALTER FUNCTION public.get_user_role() SET search_path TO 'public';
REVOKE ALL ON FUNCTION public.handle_new_auth_user_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_profile() TO service_role;

COMMIT;
