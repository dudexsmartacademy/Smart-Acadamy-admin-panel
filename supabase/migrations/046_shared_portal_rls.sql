BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated;

DO $migration$
DECLARE
  table_record record;
  policy_record record;
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.classes') IS NULL
     OR to_regclass('public.teacher_assignments') IS NULL
     OR to_regclass('public.class_memberships') IS NULL THEN
    RAISE EXCEPTION 'Required live RBAC tables are missing; no policy changes were applied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'teacher_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_assignments' AND column_name = 'teacher_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'class_memberships' AND column_name = 'student_id'
  ) THEN
    RAISE EXCEPTION 'Required live RBAC columns are missing; no policy changes were applied';
  END IF;

  FOR table_record IN
    SELECT namespace.nspname, relation.relname
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      table_record.nspname, table_record.relname);
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC, anon',
      table_record.nspname, table_record.relname);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO authenticated',
      table_record.nspname, table_record.relname);

    FOR policy_record IN
      SELECT policy.policyname
      FROM pg_policies AS policy
      WHERE policy.schemaname = 'public'
        AND policy.tablename = table_record.relname
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',
        policy_record.policyname, table_record.relname);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY dudex_admin_all ON %I.%I FOR ALL TO authenticated USING (public.dudex_is_admin()) WITH CHECK (public.dudex_is_admin())',
      table_record.nspname, table_record.relname
    );
  END LOOP;
END;
$migration$;

