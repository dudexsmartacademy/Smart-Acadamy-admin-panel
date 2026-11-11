-- 050: Make the student "safe" assessment views usable.
--
-- These views expose questions/options/coding problems WITHOUT answer keys or
-- hidden test cases, filtered to assessments the signed-in student may take
-- (student_can_access_assessment / in_class, both keyed on auth.uid()).
-- They were created with security_invoker = true, which applies the
-- *student's* RLS on the base tables (assessment_questions, question_options,
-- coding_problems, mcq_questions). Students have no policy on those tables (by
-- design: the tables contain answer keys), so the views always returned zero
-- rows and students could never load a quiz or coding problem.
--
-- Running the views with the owner's rights lets the view's own WHERE clause do
-- the filtering, while the answer-key columns stay out of the view definitions.
-- Only `authenticated` (and service_role) have SELECT on these views.

ALTER VIEW public.student_assessment_questions SET (security_invoker = false);
ALTER VIEW public.student_question_options     SET (security_invoker = false);
ALTER VIEW public.student_coding_problems      SET (security_invoker = false);
ALTER VIEW public.mcq_questions_student        SET (security_invoker = false);
ALTER VIEW public.coding_problems_student      SET (security_invoker = false);
