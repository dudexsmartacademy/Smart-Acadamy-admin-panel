-- 055: refresh_batch_counts() must have a WHERE clause.
--
-- The statement-level trigger on student_profiles ran
--   update public.batches b set student_count = (...);
-- with no WHERE. Supabase loads pg_safeupdate for API requests, which rejects
-- that with "UPDATE requires a WHERE clause", so every student_profiles insert
-- or update made through the API failed, including student registration
-- (complete_my_student_registration). It worked from the SQL editor, which is
-- why it went unnoticed. Now only batches whose count changed are updated.

BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_batch_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.batches b
  set student_count = counts.active_count
  from (
    select batch.id,
           (select count(*) from public.student_profiles s
             where s.batch_id = batch.id and s.status = 'active') as active_count
    from public.batches as batch
  ) as counts
  where counts.id = b.id
    and b.student_count is distinct from counts.active_count;
  return null;
end $function$;

COMMIT;