CREATE OR REPLACE FUNCTION public.dudex_is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    JOIN public.teacher_profiles AS teacher ON teacher.user_id = profile.id
    WHERE profile.id = auth.uid()
      AND profile.role = 'teacher'
      AND teacher.status = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION public.dudex_is_student()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    JOIN public.student_profiles AS student ON student.user_id = profile.id
    WHERE profile.id = auth.uid()
      AND profile.role = 'student'
      AND lower(COALESCE(student.status, 'active')) = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION public.dudex_teacher_can_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT public.dudex_is_teacher()
    AND (
      EXISTS (
        SELECT 1
        FROM public.classes AS class
        WHERE class.id = p_class_id
          AND class.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.teacher_assignments AS assignment
        WHERE assignment.class_id = p_class_id
          AND assignment.teacher_id = auth.uid()
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.dudex_student_in_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT public.dudex_is_student()
    AND EXISTS (
      SELECT 1
      FROM public.class_memberships AS membership
      WHERE membership.class_id = p_class_id
        AND membership.student_id = auth.uid()
    );
$function$;

CREATE OR REPLACE FUNCTION public.dudex_can_access_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT public.dudex_is_admin()
    OR public.dudex_teacher_can_class(p_class_id)
    OR public.dudex_student_in_class(p_class_id);
$function$;

CREATE OR REPLACE FUNCTION public.dudex_student_can_read_assessment(p_assessment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.assessments AS assessment
    WHERE assessment.id = p_assessment_id
      AND assessment.published IS TRUE
      AND public.dudex_student_in_class(assessment.class_id)
  );
$function$;

REVOKE ALL ON FUNCTION public.dudex_is_teacher() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dudex_is_student() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dudex_teacher_can_class(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dudex_student_in_class(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dudex_can_access_class(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dudex_student_can_read_assessment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dudex_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dudex_is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dudex_is_student() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dudex_teacher_can_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dudex_student_in_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dudex_can_access_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dudex_student_can_read_assessment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dudex_guard_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
BEGIN
  IF NOT public.dudex_is_admin()
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.id IS DISTINCT FROM OLD.id
     ) THEN
    RAISE EXCEPTION 'Only an administrator workflow may change profile identity or role'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.dudex_guard_student_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  editable_columns text[] := ARRAY[
    'dob',
    'gender',
    'address',
    'alternate_phone',
    'github_url',
    'linkedin_url',
    'portfolio_url',
    'career_interests',
    'skills',
    'personal_email',
    'updated_at'
  ];
BEGIN
  IF public.dudex_is_student()
     AND (to_jsonb(NEW) - editable_columns)
         IS DISTINCT FROM (to_jsonb(OLD) - editable_columns) THEN
    RAISE EXCEPTION 'Students may update contact and portfolio fields only'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS dudex_guard_profile_role_change ON public.profiles;
CREATE TRIGGER dudex_guard_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.dudex_guard_profile_role_change();

DROP TRIGGER IF EXISTS dudex_guard_student_profile_update ON public.student_profiles;
CREATE TRIGGER dudex_guard_student_profile_update
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.dudex_guard_student_profile_update();

DO $user_roles$
DECLARE
  roles_kind "char";
BEGIN
  SELECT relation.relkind
  INTO roles_kind
  FROM pg_class AS relation
  WHERE relation.oid = to_regclass('public.user_roles');

  IF roles_kind = 'v' THEN
    EXECUTE 'ALTER VIEW public.user_roles SET (security_invoker = true)';
    EXECUTE 'REVOKE ALL ON public.user_roles FROM PUBLIC, anon';
    EXECUTE 'GRANT SELECT ON public.user_roles TO authenticated';
  END IF;
END;
$user_roles$;

DO $policies$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    CREATE POLICY dudex_profile_self_read
      ON public.profiles FOR SELECT TO authenticated
      USING (id = auth.uid());
    CREATE POLICY dudex_profile_assigned_teacher_read
      ON public.profiles FOR SELECT TO authenticated
      USING (
        public.dudex_is_teacher()
        AND EXISTS (
          SELECT 1
          FROM public.class_memberships AS membership
          JOIN public.teacher_assignments AS assignment
            ON assignment.class_id = membership.class_id
           AND assignment.teacher_id = auth.uid()
          WHERE membership.student_id = profiles.id
        )
      );
    CREATE POLICY dudex_profile_self_update
      ON public.profiles FOR UPDATE TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;

  IF to_regclass('public.student_profiles') IS NOT NULL THEN
    CREATE POLICY dudex_student_profile_read
      ON public.student_profiles FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR (
          public.dudex_is_teacher()
          AND EXISTS (
            SELECT 1
            FROM public.class_memberships AS membership
            JOIN public.teacher_assignments AS assignment
              ON assignment.class_id = membership.class_id
             AND assignment.teacher_id = auth.uid()
            WHERE membership.student_id = student_profiles.user_id
          )
        )
      );
    CREATE POLICY dudex_student_profile_self_update
      ON public.student_profiles FOR UPDATE TO authenticated
      USING (user_id = auth.uid() AND public.dudex_is_student())
      WITH CHECK (user_id = auth.uid() AND public.dudex_is_student());
  END IF;

  IF to_regclass('public.teacher_profiles') IS NOT NULL THEN
    CREATE POLICY dudex_teacher_directory_read
      ON public.teacher_profiles FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF to_regclass('public.classes') IS NOT NULL THEN
    CREATE POLICY dudex_class_assigned_read
      ON public.classes FOR SELECT TO authenticated
      USING (
        public.dudex_teacher_can_class(id)
        OR public.dudex_student_in_class(id)
      );
  END IF;

  IF to_regclass('public.teacher_assignments') IS NOT NULL THEN
    CREATE POLICY dudex_teacher_assignment_read
      ON public.teacher_assignments FOR SELECT TO authenticated
      USING (teacher_id = auth.uid() AND public.dudex_is_teacher());
  END IF;

  IF to_regclass('public.class_memberships') IS NOT NULL THEN
    CREATE POLICY dudex_membership_read
      ON public.class_memberships FOR SELECT TO authenticated
      USING (
        student_id = auth.uid()
        OR public.dudex_teacher_can_class(class_id)
      );
  END IF;

  IF to_regclass('public.live_classes') IS NOT NULL THEN
    CREATE POLICY dudex_live_class_read
      ON public.live_classes FOR SELECT TO authenticated
      USING (public.dudex_can_access_class(class_id));
    CREATE POLICY dudex_live_class_teacher_insert
      ON public.live_classes FOR INSERT TO authenticated
      WITH CHECK (teacher_id = auth.uid() AND public.dudex_teacher_can_class(class_id));
    CREATE POLICY dudex_live_class_teacher_update
      ON public.live_classes FOR UPDATE TO authenticated
      USING (teacher_id = auth.uid() AND public.dudex_teacher_can_class(class_id))
      WITH CHECK (teacher_id = auth.uid() AND public.dudex_teacher_can_class(class_id));
  END IF;

  IF to_regclass('public.attendance_sessions') IS NOT NULL THEN
    CREATE POLICY dudex_attendance_session_read
      ON public.attendance_sessions FOR SELECT TO authenticated
      USING (public.dudex_can_access_class(class_id));
    CREATE POLICY dudex_attendance_session_teacher_write
      ON public.attendance_sessions FOR ALL TO authenticated
      USING (public.dudex_is_admin() OR public.dudex_teacher_can_class(class_id))
      WITH CHECK (public.dudex_is_admin() OR public.dudex_teacher_can_class(class_id));
  END IF;

  IF to_regclass('public.class_sessions') IS NOT NULL THEN
    CREATE POLICY dudex_class_session_read
      ON public.class_sessions FOR SELECT TO authenticated
      USING (public.dudex_can_access_class(class_id));
    CREATE POLICY dudex_class_session_teacher_write
      ON public.class_sessions FOR ALL TO authenticated
      USING (public.dudex_is_admin() OR public.dudex_teacher_can_class(class_id))
      WITH CHECK (public.dudex_is_admin() OR public.dudex_teacher_can_class(class_id));
  END IF;

  IF to_regclass('public.attendance_records') IS NOT NULL THEN
    CREATE POLICY dudex_attendance_record_read
      ON public.attendance_records FOR SELECT TO authenticated
      USING (
        student_id = auth.uid()
        OR public.dudex_teacher_can_class(class_id)
      );
    CREATE POLICY dudex_attendance_record_teacher_write
      ON public.attendance_records FOR INSERT TO authenticated
      WITH CHECK (public.dudex_teacher_can_class(class_id));
    CREATE POLICY dudex_attendance_record_teacher_update
      ON public.attendance_records FOR UPDATE TO authenticated
      USING (public.dudex_teacher_can_class(class_id))
      WITH CHECK (public.dudex_teacher_can_class(class_id));
  END IF;

  IF to_regclass('public.attendance_correction_requests') IS NOT NULL THEN
    -- The live database does not use one universal correction-request
    -- relationship. Build the predicate from the columns that actually exist
    -- instead of referencing the legacy attendance_record_id unconditionally.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'attendance_correction_requests'
        AND column_name = 'attendance_record_id'
    ) THEN
      CREATE POLICY dudex_attendance_correction_read
        ON public.attendance_correction_requests FOR SELECT TO authenticated
        USING (
          student_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.attendance_records AS attendance
            WHERE attendance.id = attendance_correction_requests.attendance_record_id
              AND public.dudex_teacher_can_class(attendance.class_id)
          )
        );
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'attendance_correction_requests'
        AND column_name = 'class_id'
    ) THEN
      CREATE POLICY dudex_attendance_correction_read
        ON public.attendance_correction_requests FOR SELECT TO authenticated
        USING (
          student_id = auth.uid()
          OR public.dudex_teacher_can_class(class_id)
        );
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'attendance_correction_requests'
        AND column_name = 'session_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'class_sessions'
        AND column_name = 'class_id'
    ) THEN
      CREATE POLICY dudex_attendance_correction_read
        ON public.attendance_correction_requests FOR SELECT TO authenticated
        USING (
          student_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.class_sessions AS class_session
            WHERE class_session.id = attendance_correction_requests.session_id
              AND public.dudex_teacher_can_class(class_session.class_id)
          )
        );
    ELSE
      -- If the live table has no class/session relationship, students may
      -- still see their own requests; teacher cross-class access stays closed.
      CREATE POLICY dudex_attendance_correction_read
        ON public.attendance_correction_requests FOR SELECT TO authenticated
        USING (student_id = auth.uid());
    END IF;
    CREATE POLICY dudex_attendance_correction_student_insert
      ON public.attendance_correction_requests FOR INSERT TO authenticated
      WITH CHECK (student_id = auth.uid() AND public.dudex_is_student());
  END IF;

  IF to_regclass('public.assessments') IS NOT NULL THEN
    CREATE POLICY dudex_assessment_read
      ON public.assessments FOR SELECT TO authenticated
      USING (
        public.dudex_teacher_can_class(class_id)
        OR (published IS TRUE AND public.dudex_student_in_class(class_id))
      );
    CREATE POLICY dudex_assessment_teacher_insert
      ON public.assessments FOR INSERT TO authenticated
      WITH CHECK (public.dudex_teacher_can_class(class_id));
    CREATE POLICY dudex_assessment_teacher_update
      ON public.assessments FOR UPDATE TO authenticated
      USING (public.dudex_teacher_can_class(class_id))
      WITH CHECK (public.dudex_teacher_can_class(class_id));
  END IF;

  IF to_regclass('public.assessment_questions') IS NOT NULL THEN
    CREATE POLICY dudex_assessment_question_read
      ON public.assessment_questions FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.assessments AS assessment
          WHERE assessment.id = assessment_questions.assessment_id
            AND (
              public.dudex_teacher_can_class(assessment.class_id)
              OR (assessment.published IS TRUE
                  AND public.dudex_student_in_class(assessment.class_id))
            )
        )
      );
    CREATE POLICY dudex_assessment_question_teacher_write
      ON public.assessment_questions FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.assessments AS assessment
          WHERE assessment.id = assessment_questions.assessment_id
            AND public.dudex_teacher_can_class(assessment.class_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.assessments AS assessment
          WHERE assessment.id = assessment_questions.assessment_id
            AND public.dudex_teacher_can_class(assessment.class_id)
        )
      );
  END IF;

  IF to_regclass('public.mcq_questions') IS NOT NULL THEN
    CREATE POLICY dudex_mcq_question_teacher_read
      ON public.mcq_questions FOR SELECT TO authenticated
      USING (
        public.dudex_is_admin()
        OR EXISTS (
          SELECT 1
          FROM public.assessments AS assessment
          WHERE assessment.id = mcq_questions.assessment_id
            AND public.dudex_teacher_can_class(assessment.class_id)
        )
      );
    CREATE POLICY dudex_mcq_question_teacher_write
      ON public.mcq_questions FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.assessments AS assessment
          WHERE assessment.id = mcq_questions.assessment_id
            AND public.dudex_teacher_can_class(assessment.class_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.assessments AS assessment
          WHERE assessment.id = mcq_questions.assessment_id
            AND public.dudex_teacher_can_class(assessment.class_id)
        )
      );
  END IF;

  IF to_regclass('public.question_options') IS NOT NULL THEN
    CREATE POLICY dudex_question_options_teacher_access
      ON public.question_options FOR ALL TO authenticated
      USING (
        public.dudex_is_admin()
        OR EXISTS (
          SELECT 1
          FROM public.mcq_questions AS question
          JOIN public.assessments AS assessment
            ON assessment.id = question.assessment_id
          WHERE question.id = question_options.question_id
            AND public.dudex_teacher_can_class(assessment.class_id)
        )
      )
      WITH CHECK (
        public.dudex_is_admin()
        OR EXISTS (
          SELECT 1
          FROM public.mcq_questions AS question
          JOIN public.assessments AS assessment
            ON assessment.id = question.assessment_id
          WHERE question.id = question_options.question_id
            AND public.dudex_teacher_can_class(assessment.class_id)
        )
      );
  END IF;

  IF to_regclass('public.student_attempts') IS NOT NULL THEN
    CREATE POLICY dudex_attempt_read
      ON public.student_attempts FOR SELECT TO authenticated
      USING (
        student_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.assessments AS assessment
          WHERE assessment.id = student_attempts.assessment_id
            AND public.dudex_teacher_can_class(assessment.class_id)
        )
      );
  END IF;

  IF to_regclass('public.results') IS NOT NULL THEN
    CREATE POLICY dudex_result_read
      ON public.results FOR SELECT TO authenticated
      USING (
        student_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.assessments AS assessment
          WHERE assessment.id = results.assessment_id
            AND public.dudex_teacher_can_class(assessment.class_id)
        )
      );
  END IF;

  IF to_regclass('public.notes') IS NOT NULL THEN
    CREATE POLICY dudex_note_read
      ON public.notes FOR SELECT TO authenticated
      USING (
        public.dudex_teacher_can_class(class_id)
        OR (
          public.dudex_student_in_class(class_id)
          AND is_published IS TRUE
          AND archived_at IS NULL
        )
      );
    CREATE POLICY dudex_note_teacher_insert
      ON public.notes FOR INSERT TO authenticated
      WITH CHECK (
        teacher_id = auth.uid()
        AND public.dudex_teacher_can_class(class_id)
      );
    CREATE POLICY dudex_note_teacher_update
      ON public.notes FOR UPDATE TO authenticated
      USING (teacher_id = auth.uid() AND public.dudex_teacher_can_class(class_id))
      WITH CHECK (teacher_id = auth.uid() AND public.dudex_teacher_can_class(class_id));
    CREATE POLICY dudex_note_teacher_delete
      ON public.notes FOR DELETE TO authenticated
      USING (teacher_id = auth.uid() AND public.dudex_teacher_can_class(class_id));
  END IF;

  IF to_regclass('public.note_attachments') IS NOT NULL THEN
    CREATE POLICY dudex_note_attachment_read
      ON public.note_attachments FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.notes AS note
          WHERE note.id = note_attachments.note_id
            AND public.dudex_can_access_class(note.class_id)
            AND (
              public.dudex_teacher_can_class(note.class_id)
              OR (note.is_published IS TRUE AND note.archived_at IS NULL)
            )
        )
      );
    CREATE POLICY dudex_note_attachment_teacher_write
      ON public.note_attachments FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.notes AS note
          WHERE note.id = note_attachments.note_id
            AND public.dudex_teacher_can_class(note.class_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.notes AS note
          WHERE note.id = note_attachments.note_id
            AND public.dudex_teacher_can_class(note.class_id)
        )
      );
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    CREATE POLICY dudex_notification_own_access
      ON public.notifications FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF to_regclass('public.announcements') IS NOT NULL THEN
    CREATE POLICY dudex_announcement_read
      ON public.announcements FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    CREATE POLICY dudex_activity_log_self_insert
      ON public.activity_logs FOR INSERT TO authenticated
      WITH CHECK (actor_id = auth.uid());
  END IF;

  IF to_regclass('public.teacher_attendance') IS NOT NULL THEN
    CREATE POLICY dudex_teacher_attendance_own_read
      ON public.teacher_attendance FOR SELECT TO authenticated
      USING (teacher_id = auth.uid() AND public.dudex_is_teacher());
  END IF;

  IF to_regclass('public.teacher_leave') IS NOT NULL THEN
    CREATE POLICY dudex_teacher_leave_own_access
      ON public.teacher_leave FOR ALL TO authenticated
      USING (teacher_id = auth.uid() AND public.dudex_is_teacher())
      WITH CHECK (teacher_id = auth.uid() AND public.dudex_is_teacher());
  END IF;

  IF to_regclass('public.teacher_leave_requests') IS NOT NULL THEN
    CREATE POLICY dudex_teacher_leave_request_own_access
      ON public.teacher_leave_requests FOR ALL TO authenticated
      USING (teacher_id = auth.uid() AND public.dudex_is_teacher())
      WITH CHECK (teacher_id = auth.uid() AND public.dudex_is_teacher());
  END IF;

  IF to_regclass('public.student_queries') IS NOT NULL THEN
    CREATE POLICY dudex_student_query_own_access
      ON public.student_queries FOR ALL TO authenticated
      USING (student_id = auth.uid() AND public.dudex_is_student())
      WITH CHECK (student_id = auth.uid() AND public.dudex_is_student());
  END IF;

  IF to_regclass('public.fee_records') IS NOT NULL THEN
    CREATE POLICY dudex_fee_record_own_read
      ON public.fee_records FOR SELECT TO authenticated
      USING (student_id = auth.uid() AND public.dudex_is_student());
  END IF;

  IF to_regclass('public.certificates') IS NOT NULL THEN
    CREATE POLICY dudex_certificate_own_read
      ON public.certificates FOR SELECT TO authenticated
      USING (student_id = auth.uid() AND public.dudex_is_student());
  END IF;

  IF to_regclass('public.enrollments') IS NOT NULL THEN
    CREATE POLICY dudex_enrollment_own_read
      ON public.enrollments FOR SELECT TO authenticated
      USING (student_id = auth.uid() AND public.dudex_is_student());
  END IF;

  IF to_regclass('public.colleges') IS NOT NULL THEN
    CREATE POLICY dudex_college_reference_read
      ON public.colleges FOR SELECT TO authenticated USING (true);
  END IF;
  IF to_regclass('public.departments') IS NOT NULL THEN
    CREATE POLICY dudex_department_reference_read
      ON public.departments FOR SELECT TO authenticated USING (true);
  END IF;
  IF to_regclass('public.specializations') IS NOT NULL THEN
    CREATE POLICY dudex_specialization_reference_read
      ON public.specializations FOR SELECT TO authenticated USING (true);
  END IF;
  IF to_regclass('public.batches') IS NOT NULL THEN
    CREATE POLICY dudex_batch_reference_read
      ON public.batches FOR SELECT TO authenticated USING (true);
  END IF;
  IF to_regclass('public.courses') IS NOT NULL THEN
    CREATE POLICY dudex_course_reference_read
      ON public.courses FOR SELECT TO authenticated USING (true);
  END IF;
  IF to_regclass('public.subjects') IS NOT NULL THEN
    CREATE POLICY dudex_subject_reference_read
      ON public.subjects FOR SELECT TO authenticated USING (true);
  END IF;
  IF to_regclass('public.platform_settings') IS NOT NULL THEN
    CREATE POLICY dudex_platform_settings_read
      ON public.platform_settings FOR SELECT TO authenticated USING (true);
  END IF;
  IF to_regclass('public.portal_features') IS NOT NULL THEN
    CREATE POLICY dudex_portal_features_read
      ON public.portal_features FOR SELECT TO authenticated USING (true);
  END IF;
  IF to_regclass('public.portal_navigation') IS NOT NULL THEN
    CREATE POLICY dudex_portal_navigation_read
      ON public.portal_navigation FOR SELECT TO authenticated USING (true);
  END IF;
  IF to_regclass('public.content_sections') IS NOT NULL THEN
    CREATE POLICY dudex_content_sections_read
      ON public.content_sections FOR SELECT TO authenticated USING (true);
  END IF;
