-- 048: Let the student registration form load department/specialization
-- options before sign-in, matching the existing anonymous read access on
-- colleges and courses. Read-only reference data; no write access is granted.

BEGIN;

GRANT SELECT ON public.departments, public.specializations TO anon;

DROP POLICY IF EXISTS departments_read_anon ON public.departments;
CREATE POLICY departments_read_anon ON public.departments
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS specializations_read_anon ON public.specializations;
CREATE POLICY specializations_read_anon ON public.specializations
  FOR SELECT TO anon
  USING (true);

COMMIT;
