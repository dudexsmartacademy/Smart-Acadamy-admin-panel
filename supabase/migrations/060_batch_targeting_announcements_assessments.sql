-- 060: Batch targeting for announcements and assessments (see 059).
--
-- Announcements and assessments get a list of global batches. Students see
-- the ones for their own batch (my_student_batch()); rows that still target
-- an academic class keep working through the class-membership checks.

BEGIN;

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS batches text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS batches text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS announcements_batches_idx ON public.announcements USING gin (batches);
CREATE INDEX IF NOT EXISTS assessments_batches_idx ON public.assessments USING gin (batches);

UPDATE public.announcements AS a
SET batches = ARRAY[c.batch]
FROM public.classes AS c
WHERE a.target_class_id = c.id AND nullif(btrim(c.batch), '') IS NOT NULL AND a.batches = '{}';

UPDATE public.assessments AS a
SET batches = ARRAY[c.batch]
FROM public.classes AS c
WHERE a.class_id = c.id AND nullif(btrim(c.batch), '') IS NOT NULL AND a.batches = '{}';

-- Announcements: an announcement with neither a class nor batches is for
-- everyone in the target role; otherwise only its class or batches see it.
DROP POLICY IF EXISTS ann_read ON public.announcements;
CREATE POLICY ann_read ON public.announcements
  FOR SELECT TO authenticated
  USING (
    target_role = ANY (ARRAY['all'::text, public.current_role_name()])
    AND COALESCE(publish_date, now()) <= now()
    AND (expiry_date IS NULL OR expiry_date > now())
    AND (
      (target_class_id IS NULL AND batches = '{}')
      OR public.student_in_class(target_class_id)
      OR public.teacher_has_class(target_class_id)
      OR public.my_student_batch() = ANY (batches)
    )
  );

-- Assessments: published ones are visible to their class, batch id, or batches.
CREATE OR REPLACE FUNCTION public.student_can_access_assessment(aid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.assessments a
    where a.id = aid and a.published
      and (public.student_in_class(a.class_id)
           or (a.batch_id is not null and a.batch_id = (
                 select sp.batch_id from public.student_profiles sp where sp.user_id = auth.uid()))
           or public.my_student_batch() = any (a.batches))
  )
$function$;

COMMIT;
