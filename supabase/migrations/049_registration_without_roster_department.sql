-- 049: The admin roster no longer collects department or student ID; students
-- enter their academic details at registration. complete_my_student_registration
-- (migration 045) required roster.department, so registration would fail.
-- This rewrites the live function in place: department now falls back to the
-- specialization the student selects. Grants are unchanged (CREATE OR REPLACE).

DO $do$
DECLARE
  def text := pg_get_functiondef(
    'public.complete_my_student_registration(text, text, text, text, text, text, text, text)'::regprocedure
  );
  -- Whitespace-tolerant: the live body may use CRLF line endings.
  required_check constant text := $q$IF nullif\(btrim\(roster_record\.department\), ''\) IS NULL THEN\s+RAISE EXCEPTION 'The active roster entry must include a department'\s+USING ERRCODE = '22023';\s+END IF;$q$;
BEGIN
  def := regexp_replace(def, required_check, '');

  IF position($q$    btrim(roster_record.department),$q$ in def) > 0 THEN
    def := replace(
      def,
      $q$    btrim(roster_record.department),$q$,
      $q$    coalesce(nullif(btrim(roster_record.department), ''), btrim(p_specialization)),$q$
    );
  ELSIF position($q$coalesce(nullif(btrim(roster_record.department), ''), btrim(p_specialization))$q$ in def) = 0 THEN
    RAISE EXCEPTION 'complete_my_student_registration does not match the expected definition';
  END IF;

  EXECUTE def;
END
$do$;
