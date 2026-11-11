-- 056: Classes enrol their students automatically.
--
-- The admin assigns a teacher to a class (college + specialization + batch +
-- section + academic year) from Teachers -> Classes. Students are matched on
-- those same student_profiles fields:
-- * classes.college_name: classes had no college, so two colleges with the same
--   batch/section names could not be told apart.
-- * trg_enroll_students_for_class: a new or edited class enrols every active
--   student that matches.
-- * trg_enroll_student_in_classes: a student who registers (or whose details
--   change) later joins every matching class.
-- Enrolment only adds memberships; it never removes them, so teachers and
-- admins can still manage memberships by hand.

BEGIN;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS college_name text;

CREATE OR REPLACE FUNCTION public.enroll_students_for_class()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.class_memberships (class_id, student_id)
  select new.id, sp.user_id
  from public.student_profiles as sp
  where sp.status = 'active'
    and lower(btrim(sp.college_name)) = lower(btrim(new.college_name))
    and lower(btrim(sp.batch_name)) = lower(btrim(new.batch))
    and lower(btrim(sp.section)) = lower(btrim(new.section))
    and btrim(sp.academic_year) = btrim(new.academic_year)
    and lower(btrim(new.department)) in (
      lower(btrim(coalesce(sp.specialization, ''))),
      lower(btrim(coalesce(sp.department, '')))
    )
  on conflict (class_id, student_id) do nothing;
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.enroll_student_in_classes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status is distinct from 'active' then
    return null;
  end if;
  insert into public.class_memberships (class_id, student_id)
  select c.id, new.user_id
  from public.classes as c
  where lower(btrim(c.college_name)) = lower(btrim(new.college_name))
    and lower(btrim(c.batch)) = lower(btrim(new.batch_name))
    and lower(btrim(c.section)) = lower(btrim(new.section))
    and btrim(c.academic_year) = btrim(new.academic_year)
    and lower(btrim(c.department)) in (
      lower(btrim(coalesce(new.specialization, ''))),
      lower(btrim(coalesce(new.department, '')))
    )
  on conflict (class_id, student_id) do nothing;
  return null;
end $function$;

REVOKE ALL ON FUNCTION public.enroll_students_for_class() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enroll_student_in_classes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enroll_students_for_class ON public.classes;
CREATE TRIGGER trg_enroll_students_for_class
  AFTER INSERT OR UPDATE OF college_name, department, batch, section, academic_year
  ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.enroll_students_for_class();

DROP TRIGGER IF EXISTS trg_enroll_student_in_classes ON public.student_profiles;
CREATE TRIGGER trg_enroll_student_in_classes
  AFTER INSERT OR UPDATE OF college_name, department, specialization, batch_name, section, academic_year, status
  ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enroll_student_in_classes();

COMMIT;