END;
$policies$;

DO $safe_views$
DECLARE
  question_columns text;
  option_columns text;
BEGIN
  IF to_regclass('public.assessments') IS NOT NULL
     AND to_regclass('public.assessment_questions') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'assessment_questions'
         AND column_name = 'assessment_id'
     ) THEN
    SELECT string_agg(format('question.%I', column_name), ', ' ORDER BY ordinal_position)
    INTO question_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assessment_questions'
      AND column_name NOT IN ('correct_option', 'correct_option_id', 'correct_answer', 'answer_key', 'is_correct');

    IF question_columns IS NOT NULL THEN
      EXECUTE 'CREATE OR REPLACE VIEW public.student_mcq_questions AS
        SELECT ' || question_columns || '
         FROM public.assessment_questions AS question
        JOIN public.assessments AS assessment
          ON assessment.id = question.assessment_id
        WHERE assessment.published IS TRUE
          AND public.dudex_student_in_class(assessment.class_id)';
      EXECUTE 'CREATE OR REPLACE VIEW public.student_assessment_questions AS
         SELECT ' || question_columns || '
         FROM public.assessment_questions AS question
         JOIN public.assessments AS assessment
           ON assessment.id = question.assessment_id
         WHERE assessment.published IS TRUE
           AND public.dudex_student_in_class(assessment.class_id)';
      EXECUTE 'GRANT SELECT ON public.student_mcq_questions TO authenticated';
      EXECUTE 'GRANT SELECT ON public.student_assessment_questions TO authenticated';
      EXECUTE 'REVOKE ALL ON public.student_mcq_questions FROM PUBLIC, anon';
      EXECUTE 'REVOKE ALL ON public.student_assessment_questions FROM PUBLIC, anon';
    END IF;
  END IF;

  IF to_regclass('public.question_options') IS NOT NULL
     AND to_regclass('public.assessment_questions') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'question_options'
         AND column_name = 'question_id'
     ) THEN
    SELECT string_agg(format('option_row.%I', column_name), ', ' ORDER BY ordinal_position)
    INTO option_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'question_options'
      AND column_name NOT IN ('is_correct');

    IF option_columns IS NOT NULL THEN
      EXECUTE 'CREATE OR REPLACE VIEW public.student_question_options AS
        SELECT ' || option_columns || '
        FROM public.question_options AS option_row
         JOIN public.assessment_questions AS question
          ON question.id = option_row.question_id
        JOIN public.assessments AS assessment
          ON assessment.id = question.assessment_id
        WHERE assessment.published IS TRUE
          AND public.dudex_student_in_class(assessment.class_id)';
      EXECUTE 'GRANT SELECT ON public.student_question_options TO authenticated';
      EXECUTE 'REVOKE ALL ON public.student_question_options FROM PUBLIC, anon';
    END IF;
  END IF;
