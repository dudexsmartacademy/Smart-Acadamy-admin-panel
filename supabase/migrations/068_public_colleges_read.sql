-- 068: Allow public/anonymous read access to academic reference tables (colleges)
-- so the student registration form can load colleges and their degrees/batches
-- before authentication, matching departments and specializations in 048.

BEGIN;

GRANT SELECT ON public.colleges TO anon;

DROP POLICY IF EXISTS colleges_read_anon ON public.colleges;
CREATE POLICY colleges_read_anon ON public.colleges
  FOR SELECT TO anon
  USING (true);

COMMIT;
