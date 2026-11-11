-- 052: Self-reported results for external (HackerRank) assessments.
--
-- External assessments are `assessments` rows with provider = 'hackerrank' and
-- an external_url. After finishing on HackerRank the student uploads a
-- screenshot and the marks shown there; the teacher who owns the assessment
-- verifies (or rejects) it, and verified marks are published to `results`.
-- Additive only.

CREATE TABLE IF NOT EXISTS public.external_assessment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_score numeric NOT NULL CHECK (reported_score >= 0),
  screenshot_path text NOT NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Rejected')),
  verified_score numeric CHECK (verified_score IS NULL OR verified_score >= 0),
  review_note text,
  reviewed_by uuid REFERENCES public.profiles(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT external_assessment_submissions_once UNIQUE (assessment_id, student_id)
);

CREATE INDEX IF NOT EXISTS external_assessment_submissions_assessment_idx
  ON public.external_assessment_submissions (assessment_id);

ALTER TABLE public.external_assessment_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.external_assessment_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.external_assessment_submissions TO authenticated;

-- Student: submit once for an assessment they can take; edit only while pending.
DROP POLICY IF EXISTS ext_student_ins ON public.external_assessment_submissions;
CREATE POLICY ext_student_ins ON public.external_assessment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid() AND public.is_student()
    AND public.student_can_access_assessment(assessment_id)
    AND status = 'Pending' AND verified_score IS NULL AND reviewed_by IS NULL
  );

DROP POLICY IF EXISTS ext_student_sel ON public.external_assessment_submissions;
CREATE POLICY ext_student_sel ON public.external_assessment_submissions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS ext_student_upd ON public.external_assessment_submissions;
CREATE POLICY ext_student_upd ON public.external_assessment_submissions
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND status = 'Pending')
  WITH CHECK (student_id = auth.uid() AND status = 'Pending' AND verified_score IS NULL AND reviewed_by IS NULL);

-- Teacher: the assessment's owner reviews its submissions.
DROP POLICY IF EXISTS ext_teacher_sel ON public.external_assessment_submissions;
CREATE POLICY ext_teacher_sel ON public.external_assessment_submissions
  FOR SELECT TO authenticated
  USING (public.is_teacher() AND public.assessment_owned_by_me(assessment_id));

DROP POLICY IF EXISTS ext_teacher_upd ON public.external_assessment_submissions;
CREATE POLICY ext_teacher_upd ON public.external_assessment_submissions
  FOR UPDATE TO authenticated
  USING (public.is_teacher() AND public.assessment_owned_by_me(assessment_id))
  WITH CHECK (public.is_teacher() AND public.assessment_owned_by_me(assessment_id));

DROP POLICY IF EXISTS admin_all ON public.external_assessment_submissions;
CREATE POLICY admin_all ON public.external_assessment_submissions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Private screenshot bucket: students upload into a folder named after their
-- user id; teachers and admins can view screenshots for review.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hackerrank-results', 'hackerrank-results', false, 5242880,
        ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS dudex_hr_student_upload ON storage.objects;
CREATE POLICY dudex_hr_student_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hackerrank-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS dudex_hr_read ON storage.objects;
CREATE POLICY dudex_hr_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'hackerrank-results'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_teacher() OR public.is_admin())
  );