END;
$safe_views$;

DO $storage$
DECLARE
  policy_record record;
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE storage.objects FROM PUBLIC, anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.objects TO authenticated;

    FOR policy_record IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
    LOOP
      EXECUTE format('DROP POLICY %I ON storage.objects', policy_record.policyname);
    END LOOP;

    CREATE POLICY dudex_storage_admin_all
      ON storage.objects FOR ALL TO authenticated
      USING (public.dudex_is_admin())
      WITH CHECK (public.dudex_is_admin());

    CREATE POLICY dudex_avatar_owner_insert
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    CREATE POLICY dudex_avatar_owner_update
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    CREATE POLICY dudex_avatar_owner_delete
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY dudex_note_file_read
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id IN ('notes', 'notes-materials')
        AND EXISTS (
          SELECT 1
          FROM public.note_attachments AS attachment
          JOIN public.notes AS note ON note.id = attachment.note_id
          WHERE attachment.file_url = storage.objects.name
            AND (
              public.dudex_teacher_can_class(note.class_id)
              OR (
                note.is_published IS TRUE
                AND note.archived_at IS NULL
                AND public.dudex_student_in_class(note.class_id)
              )
            )
        )
      );

    CREATE POLICY dudex_note_file_teacher_insert
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id IN ('notes', 'notes-materials')
        AND CASE
          WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN public.dudex_teacher_can_class(((storage.foldername(name))[2])::uuid)
          ELSE false
        END
      );

    CREATE POLICY dudex_note_file_teacher_delete
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id IN ('notes', 'notes-materials')
        AND CASE
          WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN public.dudex_teacher_can_class(((storage.foldername(name))[2])::uuid)
          ELSE false
        END
      );
  END IF;
END;
$storage$;

COMMIT;
