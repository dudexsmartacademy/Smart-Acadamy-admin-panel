-- 061: Batch-targeted attendance policies and compatibility column.
--
-- Migration 059 introduced batch_name and nullable class_id for attendance_records
-- and attendance_codes. This migration updates RLS policies on attendance_records
-- so teachers and admins can read and write batch-level attendance, and students
-- can check in with their attendance codes.

BEGIN;

-- 1. Add safe compatibility column so queries writing teacher_name do not fail
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS teacher_name text;

-- 2. Define or update role check helpers to ensure they exist independently
CREATE OR REPLACE FUNCTION public.dudex_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.dudex_is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'
  );
$$;

REVOKE ALL ON FUNCTION public.dudex_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dudex_is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.dudex_is_teacher() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dudex_is_teacher() TO authenticated;

-- 3. Update SELECT policy on attendance_records
-- Allows students to see their own records, and teachers/admins to see batch records
DROP POLICY IF EXISTS dudex_attendance_record_read ON public.attendance_records;
CREATE POLICY dudex_attendance_record_read
  ON public.attendance_records FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.dudex_is_admin()
    OR public.dudex_is_teacher()
  );

-- 4. Update INSERT policy on attendance_records
DROP POLICY IF EXISTS dudex_attendance_record_teacher_write ON public.attendance_records;
CREATE POLICY dudex_attendance_record_teacher_write
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (
    public.dudex_is_admin()
    OR public.dudex_is_teacher()
    OR student_id = auth.uid()
  );

-- 5. Update UPDATE policy on attendance_records
DROP POLICY IF EXISTS dudex_attendance_record_teacher_update ON public.attendance_records;
CREATE POLICY dudex_attendance_record_teacher_update
  ON public.attendance_records FOR UPDATE TO authenticated
  USING (
    public.dudex_is_admin()
    OR public.dudex_is_teacher()
    OR student_id = auth.uid()
  )
  WITH CHECK (
    public.dudex_is_admin()
    OR public.dudex_is_teacher()
    OR student_id = auth.uid()
  );

COMMIT;
