-- =============================================================================
-- Dudex Smart Academy — complete Supabase setup (admin, teacher, student portals)
-- =============================================================================
-- Generated from the live project's database catalog on 2026-10-22, then
-- reordered so it runs on a NEW, empty Supabase project. Contains the schema
-- only (no user or student data).
--
-- What it creates: 52 tables, foreign keys, 52 functions, 7 views, indexes,
-- triggers (incl. on auth.users), row level security + 154 policies, table and
-- function privileges, 9 storage buckets + storage policies, realtime tables,
-- and the single platform_settings row.
--
-- HOW TO RUN
--   1. Create the new project in Supabase.
--   2. Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--      It runs in one transaction: if anything fails, nothing is applied.
--   3. Follow "AFTER RUNNING" at the bottom of this file (first admin account,
--      Edge Function, Auth URLs, SMTP, portal .env files).
-- =============================================================================

BEGIN;

-- Function bodies reference tables/views/other functions defined later in
-- this file; skip body validation while creating them.
SET LOCAL check_function_bodies = off;

-- =============================================================================
-- 1. Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- =============================================================================
-- 2. Enum types
-- =============================================================================

-- (none)

-- =============================================================================
-- 3. Sequences
-- =============================================================================

-- (none)

-- =============================================================================
-- 4. Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  action text NOT NULL,
  module text NOT NULL,
  entity text NOT NULL,
  description text,
  admin_name text DEFAULT 'Admin'::text,
  created_at timestamp with time zone DEFAULT now(),
  actor_id uuid,
  actor_role text,
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.admissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  application_id text,
  full_name text NOT NULL,
  email text,
  phone text,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  previous_institute text,
  percentage_score numeric,
  course_id uuid,
  course_name text,
  batch_id uuid,
  batch_name text,
  status text DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_date timestamp with time zone,
  reviewer_notes text,
  converted_student_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  applicant_name text,
  dob date,
  gender text,
  address text,
  department text,
  qualification text,
  application_date date DEFAULT CURRENT_DATE,
  notes text,
  CONSTRAINT admissions_application_id_key UNIQUE (application_id),
  CONSTRAINT admissions_pkey PRIMARY KEY (id),
  CONSTRAINT admissions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'converted'::text])))
);

CREATE TABLE IF NOT EXISTS public.allowed_emails (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  full_name text,
  status text DEFAULT 'active'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  claimed_at timestamp with time zone,
  claimed_user_id uuid,
  CONSTRAINT allowed_emails_email_key UNIQUE (email),
  CONSTRAINT allowed_emails_pkey PRIMARY KEY (id),
  CONSTRAINT allowed_emails_email_check CHECK ((email = lower(btrim(email)))),
  CONSTRAINT allowed_emails_role_check CHECK ((role = ANY (ARRAY['teacher'::text, 'admin'::text]))),
  CONSTRAINT allowed_emails_status_check CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text])))
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  sender_id uuid,
  sender_name text NOT NULL,
  sender_role text DEFAULT 'Admin'::text,
  title text NOT NULL,
  content text NOT NULL,
  priority text DEFAULT 'Normal'::text,
  target_class text DEFAULT 'All Students'::text,
  date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  target_role text DEFAULT 'student'::text NOT NULL,
  target_class_id uuid,
  expiry_date timestamp with time zone,
  publish_date timestamp with time zone GENERATED ALWAYS AS (date) STORED,
  class_id uuid GENERATED ALWAYS AS (target_class_id) STORED,
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_priority_check CHECK ((priority = ANY (ARRAY['Low'::text, 'Normal'::text, 'High'::text, 'Urgent'::text]))),
  CONSTRAINT announcements_target_role_check CHECK ((target_role = ANY (ARRAY['all'::text, 'student'::text, 'teacher'::text])))
);

CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  assessment_id uuid,
  question_text text NOT NULL,
  question_type text DEFAULT 'mcq'::text,
  code_snippet text,
  marks numeric(5,2) DEFAULT 1.0,
  order_index integer DEFAULT 0,
  explanation text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessment_questions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid,
  title text NOT NULL,
  type text DEFAULT 'MCQ'::text,
  subject text DEFAULT ''::text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 30,
  total_questions integer DEFAULT 10,
  max_marks integer DEFAULT 100,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  attempts_allowed integer DEFAULT 1,
  status text DEFAULT 'Active'::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  pass_percentage integer DEFAULT 40 NOT NULL,
  published boolean DEFAULT false NOT NULL,
  external_url text,
  target_batch text,
  start_time text,
  provider text DEFAULT 'internal'::text NOT NULL,
  code text,
  course_id uuid,
  course_name text,
  subject_name text,
  teacher_id uuid,
  teacher_name text,
  batch_id uuid,
  batch_name text,
  total_marks integer,
  passing_marks integer,
  room text,
  mode text,
  updated_at timestamp with time zone DEFAULT now(),
  duration_seconds integer GENERATED ALWAYS AS ((duration_minutes * 60)) STORED,
  CONSTRAINT assessments_pkey PRIMARY KEY (id),
  CONSTRAINT assessments_provider_check CHECK ((provider = ANY (ARRAY['internal'::text, 'hackerrank'::text, 'external'::text]))),
  CONSTRAINT assessments_status_check CHECK ((lower(status) = ANY (ARRAY['active'::text, 'upcoming'::text, 'completed'::text, 'draft'::text, 'scheduled'::text, 'ongoing'::text, 'cancelled'::text, 'closed'::text, 'archived'::text, 'published'::text]))),
  CONSTRAINT assessments_type_check CHECK ((type = ANY (ARRAY['MCQ'::text, 'Coding'::text, 'Hybrid'::text])))
);

CREATE TABLE IF NOT EXISTS public.attendance_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid NOT NULL,
  subject text,
  code text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  CONSTRAINT attendance_codes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.attendance_correction_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  session_date date NOT NULL,
  subject text NOT NULL,
  current_status text NOT NULL,
  requested_status text NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'Pending'::text,
  reviewed_by uuid,
  submitted_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_correction_requests_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_correction_requests_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text])))
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  class_id uuid,
  teacher_id uuid,
  teacher_name text,
  subject text NOT NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  session_time text DEFAULT '10:00 AM'::text,
  status text NOT NULL,
  mode text DEFAULT 'Online'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_records_status_check CHECK ((status = ANY (ARRAY['Present'::text, 'Absent'::text, 'Late'::text, 'Excused'::text])))
);

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid,
  subject_id uuid,
  batch_id uuid,
  date date DEFAULT CURRENT_DATE NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  status text DEFAULT 'completed'::text NOT NULL,
  conducted_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.batches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  course_id uuid,
  course_name text NOT NULL,
  department text NOT NULL,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  mentor_teacher_id uuid,
  mentor_teacher_name text,
  classroom text,
  capacity integer DEFAULT 60,
  student_count integer DEFAULT 0,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT batches_code_key UNIQUE (code),
  CONSTRAINT batches_pkey PRIMARY KEY (id),
  CONSTRAINT batches_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'upcoming'::text, 'archived'::text])))
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  event_type text DEFAULT 'event'::text,
  start_date date NOT NULL,
  end_date date,
  start_time text,
  end_time text,
  course_name text,
  batch_name text,
  target_role text DEFAULT 'all'::text,
  target_link text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  type text,
  location text,
  CONSTRAINT calendar_events_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_events_target_role_check CHECK ((target_role = ANY (ARRAY['all'::text, 'student'::text, 'teacher'::text])))
);

CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  certificate_number text,
  student_id uuid NOT NULL,
  student_id_code text,
  student_name text,
  course_id uuid,
  course_name text,
  completion_date date,
  issued_date date DEFAULT CURRENT_DATE,
  grade_achieved text,
  signatory_title text,
  issued_by uuid,
  verification_url text,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'issued'::text,
  CONSTRAINT certificates_certificate_number_key UNIQUE (certificate_number),
  CONSTRAINT certificates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.class_memberships (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid NOT NULL,
  student_id uuid NOT NULL,
  enrolled_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_memberships_class_id_student_id_key UNIQUE (class_id, student_id),
  CONSTRAINT class_memberships_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.class_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  subject text,
  session_date date DEFAULT CURRENT_DATE NOT NULL,
  start_time text,
  end_time text,
  mode text DEFAULT 'Online'::text,
  status text DEFAULT 'scheduled'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  department text NOT NULL,
  batch text NOT NULL,
  section text NOT NULL,
  academic_year text NOT NULL,
  teacher_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT classes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  room_number text NOT NULL,
  building text,
  capacity integer DEFAULT 60,
  room_type text DEFAULT 'Lecture Hall'::text,
  current_class text,
  status text DEFAULT 'available'::text,
  created_at timestamp with time zone DEFAULT now(),
  name text,
  floor text,
  facilities text[] DEFAULT '{}'::text[],
  notes text,
  CONSTRAINT classrooms_room_number_key UNIQUE (room_number),
  CONSTRAINT classrooms_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.code_submissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  problem_id uuid NOT NULL,
  assessment_id uuid,
  student_id uuid NOT NULL,
  language text,
  source_code text,
  passed_tests integer DEFAULT 0,
  total_tests integer DEFAULT 0,
  score integer DEFAULT 0,
  status text DEFAULT 'submitted'::text,
  feedback text,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT code_submissions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.coding_problems (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  assessment_id uuid,
  title text NOT NULL,
  description text,
  difficulty text DEFAULT 'Medium'::text,
  language text DEFAULT 'javascript'::text,
  starter_code text,
  test_cases jsonb DEFAULT '[]'::jsonb NOT NULL,
  public_examples jsonb DEFAULT '[]'::jsonb,
  marks integer DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coding_problems_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.colleges (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT colleges_code_key UNIQUE (code),
  CONSTRAINT colleges_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.content_sections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  section_key text NOT NULL,
  title text,
  body jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT content_sections_section_key_key UNIQUE (section_key),
  CONSTRAINT content_sections_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  department text NOT NULL,
  category text DEFAULT 'Core Engineering'::text,
  credits integer DEFAULT 4,
  duration text DEFAULT '4 Years'::text,
  description text,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT courses_code_key UNIQUE (code),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  college_id uuid,
  name text NOT NULL,
  code text NOT NULL,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  student_id_code text,
  student_name text,
  course_id uuid,
  course_name text,
  batch_id uuid,
  batch_name text,
  academic_year text,
  fee_plan text,
  total_fee numeric DEFAULT 0,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  section text,
  CONSTRAINT enrollments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.fee_records (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_id uuid NOT NULL,
  student_id_code text,
  student_name text,
  course_id uuid,
  course_name text,
  batch_name text,
  fee_plan text,
  invoice_number text,
  total_amount numeric DEFAULT 0 NOT NULL,
  paid_amount numeric DEFAULT 0 NOT NULL,
  remaining_amount numeric GENERATED ALWAYS AS ((total_amount - paid_amount)) STORED,
  due_date date,
  last_payment_date date,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fee_records_invoice_number_key UNIQUE (invoice_number),
  CONSTRAINT fee_records_pkey PRIMARY KEY (id),
  CONSTRAINT fee_records_status_check CHECK ((status = ANY (ARRAY['paid'::text, 'pending'::text, 'overdue'::text, 'partial'::text])))
);

CREATE TABLE IF NOT EXISTS public.live_classes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid,
  title text NOT NULL,
  teacher_id uuid NOT NULL,
  teacher_name text NOT NULL,
  teacher_title text,
  subject text NOT NULL,
  topic text NOT NULL,
  date date NOT NULL,
  scheduled_date date,
  start_time text NOT NULL,
  end_time text NOT NULL,
  platform text DEFAULT 'Google Meet'::text,
  meeting_url text NOT NULL,
  status text DEFAULT 'Upcoming'::text,
  mode text DEFAULT 'Online'::text,
  is_hero boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT live_classes_pkey PRIMARY KEY (id),
  CONSTRAINT live_classes_status_check CHECK ((status = ANY (ARRAY['Upcoming'::text, 'Live Now'::text, 'Ended'::text, 'Completed'::text, 'Cancelled'::text])))
);

CREATE TABLE IF NOT EXISTS public.mcq_questions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  assessment_id uuid NOT NULL,
  question text NOT NULL,
  code_snippet text,
  options jsonb NOT NULL,
  correct_option integer NOT NULL,
  marks integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mcq_questions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.note_attachments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  note_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT note_attachments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid,
  teacher_id uuid NOT NULL,
  teacher_name text NOT NULL,
  title text NOT NULL,
  subject text NOT NULL,
  description text,
  date date DEFAULT CURRENT_DATE,
  formatted_date text,
  pdf_url text,
  pdf_name text,
  read_time text DEFAULT '5 min read'::text,
  tags text[] DEFAULT '{}'::text[],
  images text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'announcement'::text,
  read boolean DEFAULT false,
  action_url text,
  "timestamp" timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  audience text,
  batch_name text,
  course_name text,
  priority text DEFAULT 'Normal'::text,
  section text,
  status text DEFAULT 'Sent'::text,
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  fee_record_id uuid NOT NULL,
  student_id uuid,
  amount numeric NOT NULL,
  payment_method text,
  transaction_reference text,
  receipt_number text,
  collected_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  payment_date date DEFAULT CURRENT_DATE,
  remarks text,
  status text DEFAULT 'successful'::text,
  CONSTRAINT payment_transactions_receipt_number_key UNIQUE (receipt_number),
  CONSTRAINT payment_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id integer DEFAULT 1 NOT NULL,
  platform_name text DEFAULT 'Dudex Smart Academy'::text,
  support_email text,
  contact_phone text,
  academic_year text,
  current_semester text,
  date_format text DEFAULT 'DD/MM/YYYY'::text,
  time_format text DEFAULT '12h'::text,
  grading_system jsonb DEFAULT '{}'::jsonb,
  default_passing_mark_pct integer DEFAULT 40,
  default_exam_duration_mins integer DEFAULT 60,
  default_class_duration integer DEFAULT 60,
  default_course_duration text DEFAULT '4 Years'::text,
  attendance_min_threshold integer DEFAULT 75,
  attendance_alert_threshold_days integer DEFAULT 3,
  late_threshold_mins integer DEFAULT 10,
  correction_window_days integer DEFAULT 7,
  default_attendance_status text DEFAULT 'Present'::text,
  auto_approve_leave_days integer DEFAULT 0,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  attendance_alerts_enabled boolean DEFAULT true,
  assessment_alerts_enabled boolean DEFAULT true,
  result_alerts_enabled boolean DEFAULT true,
  system_alerts_enabled boolean DEFAULT true,
  student_notifications_enabled boolean DEFAULT true,
  teacher_notifications_enabled boolean DEFAULT true,
  sidebar_default_collapsed boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT platform_settings_pkey PRIMARY KEY (id),
  CONSTRAINT platform_settings_id_check CHECK ((id = 1))
);

CREATE TABLE IF NOT EXISTS public.portal_features (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  portal text NOT NULL,
  feature_key text NOT NULL,
  label text,
  enabled boolean DEFAULT true,
  can_view boolean DEFAULT true,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_export boolean DEFAULT false,
  can_download boolean DEFAULT true,
  can_submit boolean DEFAULT false,
  can_publish boolean DEFAULT false,
  category text,
  visible boolean DEFAULT true,
  key text GENERATED ALWAYS AS (feature_key) STORED,
  CONSTRAINT portal_features_portal_feature_key_key UNIQUE (portal, feature_key),
  CONSTRAINT portal_features_pkey PRIMARY KEY (id),
  CONSTRAINT portal_features_portal_check CHECK ((portal = ANY (ARRAY['student'::text, 'teacher'::text])))
);

CREATE TABLE IF NOT EXISTS public.portal_navigation (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  portal text NOT NULL,
  label text NOT NULL,
  route text NOT NULL,
  icon_name text,
  display_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  CONSTRAINT portal_navigation_portal_route_key UNIQUE (portal, route),
  CONSTRAINT portal_navigation_pkey PRIMARY KEY (id),
  CONSTRAINT portal_navigation_portal_check CHECK ((portal = ANY (ARRAY['student'::text, 'teacher'::text])))
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role text DEFAULT 'student'::text NOT NULL,
  student_id text,
  teacher_id text,
  phone text,
  avatar_url text,
  department text,
  two_factor_enabled boolean DEFAULT false,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true NOT NULL,
  CONSTRAINT profiles_email_key UNIQUE (email),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'teacher'::text, 'student'::text])))
);

CREATE TABLE IF NOT EXISTS public.question_options (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  question_id uuid,
  option_label text NOT NULL,
  option_text text NOT NULL,
  is_correct boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT question_options_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.results (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  assessment_id uuid,
  student_id uuid NOT NULL,
  assessment_title text NOT NULL,
  type text DEFAULT 'MCQ'::text,
  subject text DEFAULT ''::text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  score integer DEFAULT 0 NOT NULL,
  max_score integer DEFAULT 100 NOT NULL,
  percentage numeric(5,2) DEFAULT 0 NOT NULL,
  grade text DEFAULT 'F'::text NOT NULL,
  status text DEFAULT 'Passed'::text,
  correct_count integer DEFAULT 0,
  wrong_count integer DEFAULT 0,
  unanswered_count integer DEFAULT 0,
  time_used text,
  feedback text,
  created_at timestamp with time zone DEFAULT now(),
  attempt_id uuid,
  student_name text,
  student_id_code text,
  course_id uuid,
  course_name text,
  batch_name text,
  subject_name text,
  marks_obtained numeric,
  max_marks numeric,
  result_status text,
  evaluator_teacher_id uuid,
  evaluator_teacher_name text,
  CONSTRAINT results_pkey PRIMARY KEY (id),
  CONSTRAINT results_status_check CHECK ((status = ANY (ARRAY['Passed'::text, 'Failed'::text])))
);

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  role_permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
  users_count integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  role_name text GENERATED ALWAYS AS (name) STORED,
  CONSTRAINT roles_name_key UNIQUE (name),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.slide_banners (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text,
  subtitle text,
  image_url text,
  cta_text text,
  cta_route text,
  display_order integer DEFAULT 0,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  target_role text DEFAULT 'student'::text,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Active'::text,
  audience text DEFAULT 'All Users'::text,
  CONSTRAINT slide_banners_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.specializations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  department_id uuid,
  name text NOT NULL,
  code text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT specializations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.storage_files (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  file_name text NOT NULL,
  file_type text,
  bucket text,
  path text,
  size_bytes bigint,
  size_formatted text,
  owner_id uuid,
  owner_name text,
  related_entity text,
  download_url text,
  created_at timestamp with time zone DEFAULT now(),
  name text,
  status text DEFAULT 'Active'::text,
  CONSTRAINT storage_files_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.student_attempts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  assessment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  answers jsonb NOT NULL,
  score integer NOT NULL,
  max_score integer NOT NULL,
  percentage numeric(5,2) NOT NULL,
  time_used_seconds integer NOT NULL,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_attempts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.student_email_roster (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  college_id uuid NOT NULL,
  college_name text NOT NULL,
  email text NOT NULL,
  student_name text,
  student_id text,
  department text,
  source_file_name text,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT student_email_roster_pkey PRIMARY KEY (id),
  CONSTRAINT student_email_roster_email_normalized CHECK ((email = lower(btrim(email)))),
  CONSTRAINT student_email_roster_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);

CREATE TABLE IF NOT EXISTS public.student_profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  phone text,
  dob date,
  gender text,
  address text,
  department text NOT NULL,
  course_id uuid,
  course_name text NOT NULL,
  batch_id uuid,
  batch_name text NOT NULL,
  section text NOT NULL,
  academic_year text NOT NULL,
  admission_date date DEFAULT CURRENT_DATE,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  guardian_relation text DEFAULT 'Parent / Guardian'::text,
  emergency_contact text,
  status text DEFAULT 'active'::text,
  fee_status text DEFAULT 'pending'::text,
  attendance_percentage numeric(5,2) DEFAULT 100.00,
  average_score numeric(5,2) DEFAULT 0.00,
  skills text[] DEFAULT '{}'::text[],
  career_interests text,
  notes text,
  register_number text,
  specialization text,
  updated_at timestamp with time zone DEFAULT now(),
  alternate_phone text,
  github_url text,
  linkedin_url text,
  portfolio_url text,
  roll_number text,
  admission_number text,
  college_name text DEFAULT 'Dudex Smart Academy'::text,
  CONSTRAINT student_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT student_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT student_profiles_fee_status_check CHECK ((fee_status = ANY (ARRAY['paid'::text, 'pending'::text, 'overdue'::text, 'partial'::text]))),
  CONSTRAINT student_profiles_gender_check CHECK ((gender = ANY (ARRAY['Male'::text, 'Female'::text, 'Other'::text]))),
  CONSTRAINT student_profiles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'graduated'::text, 'pending'::text])))
);

CREATE TABLE IF NOT EXISTS public.student_queries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  query_code text,
  student_id uuid NOT NULL,
  student_name text,
  student_email text,
  student_phone text,
  student_avatar text,
  batch_name text,
  subject_name text,
  subject text,
  message text,
  attachment_url text,
  assigned_faculty uuid,
  admin_response text,
  status text DEFAULT 'open'::text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  category text,
  description text,
  CONSTRAINT student_queries_query_code_key UNIQUE (query_code),
  CONSTRAINT student_queries_pkey PRIMARY KEY (id),
  CONSTRAINT student_queries_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  department text NOT NULL,
  course_id uuid,
  credits integer DEFAULT 3,
  semester text DEFAULT 'Semester 1'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subjects_code_key UNIQUE (code),
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.teacher_applications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  application_number text,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  requested_subject text,
  experience_years integer DEFAULT 0,
  cover_letter text,
  resume_url text,
  portfolio_url text,
  status text DEFAULT 'pending'::text,
  reviewed_date timestamp with time zone,
  reviewer_notes text,
  converted_teacher_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  address text,
  department text,
  dob date,
  gender text,
  qualification text,
  skills text[] DEFAULT '{}'::text[],
  CONSTRAINT teacher_applications_application_number_key UNIQUE (application_number),
  CONSTRAINT teacher_applications_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'converted'::text])))
);

CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  subject text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_assignments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.teacher_attendance (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid NOT NULL,
  teacher_name text,
  faculty_id text,
  date date DEFAULT CURRENT_DATE NOT NULL,
  check_in_time text,
  check_out_time text,
  duration_minutes integer,
  status text DEFAULT 'present'::text,
  recorded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  remarks text,
  check_in text,
  check_out text,
  CONSTRAINT teacher_attendance_teacher_id_date_key UNIQUE (teacher_id, date),
  CONSTRAINT teacher_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'on_leave'::text, 'half_day'::text])))
);

CREATE TABLE IF NOT EXISTS public.teacher_leave (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid NOT NULL,
  teacher_name text,
  leave_type text DEFAULT 'Casual'::text NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  total_days integer,
  reason text,
  status text DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_date timestamp with time zone,
  review_remarks text,
  created_at timestamp with time zone DEFAULT now(),
  start_date date,
  end_date date,
  CONSTRAINT teacher_leave_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_leave_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])))
);

CREATE TABLE IF NOT EXISTS public.teacher_leave_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid,
  teacher_name text NOT NULL,
  department text,
  leave_type text NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  total_days numeric(4,1) NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  review_remarks text,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  submitted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_leave_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  phone text,
  dob date,
  gender text,
  address text,
  department text NOT NULL,
  designation text NOT NULL,
  qualification text,
  experience_years integer DEFAULT 0,
  joining_date date DEFAULT CURRENT_DATE,
  employment_type text DEFAULT 'full-time'::text,
  primary_subject text,
  skills text[] DEFAULT '{}'::text[],
  bio text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  notes text,
  status text DEFAULT 'active'::text,
  assigned_course_ids text[] DEFAULT '{}'::text[],
  assigned_class_ids text[] DEFAULT '{}'::text[],
  total_students_handled integer DEFAULT 0,
  attendance_rate numeric(5,2) DEFAULT 100.00,
  rating numeric(3,2) DEFAULT 5.00,
  updated_at timestamp with time zone DEFAULT now(),
  faculty_id text,
  CONSTRAINT teacher_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT teacher_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_profiles_employment_type_check CHECK ((employment_type = ANY (ARRAY['full-time'::text, 'part-time'::text, 'contract'::text]))),
  CONSTRAINT teacher_profiles_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))),
  CONSTRAINT teacher_profiles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'on-leave'::text, 'suspended'::text])))
);

-- =============================================================================
-- 5. Foreign keys
-- =============================================================================

DO $f$ BEGIN ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.admissions ADD CONSTRAINT admissions_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.admissions ADD CONSTRAINT admissions_converted_student_id_fkey FOREIGN KEY (converted_student_id) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.admissions ADD CONSTRAINT admissions_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.admissions ADD CONSTRAINT admissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.allowed_emails ADD CONSTRAINT allowed_emails_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.announcements ADD CONSTRAINT announcements_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.announcements ADD CONSTRAINT announcements_target_class_id_fkey FOREIGN KEY (target_class_id) REFERENCES classes(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.assessment_questions ADD CONSTRAINT assessment_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.assessments ADD CONSTRAINT assessments_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.assessments ADD CONSTRAINT assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.assessments ADD CONSTRAINT assessments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.attendance_codes ADD CONSTRAINT attendance_codes_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.attendance_codes ADD CONSTRAINT attendance_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.attendance_correction_requests ADD CONSTRAINT attendance_correction_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.attendance_correction_requests ADD CONSTRAINT attendance_correction_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.attendance_sessions ADD CONSTRAINT attendance_sessions_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.attendance_sessions ADD CONSTRAINT attendance_sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.attendance_sessions ADD CONSTRAINT attendance_sessions_conducted_by_fkey FOREIGN KEY (conducted_by) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.batches ADD CONSTRAINT batches_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.batches ADD CONSTRAINT batches_mentor_teacher_id_fkey FOREIGN KEY (mentor_teacher_id) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.certificates ADD CONSTRAINT certificates_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.certificates ADD CONSTRAINT certificates_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.certificates ADD CONSTRAINT certificates_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.class_memberships ADD CONSTRAINT class_memberships_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.class_memberships ADD CONSTRAINT class_memberships_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.class_sessions ADD CONSTRAINT class_sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.class_sessions ADD CONSTRAINT class_sessions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.classes ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.code_submissions ADD CONSTRAINT code_submissions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.code_submissions ADD CONSTRAINT code_submissions_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.code_submissions ADD CONSTRAINT code_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.coding_problems ADD CONSTRAINT coding_problems_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.departments ADD CONSTRAINT departments_college_id_fkey FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.fee_records ADD CONSTRAINT fee_records_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.fee_records ADD CONSTRAINT fee_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.live_classes ADD CONSTRAINT live_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.live_classes ADD CONSTRAINT live_classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.mcq_questions ADD CONSTRAINT mcq_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.note_attachments ADD CONSTRAINT note_attachments_note_id_fkey FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.notes ADD CONSTRAINT notes_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.notes ADD CONSTRAINT notes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.notifications ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_collected_by_fkey FOREIGN KEY (collected_by) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_fee_record_id_fkey FOREIGN KEY (fee_record_id) REFERENCES fee_records(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.question_options ADD CONSTRAINT question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.results ADD CONSTRAINT results_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.results ADD CONSTRAINT results_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES student_attempts(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.results ADD CONSTRAINT results_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.specializations ADD CONSTRAINT specializations_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.storage_files ADD CONSTRAINT storage_files_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.student_attempts ADD CONSTRAINT student_attempts_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.student_attempts ADD CONSTRAINT student_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.student_email_roster ADD CONSTRAINT student_email_roster_college_id_fkey FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.student_profiles ADD CONSTRAINT student_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.student_queries ADD CONSTRAINT student_queries_assigned_faculty_fkey FOREIGN KEY (assigned_faculty) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.student_queries ADD CONSTRAINT student_queries_student_id_fkey FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.subjects ADD CONSTRAINT subjects_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.teacher_applications ADD CONSTRAINT teacher_applications_converted_teacher_id_fkey FOREIGN KEY (converted_teacher_id) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.teacher_assignments ADD CONSTRAINT teacher_assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.teacher_assignments ADD CONSTRAINT teacher_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.teacher_attendance ADD CONSTRAINT teacher_attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.teacher_attendance ADD CONSTRAINT teacher_attendance_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.teacher_leave ADD CONSTRAINT teacher_leave_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.teacher_leave ADD CONSTRAINT teacher_leave_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.teacher_leave_requests ADD CONSTRAINT teacher_leave_requests_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;
DO $f$ BEGIN ALTER TABLE public.teacher_profiles ADD CONSTRAINT teacher_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $f$;

-- =============================================================================
-- 6. Functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_dashboard_counts()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when public.is_admin() then jsonb_build_object(
    'students',  (select count(*) from public.profiles where role='student' and is_active),
    'teachers',  (select count(*) from public.profiles where role='teacher' and is_active),
    'classes',   (select count(*) from public.classes),
    'courses',   (select count(*) from public.courses where status='active'),
    'batches',   (select count(*) from public.batches where status='active'),
    'pending_admissions', (select count(*) from public.admissions where status='pending'),
    'open_queries',       (select count(*) from public.student_queries where status in ('open','in_progress')),
    'pending_leaves',     (select count(*) from public.teacher_leave where status='pending'),
    'fees_pending_amount',(select coalesce(sum(remaining_amount),0) from public.fee_records where status <> 'paid')
  ) else null end;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare f public.fee_records;
begin
  update public.fee_records
     set paid_amount = paid_amount + new.amount,
         last_payment_date = current_date,
         status = case when paid_amount + new.amount >= total_amount then 'paid' else 'partial' end
   where id = new.fee_record_id
   returning * into f;
  update public.student_profiles set fee_status = f.status where user_id = f.student_id;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.assessment_owned_by_me(aid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.assessments a
                 where a.id = aid and (a.created_by = auth.uid() or a.teacher_id = auth.uid()))
$function$
;

CREATE OR REPLACE FUNCTION public.banner_compat_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op='UPDATE' and new.is_active is distinct from old.is_active and new.status is not distinct from old.status then
    new.status := case when new.is_active then 'Active' else 'Inactive' end;
  else
    new.is_active := coalesce(new.status,'Active') = 'Active';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.calendar_compat_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op='UPDATE' and new.type is distinct from old.type then new.event_type := new.type; end if;
  new.type := coalesce(new.type, new.event_type); new.event_type := coalesce(new.event_type, new.type);
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.complete_my_student_registration(p_full_name text, p_phone text, p_register_number text, p_course text, p_specialization text, p_batch_name text, p_section text, p_academic_year text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  roster_record public.student_email_roster%ROWTYPE;
  student_user_id uuid := auth.uid();
BEGIN
  IF student_user_id IS NULL THEN
    RAISE EXCEPTION 'A signed-in student account is required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = student_user_id
      AND profile.role = 'student'
  ) THEN
    RAISE EXCEPTION 'Student access is required'
      USING ERRCODE = '42501';
  END IF;

  SELECT roster.*
  INTO roster_record
  FROM auth.users AS auth_user
  JOIN public.student_email_roster AS roster
    ON lower(roster.email) = lower(auth_user.email)
   AND roster.status = 'active'
  WHERE auth_user.id = student_user_id
    AND auth_user.email_confirmed_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'An active, verified student roster entry is required'
      USING ERRCODE = '42501';
  END IF;

  IF nullif(btrim(p_full_name), '') IS NULL
     OR nullif(btrim(p_phone), '') IS NULL
     OR nullif(btrim(p_register_number), '') IS NULL
     OR nullif(btrim(p_course), '') IS NULL
     OR nullif(btrim(p_specialization), '') IS NULL
     OR nullif(btrim(p_batch_name), '') IS NULL
     OR nullif(btrim(p_section), '') IS NULL
     OR nullif(btrim(p_academic_year), '') IS NULL THEN
    RAISE EXCEPTION 'All registration and academic fields are required'
      USING ERRCODE = '22023';
  END IF;

  

  IF nullif(btrim(roster_record.student_id), '') IS NOT NULL
     AND lower(btrim(roster_record.student_id)) <> lower(btrim(p_register_number)) THEN
    RAISE EXCEPTION 'The register number does not match the active roster entry'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET full_name = btrim(p_full_name),
      phone = nullif(btrim(p_phone), '')
  WHERE id = student_user_id;

  INSERT INTO public.student_profiles (
    user_id,
    department,
    course_name,
    batch_name,
    section,
    academic_year,
    roll_number,
    status,
    updated_at
  )
  VALUES (
    student_user_id,
    coalesce(nullif(btrim(roster_record.department), ''), btrim(p_specialization)),
    btrim(p_course) || ' - ' || btrim(p_specialization),
    btrim(p_batch_name),
    btrim(p_section),
    btrim(p_academic_year),
    COALESCE(nullif(btrim(roster_record.student_id), ''), btrim(p_register_number)),
    'active',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET department = EXCLUDED.department,
        course_name = EXCLUDED.course_name,
        batch_name = EXCLUDED.batch_name,
        section = EXCLUDED.section,
        academic_year = EXCLUDED.academic_year,
        roll_number = COALESCE(EXCLUDED.roll_number, student_profiles.roll_number),
        updated_at = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_role_name()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from public.profiles where id = auth.uid() and is_active
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.dudex_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.dudex_teaches_class(p_class_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
           SELECT 1 FROM public.profiles
           WHERE id = auth.uid() AND role = 'teacher'
         )
     AND (
           EXISTS (
             SELECT 1 FROM public.teacher_assignments
             WHERE teacher_id = auth.uid() AND class_id = p_class_id
           )
           OR EXISTS (
             SELECT 1 FROM public.classes
             WHERE id = p_class_id AND teacher_id = auth.uid()
           )
         );
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_signup_allowlist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.email is null or not (
       exists (select 1 from public.student_email_roster r where lower(r.email) = lower(new.email) and r.status = 'active')
    or exists (select 1 from public.allowed_emails a       where lower(a.email) = lower(new.email) and a.status = 'active')
  ) then
    raise exception 'EMAIL_NOT_REGISTERED: this e-mail has not been registered by the administration';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.get_class_attendance_summary(p_class_id uuid)
 RETURNS TABLE(class_id uuid, total_sessions bigint, enrolled_students bigint, average_percentage numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p_class_id,
         (select count(distinct (date, subject, session_time)) from public.attendance_records where class_id = p_class_id),
         (select count(*) from public.class_memberships where class_id = p_class_id),
         coalesce((select round(100.0 * count(*) filter (where status in ('Present','Late','Excused')) / nullif(count(*),0), 2)
                   from public.attendance_records where class_id = p_class_id), 0)
  where public.is_admin() or public.teaches_class(p_class_id);
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from public.profiles where id = auth.uid();
$function$
;

-- Return type changed in migration 053; drop so a re-run does not fail.
DROP FUNCTION IF EXISTS public.get_my_student_roster_profile();
CREATE OR REPLACE FUNCTION public.get_my_student_roster_profile()
 RETURNS TABLE(full_name text, college_name text, student_id text, department text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
  SELECT
    COALESCE(roster.student_name, profile.full_name),
    roster.college_name,
    roster.student_id,
    roster.department
  FROM auth.users AS auth_user
  JOIN public.profiles AS profile
    ON profile.id = auth_user.id
   AND profile.role = 'student'
  JOIN public.student_email_roster AS roster
    ON lower(roster.email) = lower(auth_user.email)
   AND roster.status = 'active'
  WHERE auth_user.id = auth.uid()
    AND auth_user.email_confirmed_at IS NOT NULL
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_student_attendance_summary(p_student_id uuid)
 RETURNS TABLE(total_sessions bigint, present_count bigint, absent_count bigint, late_count bigint, excused_count bigint, percentage numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*),
         count(*) filter (where status = 'Present'), count(*) filter (where status = 'Absent'),
         count(*) filter (where status = 'Late'),    count(*) filter (where status = 'Excused'),
         coalesce(round(100.0 * count(*) filter (where status in ('Present','Late','Excused')) / nullif(count(*),0), 2), 0)
  from public.attendance_records
  where student_id = p_student_id
    and (p_student_id = auth.uid() or public.is_admin() or public.teaches_student(p_student_id));
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.guard_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if current_user <> 'authenticated' or auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if (to_jsonb(new) - tg_argv) is distinct from (to_jsonb(old) - tg_argv) then
    raise exception 'Not allowed to change protected columns on %', tg_table_name
      using errcode = '42501';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_profile_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Trusted SQL/backend operations without an end-user JWT may proceed.
  IF (SELECT auth.uid()) IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
       OR NEW.department IS DISTINCT FROM OLD.department
       OR NEW.two_factor_enabled IS DISTINCT FROM OLD.two_factor_enabled
       OR NEW.last_login IS DISTINCT FROM OLD.last_login
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Only an active administrator or trusted backend may modify protected profile fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_result_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.score is distinct from old.score
    or new.max_score is distinct from old.max_score
    or new.percentage is distinct from old.percentage
    or new.grade is distinct from old.grade
    or new.status is distinct from old.status
    or new.student_id is distinct from old.student_id
    or new.assessment_id is distinct from old.assessment_id then
      raise exception 'Only feedback can be edited on a result';
    end if;
  end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.guard_student_profile_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Admins / SQL editor / service role pass. Nested trigger updates (depth > 1, e.g. the
  -- attendance/average refresh triggers) pass. A student's direct PATCH (depth = 1) is checked.
  if auth.uid() is null or public.is_admin() or pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.fee_status            is distinct from old.fee_status
  or new.status                is distinct from old.status
  or new.course_id             is distinct from old.course_id
  or new.batch_id              is distinct from old.batch_id
  or new.register_number       is distinct from old.register_number
  or new.attendance_percentage is distinct from old.attendance_percentage
  or new.average_score         is distinct from old.average_score then
    raise exception 'These fields can only be changed by an administrator';
  end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'Student'
    ),
    'student',
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'phone'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'avatar_url'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'Student'
    ),
    'student',
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'phone'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'avatar_url'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.in_class(p_class_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.is_student() AND EXISTS (
    SELECT 1 FROM public.class_memberships cm
    WHERE cm.class_id = p_class_id AND cm.student_id = (SELECT auth.uid())
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select role = 'admin' and is_active from public.profiles where id = auth.uid()), false)
$function$
;

CREATE OR REPLACE FUNCTION public.is_email_allowed(p_email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.student_email_roster where lower(email) = lower(trim(p_email)) and status = 'active')
      or exists (select 1 from public.allowed_emails       where lower(email) = lower(trim(p_email)) and status = 'active')
$function$
;

CREATE OR REPLACE FUNCTION public.is_student()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select role = 'student' and is_active from public.profiles where id = auth.uid()), false)
$function$
;

CREATE OR REPLACE FUNCTION public.is_teacher()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select role = 'teacher' and is_active from public.profiles where id = auth.uid()), false)
$function$
;

CREATE OR REPLACE FUNCTION public.leave_compat_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op='UPDATE' then
    if new.start_date is distinct from old.start_date then new.from_date := new.start_date; end if;
    if new.end_date   is distinct from old.end_date   then new.to_date   := new.end_date;   end if;
  end if;
  new.from_date := coalesce(new.from_date, new.start_date); new.to_date := coalesce(new.to_date, new.end_date);
  new.start_date := new.from_date; new.end_date := new.to_date;
  new.total_days := coalesce(new.total_days, (new.to_date - new.from_date) + 1);
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.mark_attendance_with_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  code_row public.attendance_codes%ROWTYPE;
  existing_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A signed-in student is required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Student access is required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO code_row
  FROM public.attendance_codes
  WHERE code = upper(btrim(p_code))
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired attendance code' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.class_memberships
    WHERE class_id = code_row.class_id AND student_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not enrolled in this class' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO existing_id
  FROM public.attendance_records
  WHERE student_id = auth.uid()
    AND class_id = code_row.class_id
    AND date = current_date
    AND subject = coalesce(code_row.subject, 'General')
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_marked', 'record_id', existing_id);
  END IF;

  INSERT INTO public.attendance_records (
    student_id, class_id, teacher_id, date, session_time, mode, subject, status
  )
  VALUES (
    auth.uid(), code_row.class_id, code_row.created_by, current_date,
    'Code check-in', 'offline', coalesce(code_row.subject, 'General'), 'Present'
  )
  RETURNING id INTO existing_id;

  RETURN jsonb_build_object('status', 'marked', 'record_id', existing_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_all(p_audience text, p_title text, p_message text, p_type text DEFAULT 'announcement'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  insert into public.notifications (user_id, title, message, type, created_by)
  select p.id, p_title, p_message, p_type, auth.uid()
  from public.profiles p
  where p.is_active and (p_audience = 'all' or p.role = p_audience) and p.role <> 'admin';
  get diagnostics n = row_count;
  return n;
end; $function$
;

CREATE OR REPLACE FUNCTION public.notify_class(p_class_id uuid, p_title text, p_message text, p_type text DEFAULT 'announcement'::text, p_action_url text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  if not (public.is_admin() or public.teaches_class(p_class_id)) then
    raise exception 'Not allowed to notify this class';
  end if;
  insert into public.notifications (user_id, title, message, type, action_url, created_by)
  select m.student_id, p_title, p_message, p_type, p_action_url, auth.uid()
  from public.class_memberships m where m.class_id = p_class_id;
  get diagnostics n = row_count;
  return n;
end; $function$
;

CREATE OR REPLACE FUNCTION public.provision_teacher_account(target_email text, target_full_name text, target_faculty_id text, target_department_id uuid, target_designation text, target_phone text DEFAULT NULL::text, target_qualification text DEFAULT NULL::text, target_avatar_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  account_id uuid;
  account_role text;
  teacher_profile_id uuid;
  department_name text;
  normalized_faculty_id text;
BEGIN
  IF NOT public.dudex_is_admin() THEN
    RAISE EXCEPTION 'Administrator access is required'
      USING ERRCODE = '42501';
  END IF;

  IF nullif(btrim(target_email), '') IS NULL
     OR nullif(btrim(target_full_name), '') IS NULL
     OR nullif(btrim(target_designation), '') IS NULL
     OR target_department_id IS NULL THEN
    RAISE EXCEPTION 'Email, full name, designation, and department are required'
      USING ERRCODE = '22023';
  END IF;

  normalized_faculty_id := nullif(btrim(target_faculty_id), '');

  SELECT department.name
  INTO department_name
  FROM public.departments AS department
  WHERE department.id = target_department_id;

  IF department_name IS NULL THEN
    RAISE EXCEPTION 'The selected department does not exist'
      USING ERRCODE = '22023';
  END IF;

  SELECT profile.id, profile.role
  INTO account_id, account_role
  FROM public.profiles AS profile
  WHERE lower(profile.email) = lower(btrim(target_email))
  FOR UPDATE;

  IF account_id IS NULL THEN
    RAISE EXCEPTION 'Create the Auth account before assigning a teacher role'
      USING ERRCODE = 'P0002';
  END IF;

  IF account_role = 'admin' THEN
    RAISE EXCEPTION 'An administrator account cannot be provisioned as a teacher'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET role = 'teacher',
      full_name = btrim(target_full_name),
      phone = nullif(btrim(target_phone), ''),
      avatar_url = nullif(btrim(target_avatar_url), '')
  WHERE id = account_id;

  INSERT INTO public.teacher_profiles (
    user_id,
    faculty_id,
    department,
    designation,
    qualification,
    status
  )
  VALUES (
    account_id,
    normalized_faculty_id,
    department_name,
    btrim(target_designation),
    nullif(btrim(target_qualification), ''),
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET faculty_id = EXCLUDED.faculty_id,
        department = EXCLUDED.department,
        designation = EXCLUDED.designation,
        qualification = EXCLUDED.qualification
  RETURNING id INTO teacher_profile_id;

  RETURN teacher_profile_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.query_compat_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.description := coalesce(new.description, new.message); new.message := coalesce(new.message, new.description); return new; end $function$
;

CREATE OR REPLACE FUNCTION public.refresh_batch_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare ids uuid[] := '{}';
begin
  if tg_op in ('INSERT','UPDATE') and new.batch_id is not null then ids := ids || new.batch_id; end if;
  if tg_op in ('UPDATE','DELETE') and old.batch_id is not null then ids := ids || old.batch_id; end if;
  update public.batches b set student_count =
    (select count(*) from public.student_profiles sp where sp.batch_id = b.id and sp.status <> 'suspended')
  where b.id = any(ids);
  return null;
end; $function$
;

CREATE OR REPLACE FUNCTION public.refresh_batch_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Needs a WHERE clause: pg_safeupdate rejects WHERE-less updates from the API
  -- (migration 055).
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
end $function$
;

CREATE OR REPLACE FUNCTION public.refresh_student_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare sid uuid;
begin
  sid := case when tg_op = 'DELETE' then old.student_id else new.student_id end;
  update public.student_profiles sp
     set attendance_percentage = coalesce((
           select round(100.0 * count(*) filter (where status in ('Present','Late','Excused')) / nullif(count(*),0), 2)
           from public.attendance_records where student_id = sid), 100)
   where sp.user_id = sid;
  return null;
end; $function$
;

CREATE OR REPLACE FUNCTION public.refresh_student_average()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare sid uuid;
begin
  sid := case when tg_op = 'DELETE' then old.student_id else new.student_id end;
  update public.student_profiles sp
     set average_score = coalesce((select round(avg(percentage),2) from public.results where student_id = sid), 0)
   where sp.user_id = sid;
  return null;
end; $function$
;

CREATE OR REPLACE FUNCTION public.results_compat_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.result_status is not null and (tg_op = 'INSERT' or new.result_status is distinct from old.result_status) then
    new.status := case when lower(new.result_status) in ('pass','passed') then 'Passed' else 'Failed' end;
  end if;
  new.result_status := lower(case when new.status = 'Passed' then 'pass' else 'fail' end);
  new.score          := coalesce(new.marks_obtained, new.score, 0);
  new.max_score      := coalesce(new.max_marks, new.max_score, 100);
  new.marks_obtained := new.score;
  new.max_marks      := new.max_score;
  new.subject        := coalesce(nullif(new.subject,''), new.subject_name, '');
  new.subject_name   := coalesce(new.subject_name, nullif(new.subject,''));
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end; $function$
;

CREATE OR REPLACE FUNCTION public.start_attendance_code_session(p_class_id uuid, p_subject text DEFAULT NULL::text, p_valid_minutes integer DEFAULT 10)
 RETURNS TABLE(code_id uuid, code text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  new_id uuid;
  new_expiry timestamptz;
  attempts integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A signed-in teacher is required' USING ERRCODE = '42501';
  END IF;

  IF NOT (public.dudex_teaches_class(p_class_id) OR public.dudex_is_admin()) THEN
    RAISE EXCEPTION 'You are not assigned to this class' USING ERRCODE = '42501';
  END IF;

  IF p_valid_minutes IS NULL OR p_valid_minutes < 1 OR p_valid_minutes > 180 THEN
    RAISE EXCEPTION 'Code validity must be between 1 and 180 minutes' USING ERRCODE = '22023';
  END IF;

  UPDATE public.attendance_codes AS ac
  SET expires_at = now()
  WHERE ac.class_id = p_class_id
    AND ac.created_by = auth.uid()
    AND ac.expires_at > now();

  LOOP
    attempts := attempts + 1;
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.attendance_codes AS ac
      WHERE ac.code = new_code AND ac.expires_at > now()
    );
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not allocate a unique attendance code';
    END IF;
  END LOOP;

  new_expiry := now() + make_interval(mins => p_valid_minutes);

  INSERT INTO public.attendance_codes (class_id, subject, code, created_by, expires_at)
  VALUES (p_class_id, nullif(btrim(p_subject), ''), new_code, auth.uid(), new_expiry)
  RETURNING id INTO new_id;

  RETURN QUERY SELECT new_id, new_code, new_expiry;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.stop_attendance_code_session(p_code_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.attendance_codes
  SET expires_at = now()
  WHERE id = p_code_id
    AND (created_by = auth.uid() OR public.dudex_is_admin())
    AND expires_at > now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.storage_compat_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.file_name := coalesce(new.file_name, new.name); new.name := coalesce(new.name, new.file_name); return new; end $function$
;

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
                 select sp.batch_id from public.student_profiles sp where sp.user_id = auth.uid())))
  )
$function$
;

CREATE OR REPLACE FUNCTION public.student_in_class(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select cid is not null and exists (
    select 1 from public.class_memberships m where m.class_id = cid and m.student_id = auth.uid())
$function$
;

CREATE OR REPLACE FUNCTION public.submit_assessment_attempt(p_assessment_id uuid, p_answers jsonb, p_time_used_seconds integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  a public.assessments%rowtype; pr public.profiles%rowtype; sp public.student_profiles%rowtype;
  q record; v_score numeric := 0; v_max numeric := 0;
  v_ok int := 0; v_bad int := 0; v_none int := 0; v_pct numeric; v_grade text; v_status text;
  v_used int; v_att uuid;
begin
  if not public.is_student() then raise exception 'Only students can submit attempts'; end if;
  select * into a from public.assessments where id = p_assessment_id;
  if not found or not public.student_can_access_assessment(p_assessment_id) then
    raise exception 'Assessment not available'; end if;
  if a.start_date is not null and now() < a.start_date then raise exception 'Assessment has not started'; end if;
  if a.end_date   is not null and now() > a.end_date + interval '2 minutes' then
    raise exception 'Assessment window has closed'; end if;
  if (select count(*) from public.student_attempts
      where assessment_id = p_assessment_id and student_id = auth.uid()) >= coalesce(a.attempts_allowed,1) then
    raise exception 'No attempts remaining'; end if;

  for q in
    select aq.id, coalesce(aq.marks,1) as marks,
           (select o.id from public.question_options o where o.question_id = aq.id and o.is_correct limit 1) as correct_id
    from public.assessment_questions aq where aq.assessment_id = p_assessment_id
  loop
    v_max := v_max + q.marks;
    if coalesce(p_answers->>(q.id::text), '') = '' then v_none := v_none + 1;
    elsif (p_answers->>(q.id::text)) = q.correct_id::text then v_score := v_score + q.marks; v_ok := v_ok + 1;
    else v_bad := v_bad + 1; end if;
  end loop;

  v_pct   := case when v_max > 0 then round(v_score / v_max * 100, 2) else 0 end;
  v_status:= case when v_pct >= coalesce(a.pass_percentage,40) then 'Passed' else 'Failed' end;
  v_grade := case when v_pct >= 90 then 'A+' when v_pct >= 80 then 'A' when v_pct >= 70 then 'B'
                  when v_pct >= 60 then 'C' when v_pct >= coalesce(a.pass_percentage,40) then 'D' else 'F' end;
  v_used  := least(greatest(coalesce(p_time_used_seconds,0),0), coalesce(a.duration_seconds, 86400));

  select * into pr from public.profiles where id = auth.uid();
  select * into sp from public.student_profiles where user_id = auth.uid();

  insert into public.student_attempts (assessment_id, student_id, answers, score, max_score, percentage, time_used_seconds)
  values (p_assessment_id, auth.uid(), coalesce(p_answers,'{}'::jsonb), round(v_score)::int, round(v_max)::int, v_pct, v_used)
  returning id into v_att;

  insert into public.results (assessment_id, student_id, assessment_title, type, subject, score, max_score,
      percentage, grade, status, correct_count, wrong_count, unanswered_count, time_used, attempt_id,
      student_name, student_id_code, course_id, course_name, batch_name, subject_name,
      marks_obtained, max_marks, result_status)
  values (p_assessment_id, auth.uid(), a.title, a.type, a.subject, round(v_score)::int, round(v_max)::int,
      v_pct, v_grade, v_status, v_ok, v_bad, v_none, (v_used/60)||' min '||(v_used%60)||' sec', v_att,
      pr.full_name, coalesce(sp.register_number, pr.student_id), sp.course_id, sp.course_name, sp.batch_name,
      coalesce(a.subject_name, a.subject), v_score, v_max, v_status);

  return jsonb_build_object('attempt_id', v_att, 'score', v_score, 'max_score', v_max,
                            'percentage', v_pct, 'grade', v_grade, 'status', v_status);
end $function$
;

CREATE OR REPLACE FUNCTION public.submit_mcq_attempt(p_assessment_id uuid, p_answers jsonb, p_time_used_seconds integer DEFAULT 0)
 RETURNS results
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  a public.assessments;
  v_prev int;
  v_score int := 0; v_max int := 0; v_correct int := 0; v_wrong int := 0; v_total int := 0;
  v_pct numeric; v_grade text; v_attempt uuid; v_result public.results;
  q record;
begin
  if not public.is_student() then raise exception 'Only students can submit attempts'; end if;

  select * into a from public.assessments where id = p_assessment_id;
  if not found or not a.published or a.class_id is null or not public.in_class(a.class_id) then
    raise exception 'Assessment not available';
  end if;
  if a.start_date is not null and now() < a.start_date then raise exception 'Assessment has not started'; end if;
  if a.end_date   is not null and now() > a.end_date   then raise exception 'Assessment window is closed'; end if;

  select count(*) into v_prev from public.student_attempts where assessment_id = a.id and student_id = auth.uid();
  if v_prev >= coalesce(a.attempts_allowed,1) then raise exception 'No attempts remaining'; end if;

  for q in select * from public.mcq_questions where assessment_id = a.id loop
    v_total := v_total + 1;
    v_max   := v_max + q.marks;
    if p_answers ? q.id::text then
      if (p_answers->>q.id::text)::int = q.correct_option then
        v_score := v_score + q.marks; v_correct := v_correct + 1;
      else v_wrong := v_wrong + 1; end if;
    end if;
  end loop;

  v_pct := case when v_max = 0 then 0 else round(100.0 * v_score / v_max, 2) end;
  v_grade := case when v_pct >= 90 then 'A+' when v_pct >= 80 then 'A' when v_pct >= 70 then 'B+'
                  when v_pct >= 60 then 'B'  when v_pct >= 50 then 'C' when v_pct >= a.pass_percentage then 'D' else 'F' end;

  insert into public.student_attempts (assessment_id, student_id, answers, score, max_score, percentage, time_used_seconds)
  values (a.id, auth.uid(), p_answers, v_score, v_max, v_pct, p_time_used_seconds)
  returning id into v_attempt;

  insert into public.results (assessment_id, student_id, assessment_title, type, subject, score, max_score, percentage,
         grade, status, correct_count, wrong_count, unanswered_count, time_used, attempt_id)
  values (a.id, auth.uid(), a.title, a.type, a.subject, v_score, v_max, v_pct, v_grade,
          case when v_pct >= a.pass_percentage then 'Passed' else 'Failed' end,
          v_correct, v_wrong, greatest(v_total - v_correct - v_wrong, 0),
          (p_time_used_seconds/60)||'m '||(p_time_used_seconds%60)||'s', v_attempt)
  returning * into v_result;

  return v_result;
end; $function$
;

CREATE OR REPLACE FUNCTION public.tatt_compat_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op='UPDATE' then
    if new.check_in  is distinct from old.check_in  then new.check_in_time  := new.check_in;  end if;
    if new.check_out is distinct from old.check_out then new.check_out_time := new.check_out; end if;
    if new.check_in_time  is distinct from old.check_in_time  then new.check_in  := new.check_in_time;  end if;
    if new.check_out_time is distinct from old.check_out_time then new.check_out := new.check_out_time; end if;
  end if;
  new.check_in_time := coalesce(new.check_in_time, new.check_in);   new.check_in  := coalesce(new.check_in,  new.check_in_time);
  new.check_out_time := coalesce(new.check_out_time, new.check_out); new.check_out := coalesce(new.check_out, new.check_out_time);
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.teacher_has_class(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select cid is not null and (
    exists (select 1 from public.classes c where c.id = cid and c.teacher_id = auth.uid())
    or exists (select 1 from public.teacher_assignments ta where ta.class_id = cid and ta.teacher_id = auth.uid())
  )
$function$
;

CREATE OR REPLACE FUNCTION public.teacher_has_student(sid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.class_memberships m
    join public.classes c on c.id = m.class_id
    where m.student_id = sid
      and (c.teacher_id = auth.uid()
           or exists (select 1 from public.teacher_assignments ta
                      where ta.class_id = c.id and ta.teacher_id = auth.uid()))
  )
$function$
;

CREATE OR REPLACE FUNCTION public.teaches_class(p_class_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.is_teacher() AND (
    EXISTS (SELECT 1 FROM public.classes c
            WHERE c.id = p_class_id AND c.teacher_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.teacher_assignments ta
               WHERE ta.class_id = p_class_id AND ta.teacher_id = (SELECT auth.uid()))
  );
$function$
;

CREATE OR REPLACE FUNCTION public.teaches_student(p_student_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT public.is_teacher() AND EXISTS (
    SELECT 1 FROM public.class_memberships cm
    WHERE cm.student_id = p_student_id AND public.teaches_class(cm.class_id)
  );
$function$
;

-- =============================================================================
-- 7. Views (after functions: the student assessment views call them)
-- =============================================================================

CREATE OR REPLACE VIEW public.coding_problems_student WITH (security_invoker=on) AS
 SELECT p.id,
    p.assessment_id,
    p.title,
    p.description,
    p.difficulty,
    p.language,
    p.starter_code,
    p.public_examples,
    p.marks
   FROM coding_problems p
     JOIN assessments a ON a.id = p.assessment_id
  WHERE a.published AND a.class_id IS NOT NULL AND in_class(a.class_id);

CREATE OR REPLACE VIEW public.mcq_questions_student WITH (security_invoker=true) AS
 SELECT q.id,
    q.assessment_id,
    q.question,
    q.code_snippet,
    q.options,
    q.marks
   FROM mcq_questions q
     JOIN assessments a ON a.id = q.assessment_id
  WHERE a.published AND a.class_id IS NOT NULL AND in_class(a.class_id) AND (a.start_date IS NULL OR a.start_date <= now()) AND (a.end_date IS NULL OR a.end_date >= now());

CREATE OR REPLACE VIEW public.student_assessment_questions WITH (security_invoker=true) AS
 SELECT id,
    assessment_id,
    question_text,
    question_type,
    code_snippet,
    marks,
    order_index
   FROM assessment_questions q
  WHERE student_can_access_assessment(assessment_id);

CREATE OR REPLACE VIEW public.student_coding_problems WITH (security_invoker=true) AS
 SELECT id,
    assessment_id,
    title,
    description,
    difficulty,
    language,
    starter_code,
    public_examples,
    marks
   FROM coding_problems p
  WHERE student_can_access_assessment(assessment_id);

CREATE OR REPLACE VIEW public.student_question_options WITH (security_invoker=true) AS
 SELECT o.id,
    o.question_id,
    o.option_label,
    o.option_text
   FROM question_options o
     JOIN assessment_questions q ON q.id = o.question_id
  WHERE student_can_access_assessment(q.assessment_id);

CREATE OR REPLACE VIEW public.teacher_directory WITH (security_barrier=true, security_invoker=true) AS
 SELECT p.id AS user_id,
    p.full_name,
    p.avatar_url,
    p.department,
    tp.designation,
    tp.primary_subject
   FROM profiles p
     JOIN teacher_profiles tp ON tp.user_id = p.id
  WHERE p.role = 'teacher'::text AND p.is_active = true AND tp.status = 'active'::text;

CREATE OR REPLACE VIEW public.user_roles WITH (security_invoker=true) AS
 SELECT id,
    id AS user_id,
    role,
    created_at
   FROM profiles;

-- =============================================================================
-- 8. Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS ix_activity_logs_created ON public.activity_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_announcements_date ON public.announcements USING btree (date DESC);
CREATE INDEX IF NOT EXISTS assessments_external_provider_idx ON public.assessments USING btree (created_by, published, start_date DESC) WHERE (external_url IS NOT NULL);
CREATE INDEX IF NOT EXISTS assessments_target_batch_idx ON public.assessments USING btree (target_batch, published) WHERE (published = true);
CREATE INDEX IF NOT EXISTS idx_assess_class ON public.assessments USING btree (class_id);
CREATE INDEX IF NOT EXISTS ix_assessments_class ON public.assessments USING btree (class_id, status);
CREATE INDEX IF NOT EXISTS attendance_codes_code_idx ON public.attendance_codes USING btree (code, expires_at);
CREATE INDEX IF NOT EXISTS idx_att_class ON public.attendance_records USING btree (class_id, date);
CREATE INDEX IF NOT EXISTS idx_att_student ON public.attendance_records USING btree (student_id, date);
CREATE INDEX IF NOT EXISTS ix_attendance_class_date ON public.attendance_records USING btree (class_id, date DESC);
CREATE INDEX IF NOT EXISTS ix_attendance_student_date ON public.attendance_records USING btree (student_id, date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_session ON public.attendance_records USING btree (student_id, class_id, subject, date, session_time);
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_slot ON public.attendance_records USING btree (student_id, class_id, subject, date, session_time);
CREATE INDEX IF NOT EXISTS idx_cm_class ON public.class_memberships USING btree (class_id);
CREATE INDEX IF NOT EXISTS idx_cm_student ON public.class_memberships USING btree (student_id, class_id);
CREATE INDEX IF NOT EXISTS ix_membership_class ON public.class_memberships USING btree (class_id);
CREATE INDEX IF NOT EXISTS ix_membership_student ON public.class_memberships USING btree (student_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_class_membership ON public.class_memberships USING btree (class_id, student_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON public.classes USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS ix_classes_teacher ON public.classes USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS code_submissions_assessment_idx ON public.code_submissions USING btree (assessment_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS ix_fee_student ON public.fee_records USING btree (student_id);
CREATE INDEX IF NOT EXISTS ix_live_class_class_date ON public.live_classes USING btree (class_id, date);
CREATE INDEX IF NOT EXISTS ix_mcq_assessment ON public.mcq_questions USING btree (assessment_id);
CREATE INDEX IF NOT EXISTS ix_notes_class ON public.notes USING btree (class_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications USING btree (user_id, read);
CREATE INDEX IF NOT EXISTS ix_notifications_user ON public.notifications USING btree (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_profiles_role ON public.profiles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_results_student ON public.results USING btree (student_id);
CREATE INDEX IF NOT EXISTS ix_results_student ON public.results USING btree (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS results_assessment_student_idx ON public.results USING btree (assessment_id, student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_assess ON public.student_attempts USING btree (assessment_id, student_id);
CREATE INDEX IF NOT EXISTS ix_attempts_student ON public.student_attempts USING btree (student_id, assessment_id);
CREATE INDEX IF NOT EXISTS student_email_roster_college_id_idx ON public.student_email_roster USING btree (college_id);
CREATE UNIQUE INDEX IF NOT EXISTS student_email_roster_email_lower_key ON public.student_email_roster USING btree (lower(email));
CREATE INDEX IF NOT EXISTS idx_sp_batch ON public.student_profiles USING btree (batch_id);
CREATE INDEX IF NOT EXISTS ix_student_profiles_batch ON public.student_profiles USING btree (batch_id);
CREATE INDEX IF NOT EXISTS ix_student_profiles_user ON public.student_profiles USING btree (user_id);
CREATE INDEX IF NOT EXISTS ix_queries_student ON public.student_queries USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_ta_teacher ON public.teacher_assignments USING btree (teacher_id, class_id);
CREATE INDEX IF NOT EXISTS ix_assign_teacher ON public.teacher_assignments USING btree (teacher_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_assignment ON public.teacher_assignments USING btree (class_id, teacher_id, subject);
CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_attendance_day ON public.teacher_attendance USING btree (teacher_id, date);
CREATE INDEX IF NOT EXISTS ix_teacher_profiles_user ON public.teacher_profiles USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_profiles_faculty_id_lower_key ON public.teacher_profiles USING btree (lower(faculty_id)) WHERE ((faculty_id IS NOT NULL) AND (btrim(faculty_id) <> ''::text));

-- =============================================================================
-- 9. Triggers (public tables and auth.users)
-- =============================================================================

DROP TRIGGER IF EXISTS trg_assessments_updated ON assessments;
CREATE TRIGGER trg_assessments_updated BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_guard_acr ON attendance_correction_requests;
CREATE TRIGGER trg_guard_acr BEFORE UPDATE ON public.attendance_correction_requests FOR EACH ROW EXECUTE FUNCTION guard_columns('status', 'reviewed_by', 'updated_at');
DROP TRIGGER IF EXISTS trg_refresh_attendance ON attendance_records;
CREATE TRIGGER trg_refresh_attendance AFTER INSERT OR DELETE OR UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION refresh_student_attendance();
DROP TRIGGER IF EXISTS trg_enforce_signup_allowlist ON auth.users;
CREATE TRIGGER trg_enforce_signup_allowlist BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION enforce_signup_allowlist();
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
DROP TRIGGER IF EXISTS trg_calendar_compat ON calendar_events;
CREATE TRIGGER trg_calendar_compat BEFORE INSERT OR UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION calendar_compat_sync();
DROP TRIGGER IF EXISTS trg_guard_notifications ON notifications;
CREATE TRIGGER trg_guard_notifications BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION guard_columns('read');
DROP TRIGGER IF EXISTS trg_apply_payment ON payment_transactions;
CREATE TRIGGER trg_apply_payment AFTER INSERT ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION apply_payment();
DROP TRIGGER IF EXISTS trg_guard_profile_role ON profiles;
CREATE TRIGGER trg_guard_profile_role BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION guard_profile_role();
DROP TRIGGER IF EXISTS trg_guard_profiles ON profiles;
CREATE TRIGGER trg_guard_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION guard_columns('full_name', 'phone', 'avatar_url', 'two_factor_enabled', 'last_login', 'updated_at');
DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_guard_result_update ON results;
CREATE TRIGGER trg_guard_result_update BEFORE UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION guard_result_update();
DROP TRIGGER IF EXISTS trg_refresh_average ON results;
CREATE TRIGGER trg_refresh_average AFTER INSERT OR DELETE OR UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION refresh_student_average();
DROP TRIGGER IF EXISTS trg_results_compat ON results;
CREATE TRIGGER trg_results_compat BEFORE INSERT OR UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION results_compat_sync();
DROP TRIGGER IF EXISTS trg_banner_compat ON slide_banners;
CREATE TRIGGER trg_banner_compat BEFORE INSERT OR UPDATE ON public.slide_banners FOR EACH ROW EXECUTE FUNCTION banner_compat_sync();
DROP TRIGGER IF EXISTS trg_storage_compat ON storage_files;
CREATE TRIGGER trg_storage_compat BEFORE INSERT OR UPDATE ON public.storage_files FOR EACH ROW EXECUTE FUNCTION storage_compat_sync();
DROP TRIGGER IF EXISTS trg_batch_counts ON student_profiles;
CREATE TRIGGER trg_batch_counts AFTER INSERT OR DELETE OR UPDATE OF batch_id, status ON public.student_profiles FOR EACH STATEMENT EXECUTE FUNCTION refresh_batch_counts();
DROP TRIGGER IF EXISTS trg_guard_student_cols ON student_profiles;
CREATE TRIGGER trg_guard_student_cols BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION guard_student_profile_columns();
DROP TRIGGER IF EXISTS trg_guard_student_profiles ON student_profiles;
CREATE TRIGGER trg_guard_student_profiles BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION guard_columns('phone', 'alternate_phone', 'dob', 'gender', 'address', 'guardian_name', 'guardian_phone', 'guardian_email', 'guardian_relation', 'emergency_contact', 'skills', 'career_interests', 'github_url', 'linkedin_url', 'portfolio_url', 'specialization', 'updated_at');
DROP TRIGGER IF EXISTS trg_refresh_batch_count ON student_profiles;
CREATE TRIGGER trg_refresh_batch_count AFTER INSERT OR DELETE OR UPDATE OF batch_id, status ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION refresh_batch_count();
DROP TRIGGER IF EXISTS trg_student_profiles_updated ON student_profiles;
CREATE TRIGGER trg_student_profiles_updated BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_query_compat ON student_queries;
CREATE TRIGGER trg_query_compat BEFORE INSERT OR UPDATE ON public.student_queries FOR EACH ROW EXECUTE FUNCTION query_compat_sync();
DROP TRIGGER IF EXISTS trg_guard_teacher_attendance ON teacher_attendance;
CREATE TRIGGER trg_guard_teacher_attendance BEFORE UPDATE ON public.teacher_attendance FOR EACH ROW EXECUTE FUNCTION guard_columns('check_out_time', 'check_out', 'duration_minutes', 'remarks', 'updated_at');
DROP TRIGGER IF EXISTS trg_tatt_compat ON teacher_attendance;
CREATE TRIGGER trg_tatt_compat BEFORE INSERT OR UPDATE ON public.teacher_attendance FOR EACH ROW EXECUTE FUNCTION tatt_compat_sync();
DROP TRIGGER IF EXISTS trg_leave_compat ON teacher_leave;
CREATE TRIGGER trg_leave_compat BEFORE INSERT OR UPDATE ON public.teacher_leave FOR EACH ROW EXECUTE FUNCTION leave_compat_sync();
DROP TRIGGER IF EXISTS trg_guard_teacher_profiles ON teacher_profiles;
CREATE TRIGGER trg_guard_teacher_profiles BEFORE UPDATE ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION guard_columns('phone', 'dob', 'gender', 'address', 'qualification', 'experience_years', 'primary_subject', 'skills', 'bio', 'linkedin_url', 'github_url', 'portfolio_url', 'updated_at');
DROP TRIGGER IF EXISTS trg_teacher_profiles_updated ON teacher_profiles;
CREATE TRIGGER trg_teacher_profiles_updated BEFORE UPDATE ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 10. Row level security
-- =============================================================================

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slide_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_email_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 11. Policies (public tables and storage.objects)
-- =============================================================================

DROP POLICY IF EXISTS admin_all ON public.activity_logs;
CREATE POLICY admin_all ON public.activity_logs AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS log_insert ON public.activity_logs;
CREATE POLICY log_insert ON public.activity_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((actor_id = auth.uid()));
DROP POLICY IF EXISTS adm_public_insert ON public.admissions;
CREATE POLICY adm_public_insert ON public.admissions AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (((status = 'pending'::text) AND (reviewed_by IS NULL) AND (converted_student_id IS NULL)));
DROP POLICY IF EXISTS admin_all ON public.admissions;
CREATE POLICY admin_all ON public.admissions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS admin_all ON public.allowed_emails;
CREATE POLICY admin_all ON public.allowed_emails AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS admin_all ON public.announcements;
CREATE POLICY admin_all ON public.announcements AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS ann_read ON public.announcements;
CREATE POLICY ann_read ON public.announcements AS PERMISSIVE FOR SELECT TO authenticated
  USING (((target_role = ANY (ARRAY['all'::text, current_role_name()])) AND (COALESCE(publish_date, now()) <= now()) AND ((expiry_date IS NULL) OR (expiry_date > now())) AND ((target_class_id IS NULL) OR student_in_class(target_class_id) OR teacher_has_class(target_class_id))));
DROP POLICY IF EXISTS ann_teacher_write ON public.announcements;
CREATE POLICY ann_teacher_write ON public.announcements AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND (sender_id = auth.uid())))
  WITH CHECK ((is_teacher() AND (sender_id = auth.uid()) AND (target_role = 'student'::text) AND ((target_class_id IS NULL) OR teacher_has_class(target_class_id))));
DROP POLICY IF EXISTS admin_all ON public.assessment_questions;
CREATE POLICY admin_all ON public.assessment_questions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS aq_teacher ON public.assessment_questions;
CREATE POLICY aq_teacher ON public.assessment_questions AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND assessment_owned_by_me(assessment_id)))
  WITH CHECK ((is_teacher() AND assessment_owned_by_me(assessment_id)));
DROP POLICY IF EXISTS admin_all ON public.assessments;
CREATE POLICY admin_all ON public.assessments AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS as_student ON public.assessments;
CREATE POLICY as_student ON public.assessments AS PERMISSIVE FOR SELECT TO authenticated
  USING (student_can_access_assessment(id));
DROP POLICY IF EXISTS as_teacher ON public.assessments;
CREATE POLICY as_teacher ON public.assessments AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND ((created_by = auth.uid()) OR (teacher_id = auth.uid()))))
  WITH CHECK ((is_teacher() AND ((created_by = auth.uid()) OR (teacher_id = auth.uid()))));
DROP POLICY IF EXISTS attendance_codes_creator_read ON public.attendance_codes;
CREATE POLICY attendance_codes_creator_read ON public.attendance_codes AS PERMISSIVE FOR SELECT TO authenticated
  USING (((created_by = auth.uid()) OR dudex_is_admin()));
DROP POLICY IF EXISTS acr_student_ins ON public.attendance_correction_requests;
CREATE POLICY acr_student_ins ON public.attendance_correction_requests AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((student_id = auth.uid()) AND (status = 'Pending'::text) AND (reviewed_by IS NULL)));
DROP POLICY IF EXISTS acr_student_sel ON public.attendance_correction_requests;
CREATE POLICY acr_student_sel ON public.attendance_correction_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_id = auth.uid()));
DROP POLICY IF EXISTS acr_teacher_sel ON public.attendance_correction_requests;
CREATE POLICY acr_teacher_sel ON public.attendance_correction_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_teacher() AND teacher_has_student(student_id)));
DROP POLICY IF EXISTS acr_teacher_upd ON public.attendance_correction_requests;
CREATE POLICY acr_teacher_upd ON public.attendance_correction_requests AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_teacher() AND teacher_has_student(student_id)))
  WITH CHECK ((is_teacher() AND teacher_has_student(student_id)));
DROP POLICY IF EXISTS admin_all ON public.attendance_correction_requests;
CREATE POLICY admin_all ON public.attendance_correction_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS admin_all ON public.attendance_records;
CREATE POLICY admin_all ON public.attendance_records AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS att_student ON public.attendance_records;
CREATE POLICY att_student ON public.attendance_records AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_id = auth.uid()));
DROP POLICY IF EXISTS att_teacher ON public.attendance_records;
CREATE POLICY att_teacher ON public.attendance_records AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND ((teacher_id = auth.uid()) OR teacher_has_class(class_id))))
  WITH CHECK ((is_teacher() AND ((teacher_id = auth.uid()) OR teacher_has_class(class_id))));
DROP POLICY IF EXISTS admin_all ON public.attendance_sessions;
CREATE POLICY admin_all ON public.attendance_sessions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS atts_student ON public.attendance_sessions;
CREATE POLICY atts_student ON public.attendance_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING (student_in_class(class_id));
DROP POLICY IF EXISTS atts_teacher ON public.attendance_sessions;
CREATE POLICY atts_teacher ON public.attendance_sessions AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND ((conducted_by = auth.uid()) OR teacher_has_class(class_id))))
  WITH CHECK ((is_teacher() AND ((conducted_by = auth.uid()) OR teacher_has_class(class_id))));
DROP POLICY IF EXISTS admin_all ON public.batches;
CREATE POLICY admin_all ON public.batches AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS read_authenticated ON public.batches;
CREATE POLICY read_authenticated ON public.batches AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.calendar_events;
CREATE POLICY admin_all ON public.calendar_events AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS cal_read ON public.calendar_events;
CREATE POLICY cal_read ON public.calendar_events AS PERMISSIVE FOR SELECT TO authenticated
  USING (((target_role = 'all'::text) OR (target_role = current_role_name())));
DROP POLICY IF EXISTS admin_all ON public.certificates;
CREATE POLICY admin_all ON public.certificates AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS cert_student ON public.certificates;
CREATE POLICY cert_student ON public.certificates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.class_memberships;
CREATE POLICY admin_all ON public.class_memberships AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS cm_student ON public.class_memberships;
CREATE POLICY cm_student ON public.class_memberships AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_id = auth.uid()));
DROP POLICY IF EXISTS cm_teacher ON public.class_memberships;
CREATE POLICY cm_teacher ON public.class_memberships AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND teacher_has_class(class_id)))
  WITH CHECK ((is_teacher() AND teacher_has_class(class_id)));
DROP POLICY IF EXISTS admin_all ON public.class_sessions;
CREATE POLICY admin_all ON public.class_sessions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS cs_student ON public.class_sessions;
CREATE POLICY cs_student ON public.class_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING (student_in_class(class_id));
DROP POLICY IF EXISTS cs_teacher ON public.class_sessions;
CREATE POLICY cs_teacher ON public.class_sessions AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND (teacher_id = auth.uid())))
  WITH CHECK ((is_teacher() AND (teacher_id = auth.uid())));
DROP POLICY IF EXISTS admin_all ON public.classes;
CREATE POLICY admin_all ON public.classes AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS classes_select ON public.classes;
CREATE POLICY classes_select ON public.classes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((teacher_has_class(id) OR student_in_class(id)));
DROP POLICY IF EXISTS classes_teacher_del ON public.classes;
CREATE POLICY classes_teacher_del ON public.classes AS PERMISSIVE FOR DELETE TO authenticated
  USING ((is_teacher() AND (teacher_id = auth.uid())));
DROP POLICY IF EXISTS classes_teacher_ins ON public.classes;
CREATE POLICY classes_teacher_ins ON public.classes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_teacher() AND (teacher_id = auth.uid())));
DROP POLICY IF EXISTS classes_teacher_upd ON public.classes;
CREATE POLICY classes_teacher_upd ON public.classes AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_teacher() AND (teacher_id = auth.uid())))
  WITH CHECK ((is_teacher() AND (teacher_id = auth.uid())));
DROP POLICY IF EXISTS admin_all ON public.classrooms;
CREATE POLICY admin_all ON public.classrooms AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS read_authenticated ON public.classrooms;
CREATE POLICY read_authenticated ON public.classrooms AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.code_submissions;
CREATE POLICY admin_all ON public.code_submissions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS cods_student_ins ON public.code_submissions;
CREATE POLICY cods_student_ins ON public.code_submissions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((student_id = auth.uid()) AND (score = 0) AND (passed_tests = 0) AND student_can_access_assessment(assessment_id)));
DROP POLICY IF EXISTS cods_student_sel ON public.code_submissions;
CREATE POLICY cods_student_sel ON public.code_submissions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_id = auth.uid()));
DROP POLICY IF EXISTS cods_teacher ON public.code_submissions;
CREATE POLICY cods_teacher ON public.code_submissions AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND assessment_owned_by_me(assessment_id)))
  WITH CHECK ((is_teacher() AND assessment_owned_by_me(assessment_id)));
DROP POLICY IF EXISTS admin_all ON public.coding_problems;
CREATE POLICY admin_all ON public.coding_problems AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS cp_teacher ON public.coding_problems;
CREATE POLICY cp_teacher ON public.coding_problems AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND assessment_owned_by_me(assessment_id)))
  WITH CHECK ((is_teacher() AND assessment_owned_by_me(assessment_id)));
DROP POLICY IF EXISTS admin_all ON public.colleges;
CREATE POLICY admin_all ON public.colleges AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS colleges_read_anon ON public.colleges;
CREATE POLICY colleges_read_anon ON public.colleges AS PERMISSIVE FOR SELECT TO anon
  USING ((status = 'active'::text));
DROP POLICY IF EXISTS read_authenticated ON public.colleges;
CREATE POLICY read_authenticated ON public.colleges AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.content_sections;
CREATE POLICY admin_all ON public.content_sections AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS read_authenticated ON public.content_sections;
CREATE POLICY read_authenticated ON public.content_sections AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.courses;
CREATE POLICY admin_all ON public.courses AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS courses_read_anon ON public.courses;
CREATE POLICY courses_read_anon ON public.courses AS PERMISSIVE FOR SELECT TO anon
  USING ((status = 'active'::text));
DROP POLICY IF EXISTS courses_read_auth ON public.courses;
CREATE POLICY courses_read_auth ON public.courses AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.departments;
CREATE POLICY admin_all ON public.departments AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS departments_read_anon ON public.departments;
CREATE POLICY departments_read_anon ON public.departments AS PERMISSIVE FOR SELECT TO anon
  USING (true);
DROP POLICY IF EXISTS read_authenticated ON public.departments;
CREATE POLICY read_authenticated ON public.departments AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.enrollments;
CREATE POLICY admin_all ON public.enrollments AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS enr_student ON public.enrollments;
CREATE POLICY enr_student ON public.enrollments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.fee_records;
CREATE POLICY admin_all ON public.fee_records AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS fee_student ON public.fee_records;
CREATE POLICY fee_student ON public.fee_records AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.live_classes;
CREATE POLICY admin_all ON public.live_classes AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS lc_student ON public.live_classes;
CREATE POLICY lc_student ON public.live_classes AS PERMISSIVE FOR SELECT TO authenticated
  USING (student_in_class(class_id));
DROP POLICY IF EXISTS lc_teacher ON public.live_classes;
CREATE POLICY lc_teacher ON public.live_classes AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND (teacher_id = auth.uid())))
  WITH CHECK ((is_teacher() AND (teacher_id = auth.uid())));
DROP POLICY IF EXISTS admin_all ON public.mcq_questions;
CREATE POLICY admin_all ON public.mcq_questions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS mcq_teacher ON public.mcq_questions;
CREATE POLICY mcq_teacher ON public.mcq_questions AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND assessment_owned_by_me(assessment_id)))
  WITH CHECK ((is_teacher() AND assessment_owned_by_me(assessment_id)));
DROP POLICY IF EXISTS admin_all ON public.note_attachments;
CREATE POLICY admin_all ON public.note_attachments AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS na_student ON public.note_attachments;
CREATE POLICY na_student ON public.note_attachments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM notes n
  WHERE ((n.id = note_attachments.note_id) AND student_in_class(n.class_id)))));
DROP POLICY IF EXISTS na_teacher ON public.note_attachments;
CREATE POLICY na_teacher ON public.note_attachments AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM notes n
  WHERE ((n.id = note_attachments.note_id) AND (n.teacher_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM notes n
  WHERE ((n.id = note_attachments.note_id) AND (n.teacher_id = auth.uid())))));
DROP POLICY IF EXISTS admin_all ON public.notes;
CREATE POLICY admin_all ON public.notes AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS notes_student ON public.notes;
CREATE POLICY notes_student ON public.notes AS PERMISSIVE FOR SELECT TO authenticated
  USING (student_in_class(class_id));
DROP POLICY IF EXISTS notes_teacher ON public.notes;
CREATE POLICY notes_teacher ON public.notes AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND (teacher_id = auth.uid())))
  WITH CHECK ((is_teacher() AND (teacher_id = auth.uid())));
DROP POLICY IF EXISTS admin_all ON public.notifications;
CREATE POLICY admin_all ON public.notifications AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS notif_delete_own ON public.notifications;
CREATE POLICY notif_delete_own ON public.notifications AS PERMISSIVE FOR DELETE TO authenticated
  USING ((user_id = auth.uid()));
DROP POLICY IF EXISTS notif_select ON public.notifications;
CREATE POLICY notif_select ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = auth.uid()) OR ((user_id IS NULL) AND ((audience IS NULL) OR (lower(audience) ~~ 'all%'::text) OR (lower(audience) ~~ (current_role_name() || '%'::text))))));
DROP POLICY IF EXISTS notif_teacher_send ON public.notifications;
CREATE POLICY notif_teacher_send ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_teacher() AND (created_by = auth.uid()) AND (user_id IS NOT NULL) AND teacher_has_student(user_id)));
DROP POLICY IF EXISTS notif_update_own ON public.notifications;
CREATE POLICY notif_update_own ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.payment_transactions;
CREATE POLICY admin_all ON public.payment_transactions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS pay_student ON public.payment_transactions;
CREATE POLICY pay_student ON public.payment_transactions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.platform_settings;
CREATE POLICY admin_all ON public.platform_settings AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS read_authenticated ON public.platform_settings;
CREATE POLICY read_authenticated ON public.platform_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.portal_features;
CREATE POLICY admin_all ON public.portal_features AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS read_authenticated ON public.portal_features;
CREATE POLICY read_authenticated ON public.portal_features AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.portal_navigation;
CREATE POLICY admin_all ON public.portal_navigation AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS read_authenticated ON public.portal_navigation;
CREATE POLICY read_authenticated ON public.portal_navigation AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.profiles;
CREATE POLICY admin_all ON public.profiles AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (((id = auth.uid()) OR ((role = 'teacher'::text) AND (is_teacher() OR is_student())) OR ((role = 'student'::text) AND is_teacher() AND teacher_has_student(id))));
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.question_options;
CREATE POLICY admin_all ON public.question_options AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS qo_teacher ON public.question_options;
CREATE POLICY qo_teacher ON public.question_options AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM assessment_questions q
  WHERE ((q.id = question_options.question_id) AND is_teacher() AND assessment_owned_by_me(q.assessment_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM assessment_questions q
  WHERE ((q.id = question_options.question_id) AND is_teacher() AND assessment_owned_by_me(q.assessment_id)))));
DROP POLICY IF EXISTS admin_all ON public.results;
CREATE POLICY admin_all ON public.results AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS res_student ON public.results;
CREATE POLICY res_student ON public.results AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_id = auth.uid()));
DROP POLICY IF EXISTS res_teacher ON public.results;
CREATE POLICY res_teacher ON public.results AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_teacher() AND ((evaluator_teacher_id = auth.uid()) OR assessment_owned_by_me(assessment_id))))
  WITH CHECK ((is_teacher() AND ((evaluator_teacher_id = auth.uid()) OR assessment_owned_by_me(assessment_id))));
DROP POLICY IF EXISTS admin_all ON public.roles;
CREATE POLICY admin_all ON public.roles AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS admin_all ON public.slide_banners;
CREATE POLICY admin_all ON public.slide_banners AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS read_authenticated ON public.slide_banners;
CREATE POLICY read_authenticated ON public.slide_banners AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.specializations;
CREATE POLICY admin_all ON public.specializations AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS read_authenticated ON public.specializations;
CREATE POLICY read_authenticated ON public.specializations AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS specializations_read_anon ON public.specializations;
CREATE POLICY specializations_read_anon ON public.specializations AS PERMISSIVE FOR SELECT TO anon
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.storage_files;
CREATE POLICY admin_all ON public.storage_files AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS sf_owner ON public.storage_files;
CREATE POLICY sf_owner ON public.storage_files AS PERMISSIVE FOR ALL TO authenticated
  USING ((owner_id = auth.uid()))
  WITH CHECK ((owner_id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.student_attempts;
CREATE POLICY admin_all ON public.student_attempts AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS att2_student ON public.student_attempts;
CREATE POLICY att2_student ON public.student_attempts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_id = auth.uid()));
DROP POLICY IF EXISTS att2_teacher ON public.student_attempts;
CREATE POLICY att2_teacher ON public.student_attempts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_teacher() AND assessment_owned_by_me(assessment_id)));
DROP POLICY IF EXISTS admin_all ON public.student_email_roster;
CREATE POLICY admin_all ON public.student_email_roster AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS student_email_roster_admin_all ON public.student_email_roster;
CREATE POLICY student_email_roster_admin_all ON public.student_email_roster AS PERMISSIVE FOR ALL TO authenticated
  USING (dudex_is_admin())
  WITH CHECK (dudex_is_admin());
DROP POLICY IF EXISTS admin_all ON public.student_profiles;
CREATE POLICY admin_all ON public.student_profiles AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS sp_select ON public.student_profiles;
CREATE POLICY sp_select ON public.student_profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = auth.uid()) OR (is_teacher() AND teacher_has_student(user_id))));
DROP POLICY IF EXISTS sp_update_self ON public.student_profiles;
CREATE POLICY sp_update_self ON public.student_profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.student_queries;
CREATE POLICY admin_all ON public.student_queries AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS sq_student_ins ON public.student_queries;
CREATE POLICY sq_student_ins ON public.student_queries AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((student_id = auth.uid()) AND (status = 'open'::text) AND (admin_response IS NULL)));
DROP POLICY IF EXISTS sq_student_sel ON public.student_queries;
CREATE POLICY sq_student_sel ON public.student_queries AS PERMISSIVE FOR SELECT TO authenticated
  USING ((student_id = auth.uid()));
DROP POLICY IF EXISTS sq_teacher ON public.student_queries;
CREATE POLICY sq_teacher ON public.student_queries AS PERMISSIVE FOR SELECT TO authenticated
  USING ((assigned_faculty = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.subjects;
CREATE POLICY admin_all ON public.subjects AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS read_authenticated ON public.subjects;
CREATE POLICY read_authenticated ON public.subjects AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS admin_all ON public.teacher_applications;
CREATE POLICY admin_all ON public.teacher_applications AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS tapp_public_insert ON public.teacher_applications;
CREATE POLICY tapp_public_insert ON public.teacher_applications AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (((status = 'pending'::text) AND (converted_teacher_id IS NULL)));
DROP POLICY IF EXISTS admin_all ON public.teacher_assignments;
CREATE POLICY admin_all ON public.teacher_assignments AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS ta_student ON public.teacher_assignments;
CREATE POLICY ta_student ON public.teacher_assignments AS PERMISSIVE FOR SELECT TO authenticated
  USING (student_in_class(class_id));
DROP POLICY IF EXISTS ta_teacher ON public.teacher_assignments;
CREATE POLICY ta_teacher ON public.teacher_assignments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((teacher_id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.teacher_attendance;
CREATE POLICY admin_all ON public.teacher_attendance AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS tatt_teacher_ins ON public.teacher_attendance;
CREATE POLICY tatt_teacher_ins ON public.teacher_attendance AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((teacher_id = auth.uid()) AND (date = CURRENT_DATE)));
DROP POLICY IF EXISTS tatt_teacher_sel ON public.teacher_attendance;
CREATE POLICY tatt_teacher_sel ON public.teacher_attendance AS PERMISSIVE FOR SELECT TO authenticated
  USING ((teacher_id = auth.uid()));
DROP POLICY IF EXISTS tatt_teacher_upd ON public.teacher_attendance;
CREATE POLICY tatt_teacher_upd ON public.teacher_attendance AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((teacher_id = auth.uid()) AND (date = CURRENT_DATE)))
  WITH CHECK ((teacher_id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.teacher_leave;
CREATE POLICY admin_all ON public.teacher_leave AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS tl_teacher_ins ON public.teacher_leave;
CREATE POLICY tl_teacher_ins ON public.teacher_leave AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((teacher_id = auth.uid()) AND (status = 'pending'::text) AND (reviewed_by IS NULL)));
DROP POLICY IF EXISTS tl_teacher_sel ON public.teacher_leave;
CREATE POLICY tl_teacher_sel ON public.teacher_leave AS PERMISSIVE FOR SELECT TO authenticated
  USING ((teacher_id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.teacher_leave_requests;
CREATE POLICY admin_all ON public.teacher_leave_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS tlr_teacher_ins ON public.teacher_leave_requests;
CREATE POLICY tlr_teacher_ins ON public.teacher_leave_requests AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((teacher_id = auth.uid()) AND (status = 'pending'::text) AND (reviewed_by IS NULL)));
DROP POLICY IF EXISTS tlr_teacher_sel ON public.teacher_leave_requests;
CREATE POLICY tlr_teacher_sel ON public.teacher_leave_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((teacher_id = auth.uid()));
DROP POLICY IF EXISTS admin_all ON public.teacher_profiles;
CREATE POLICY admin_all ON public.teacher_profiles AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS tp_select ON public.teacher_profiles;
CREATE POLICY tp_select ON public.teacher_profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = auth.uid()));
DROP POLICY IF EXISTS tp_update_self ON public.teacher_profiles;
CREATE POLICY tp_update_self ON public.teacher_profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));
DROP POLICY IF EXISTS apps_admin_read ON storage.objects;
CREATE POLICY apps_admin_read ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'applications'::text) AND is_admin()));
DROP POLICY IF EXISTS apps_public_upload ON storage.objects;
CREATE POLICY apps_public_upload ON storage.objects AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK ((bucket_id = 'applications'::text));
DROP POLICY IF EXISTS avatars_read ON storage.objects;
CREATE POLICY avatars_read ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'avatars'::text));
DROP POLICY IF EXISTS avatars_write ON storage.objects;
CREATE POLICY avatars_write ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
DROP POLICY IF EXISTS banners_admin ON storage.objects;
CREATE POLICY banners_admin ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING (((bucket_id = 'banners'::text) AND is_admin()))
  WITH CHECK (((bucket_id = 'banners'::text) AND is_admin()));
DROP POLICY IF EXISTS banners_read ON storage.objects;
CREATE POLICY banners_read ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'banners'::text));
DROP POLICY IF EXISTS certs_admin ON storage.objects;
CREATE POLICY certs_admin ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING (((bucket_id = 'certificates'::text) AND is_admin()))
  WITH CHECK (((bucket_id = 'certificates'::text) AND is_admin()));
DROP POLICY IF EXISTS certs_student ON storage.objects;
CREATE POLICY certs_student ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'certificates'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
DROP POLICY IF EXISTS dudex_notes_owner_delete ON storage.objects;
CREATE POLICY dudex_notes_owner_delete ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'notes'::text) AND ((owner = auth.uid()) OR dudex_is_admin())));
DROP POLICY IF EXISTS dudex_notes_read ON storage.objects;
CREATE POLICY dudex_notes_read ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = 'notes'::text));
DROP POLICY IF EXISTS dudex_notes_teacher_upload ON storage.objects;
CREATE POLICY dudex_notes_teacher_upload ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'notes'::text) AND (dudex_is_admin() OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'teacher'::text)))))));
DROP POLICY IF EXISTS notes_class_member_read ON storage.objects;
CREATE POLICY notes_class_member_read ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = ANY (ARRAY['notes'::text, 'materials'::text])) AND
CASE
    WHEN ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) THEN (is_admin() OR in_class(((storage.foldername(name))[1])::uuid) OR teaches_class(((storage.foldername(name))[1])::uuid))
    ELSE false
END));
DROP POLICY IF EXISTS notes_teacher_delete_class ON storage.objects;
CREATE POLICY notes_teacher_delete_class ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = ANY (ARRAY['notes'::text, 'materials'::text])) AND
CASE
    WHEN ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) THEN (is_admin() OR teaches_class(((storage.foldername(name))[1])::uuid))
    ELSE false
END));
DROP POLICY IF EXISTS notes_teacher_update_class ON storage.objects;
CREATE POLICY notes_teacher_update_class ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = ANY (ARRAY['notes'::text, 'materials'::text])) AND
CASE
    WHEN ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) THEN (is_admin() OR teaches_class(((storage.foldername(name))[1])::uuid))
    ELSE false
END))
  WITH CHECK (((bucket_id = ANY (ARRAY['notes'::text, 'materials'::text])) AND
CASE
    WHEN ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) THEN (is_admin() OR teaches_class(((storage.foldername(name))[1])::uuid))
    ELSE false
END));
DROP POLICY IF EXISTS notes_teacher_upload_class ON storage.objects;
CREATE POLICY notes_teacher_upload_class ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = ANY (ARRAY['notes'::text, 'materials'::text])) AND
CASE
    WHEN ((storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) THEN (is_admin() OR teaches_class(((storage.foldername(name))[1])::uuid))
    ELSE false
END));
DROP POLICY IF EXISTS qa_admin ON storage.objects;
CREATE POLICY qa_admin ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'query-attachments'::text) AND is_admin()));
DROP POLICY IF EXISTS qa_student ON storage.objects;
CREATE POLICY qa_student ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING (((bucket_id = 'query-attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  WITH CHECK (((bucket_id = 'query-attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

-- =============================================================================
-- 12. Table and view privileges
-- =============================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.activity_logs TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.activity_logs TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.admissions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.admissions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.allowed_emails TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.allowed_emails TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.announcements TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.announcements TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.assessment_questions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.assessment_questions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.assessments TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.assessments TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.attendance_codes TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.attendance_correction_requests TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.attendance_correction_requests TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.attendance_records TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.attendance_records TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.attendance_sessions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.attendance_sessions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.batches TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.batches TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.calendar_events TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.calendar_events TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.certificates TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.certificates TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.class_memberships TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.class_memberships TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.class_sessions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.class_sessions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.classes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.classes TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.classrooms TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.classrooms TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.code_submissions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.code_submissions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.coding_problems TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.coding_problems TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.colleges TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.colleges TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.content_sections TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.content_sections TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.courses TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.courses TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.departments TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.departments TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.enrollments TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.enrollments TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.fee_records TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.fee_records TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.live_classes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.live_classes TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mcq_questions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mcq_questions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.note_attachments TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.note_attachments TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.notes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.notes TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.notifications TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.notifications TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.payment_transactions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.payment_transactions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.platform_settings TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.platform_settings TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.portal_features TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.portal_features TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.portal_navigation TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.portal_navigation TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profiles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profiles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.question_options TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.question_options TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.results TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.results TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.roles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.roles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.slide_banners TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.slide_banners TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.specializations TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.specializations TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.storage_files TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.storage_files TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.student_attempts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.student_email_roster TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.student_email_roster TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.student_profiles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.student_profiles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.student_queries TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.student_queries TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.subjects TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.subjects TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_applications TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_applications TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_assignments TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_assignments TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_attendance TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_attendance TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_leave TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_leave TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_leave_requests TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_leave_requests TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_profiles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.teacher_profiles TO service_role;
GRANT INSERT ON public.admissions TO anon;
GRANT INSERT ON public.teacher_applications TO anon;
GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.student_attempts TO authenticated;
GRANT SELECT ON public.attendance_codes TO authenticated;
GRANT SELECT ON public.coding_problems_student TO authenticated;
GRANT SELECT ON public.coding_problems_student TO service_role;
GRANT SELECT ON public.colleges TO anon;
GRANT SELECT ON public.courses TO anon;
GRANT SELECT ON public.departments TO anon;
GRANT SELECT ON public.mcq_questions_student TO authenticated;
GRANT SELECT ON public.mcq_questions_student TO service_role;
GRANT SELECT ON public.specializations TO anon;
GRANT SELECT ON public.student_assessment_questions TO authenticated;
GRANT SELECT ON public.student_assessment_questions TO service_role;
GRANT SELECT ON public.student_coding_problems TO authenticated;
GRANT SELECT ON public.student_coding_problems TO service_role;
GRANT SELECT ON public.student_question_options TO authenticated;
GRANT SELECT ON public.student_question_options TO service_role;
GRANT SELECT ON public.teacher_directory TO authenticated;
GRANT SELECT ON public.teacher_directory TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO service_role;

-- =============================================================================
-- 13. Function privileges (revokes first, then grants)
-- =============================================================================

REVOKE ALL ON FUNCTION public.admin_dashboard_counts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_payment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assessment_owned_by_me(aid uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.banner_compat_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calendar_compat_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_my_student_registration(p_full_name text, p_phone text, p_register_number text, p_course text, p_specialization text, p_batch_name text, p_section text, p_academic_year text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_role_name() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dudex_is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dudex_teaches_class(p_class_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_signup_allowlist() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_class_attendance_summary(p_class_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_student_roster_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_student_attendance_summary(p_student_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_result_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_student_profile_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_auth_user_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.in_class(p_class_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_email_allowed(p_email text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_student() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_teacher() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leave_compat_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_attendance_with_code(p_code text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_all(p_audience text, p_title text, p_message text, p_type text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_class(p_class_id uuid, p_title text, p_message text, p_type text, p_action_url text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_teacher_account(target_email text, target_full_name text, target_faculty_id text, target_department_id uuid, target_designation text, target_phone text, target_qualification text, target_avatar_url text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.query_compat_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_batch_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_batch_counts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_student_attendance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_student_average() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.results_compat_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_attendance_code_session(p_class_id uuid, p_subject text, p_valid_minutes integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stop_attendance_code_session(p_code_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.storage_compat_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_can_access_assessment(aid uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_in_class(cid uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_assessment_attempt(p_assessment_id uuid, p_answers jsonb, p_time_used_seconds integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_mcq_attempt(p_assessment_id uuid, p_answers jsonb, p_time_used_seconds integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tatt_compat_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teacher_has_class(cid uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teacher_has_student(sid uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teaches_class(p_class_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teaches_student(p_student_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_counts() TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_payment() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment() TO service_role;
GRANT EXECUTE ON FUNCTION public.assessment_owned_by_me(aid uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assessment_owned_by_me(aid uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.banner_compat_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION public.banner_compat_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.calendar_compat_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calendar_compat_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_my_student_registration(p_full_name text, p_phone text, p_register_number text, p_course text, p_specialization text, p_batch_name text, p_section text, p_academic_year text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_my_student_registration(p_full_name text, p_phone text, p_register_number text, p_course text, p_specialization text, p_batch_name text, p_section text, p_academic_year text) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_role_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_role_name() TO service_role;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.dudex_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dudex_is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.dudex_teaches_class(p_class_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dudex_teaches_class(p_class_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_signup_allowlist() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_class_attendance_summary(p_class_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_attendance_summary(p_class_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_student_roster_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_student_roster_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_student_attendance_summary(p_student_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_attendance_summary(p_student_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_columns() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_profile_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_result_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_result_update() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_student_profile_columns() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_student_profile_columns() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_profile() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.in_class(p_class_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.in_class(p_class_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_email_allowed(p_email text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_email_allowed(p_email text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_allowed(p_email text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_student() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_student() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO service_role;
GRANT EXECUTE ON FUNCTION public.leave_compat_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_compat_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_attendance_with_code(p_code text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_attendance_with_code(p_code text) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_all(p_audience text, p_title text, p_message text, p_type text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_all(p_audience text, p_title text, p_message text, p_type text) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_class(p_class_id uuid, p_title text, p_message text, p_type text, p_action_url text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_class(p_class_id uuid, p_title text, p_message text, p_type text, p_action_url text) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_teacher_account(target_email text, target_full_name text, target_faculty_id text, target_department_id uuid, target_designation text, target_phone text, target_qualification text, target_avatar_url text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_teacher_account(target_email text, target_full_name text, target_faculty_id text, target_department_id uuid, target_designation text, target_phone text, target_qualification text, target_avatar_url text) TO service_role;
GRANT EXECUTE ON FUNCTION public.query_compat_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION public.query_compat_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_batch_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_batch_count() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_batch_counts() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_student_attendance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_student_attendance() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_student_average() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_student_average() TO service_role;
GRANT EXECUTE ON FUNCTION public.results_compat_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION public.results_compat_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.start_attendance_code_session(p_class_id uuid, p_subject text, p_valid_minutes integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_attendance_code_session(p_class_id uuid, p_subject text, p_valid_minutes integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.stop_attendance_code_session(p_code_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stop_attendance_code_session(p_code_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.storage_compat_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_compat_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.student_can_access_assessment(aid uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_access_assessment(aid uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.student_in_class(cid uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_in_class(cid uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_assessment_attempt(p_assessment_id uuid, p_answers jsonb, p_time_used_seconds integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_assessment_attempt(p_assessment_id uuid, p_answers jsonb, p_time_used_seconds integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_mcq_attempt(p_assessment_id uuid, p_answers jsonb, p_time_used_seconds integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mcq_attempt(p_assessment_id uuid, p_answers jsonb, p_time_used_seconds integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.tatt_compat_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tatt_compat_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.teacher_has_class(cid uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_has_class(cid uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.teacher_has_student(sid uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_has_student(sid uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.teaches_class(p_class_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teaches_class(p_class_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.teaches_student(p_student_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teaches_student(p_student_id uuid) TO service_role;

-- =============================================================================
-- 14. Storage buckets
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('applications', 'applications', false, 10485760, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('avatars', 'avatars', true, 5242880, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('avaters', 'avaters', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('banners', 'banners', true, 10485760, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('certificates', 'certificates', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('materials', 'materials', false, 52428800, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('notes', 'notes', false, 26214400, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('notes-materials', 'notes-materials', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('query-attachments', 'query-attachments', false, 10485760, NULL) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 15. Realtime
-- =============================================================================

DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.assessments; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_correction_requests; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notes; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.results; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.student_queries; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_profiles; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;

-- =============================================================================
-- 15b. Student safe views run with the owner's rights (migration 050)
-- =============================================================================
-- Their WHERE clause (student_can_access_assessment / in_class) filters to the
-- signed-in student's published assessments; answer keys are not in the views.
ALTER VIEW public.student_assessment_questions SET (security_invoker = false);
ALTER VIEW public.student_question_options     SET (security_invoker = false);
ALTER VIEW public.student_coding_problems      SET (security_invoker = false);
ALTER VIEW public.mcq_questions_student        SET (security_invoker = false);
ALTER VIEW public.coding_problems_student      SET (security_invoker = false);

-- =============================================================================
-- 15c. Announcement category/status (migration 051)
-- =============================================================================
-- 051: Teacher "Student Communication" items (Announcements, Support Requests,
-- Class Discussion, Teacher Notes) are stored as announcements so students
-- receive them. Adds a category and a publication status; additive only, and
-- existing rows default to a published announcement.

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Announcements',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Published';

DO $c$ BEGIN
  ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_category_check
    CHECK (category = ANY (ARRAY['Announcements', 'Support Requests', 'Class Discussion', 'Teacher Notes']));
EXCEPTION WHEN duplicate_object THEN NULL; END $c$;

DO $c$ BEGIN
  ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_status_check
    CHECK (status = ANY (ARRAY['Published', 'Draft', 'Archived']));
EXCEPTION WHEN duplicate_object THEN NULL; END $c$;

-- =============================================================================
-- 15d. External (HackerRank) result submissions (migration 052)
-- =============================================================================
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

-- =============================================================================
-- 15e. College degrees/batches + admin-assigned roster batch (migration 053)
-- =============================================================================
-- 053: Degrees and batches per college, and admin-assigned batches.
--
-- * colleges.degrees / colleges.batches: the admin "Create Academic Institution"
--   form collects these but there was nowhere to store them, so the student
--   registration form always showed an empty Degree list.
-- * student_email_roster.batch_name: the admin assigns each student's batch when
--   adding their college email; registration uses it instead of free text.
-- Additive, except get_my_student_roster_profile is recreated (same grants) to
-- also return batch_name.

ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS degrees text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS batches text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.student_email_roster
  ADD COLUMN IF NOT EXISTS batch_name text;

DROP FUNCTION IF EXISTS public.get_my_student_roster_profile();
CREATE FUNCTION public.get_my_student_roster_profile()
 RETURNS TABLE(full_name text, college_name text, student_id text, department text, batch_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
  SELECT
    COALESCE(roster.student_name, profile.full_name),
    roster.college_name,
    roster.student_id,
    roster.department,
    roster.batch_name
  FROM auth.users AS auth_user
  JOIN public.profiles AS profile
    ON profile.id = auth_user.id
   AND profile.role = 'student'
  JOIN public.student_email_roster AS roster
    ON lower(roster.email) = lower(auth_user.email)
   AND roster.status = 'active'
  WHERE auth_user.id = auth.uid()
    AND auth_user.email_confirmed_at IS NOT NULL
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_my_student_roster_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_student_roster_profile() TO authenticated;

-- Registration: the admin-assigned batch (if any) wins over what was typed.
DO $do$
DECLARE
  def text := pg_get_functiondef(
    'public.complete_my_student_registration(text, text, text, text, text, text, text, text)'::regprocedure
  );
  patched text;
BEGIN
  IF position('roster_record.batch_name' in def) > 0 THEN
    RETURN; -- already applied
  END IF;
  -- Only the VALUES line that is exactly "btrim(p_batch_name)," (the required-
  -- field check also mentions p_batch_name but is followed by ", ''").
  patched := regexp_replace(
    def,
    '(\n\s*)btrim\(p_batch_name\),(\s*\r?\n)',
    E'\\1coalesce(nullif(btrim(roster_record.batch_name), ''''), btrim(p_batch_name)),\\2'
  );
  IF patched = def THEN
    RAISE EXCEPTION 'complete_my_student_registration does not match the expected definition';
  END IF;
  EXECUTE patched;
END
$do$;

-- =============================================================================
-- 15f. Registration saves college, register number, specialization, phone (migration 054)
-- =============================================================================
-- 054: Student registration saves the college, register number, specialization
-- and phone on student_profiles.
--
-- complete_my_student_registration only wrote department/course/batch/section/
-- year, so student_profiles.college_name kept its column default ("Dudex Smart
-- Academy") and register_number, specialization and phone stayed null. Teacher
-- and admin views that read student_profiles showed the wrong college.
-- The function is recreated in full (same signature and grants), keeping 053's
-- admin-assigned batch, and existing rows are backfilled from the roster.


CREATE OR REPLACE FUNCTION public.complete_my_student_registration(p_full_name text, p_phone text, p_register_number text, p_course text, p_specialization text, p_batch_name text, p_section text, p_academic_year text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth'
AS $function$
DECLARE
  roster_record public.student_email_roster%ROWTYPE;
  student_user_id uuid := auth.uid();
BEGIN
  IF student_user_id IS NULL THEN
    RAISE EXCEPTION 'A signed-in student account is required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = student_user_id
      AND profile.role = 'student'
  ) THEN
    RAISE EXCEPTION 'Student access is required'
      USING ERRCODE = '42501';
  END IF;

  SELECT roster.*
  INTO roster_record
  FROM auth.users AS auth_user
  JOIN public.student_email_roster AS roster
    ON lower(roster.email) = lower(auth_user.email)
   AND roster.status = 'active'
  WHERE auth_user.id = student_user_id
    AND auth_user.email_confirmed_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'An active, verified student roster entry is required'
      USING ERRCODE = '42501';
  END IF;

  IF nullif(btrim(p_full_name), '') IS NULL
     OR nullif(btrim(p_phone), '') IS NULL
     OR nullif(btrim(p_register_number), '') IS NULL
     OR nullif(btrim(p_course), '') IS NULL
     OR nullif(btrim(p_specialization), '') IS NULL
     OR nullif(btrim(p_batch_name), '') IS NULL
     OR nullif(btrim(p_section), '') IS NULL
     OR nullif(btrim(p_academic_year), '') IS NULL THEN
    RAISE EXCEPTION 'All registration and academic fields are required'
      USING ERRCODE = '22023';
  END IF;

  IF nullif(btrim(roster_record.student_id), '') IS NOT NULL
     AND lower(btrim(roster_record.student_id)) <> lower(btrim(p_register_number)) THEN
    RAISE EXCEPTION 'The register number does not match the active roster entry'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET full_name = btrim(p_full_name),
      phone = nullif(btrim(p_phone), '')
  WHERE id = student_user_id;

  INSERT INTO public.student_profiles (
    user_id,
    college_name,
    department,
    course_name,
    specialization,
    batch_name,
    section,
    academic_year,
    roll_number,
    register_number,
    phone,
    status,
    updated_at
  )
  VALUES (
    student_user_id,
    roster_record.college_name,
    coalesce(nullif(btrim(roster_record.department), ''), btrim(p_specialization)),
    btrim(p_course) || ' - ' || btrim(p_specialization),
    btrim(p_specialization),
    -- The admin-assigned batch (if any) wins over what was typed.
    coalesce(nullif(btrim(roster_record.batch_name), ''), btrim(p_batch_name)),
    btrim(p_section),
    btrim(p_academic_year),
    COALESCE(nullif(btrim(roster_record.student_id), ''), btrim(p_register_number)),
    btrim(p_register_number),
    btrim(p_phone),
    'active',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET college_name = EXCLUDED.college_name,
        department = EXCLUDED.department,
        course_name = EXCLUDED.course_name,
        specialization = EXCLUDED.specialization,
        batch_name = EXCLUDED.batch_name,
        section = EXCLUDED.section,
        academic_year = EXCLUDED.academic_year,
        roll_number = COALESCE(EXCLUDED.roll_number, student_profiles.roll_number),
        register_number = EXCLUDED.register_number,
        phone = EXCLUDED.phone,
        updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_my_student_registration(text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_my_student_registration(text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_my_student_registration(text, text, text, text, text, text, text, text) TO service_role;

-- Backfill students who registered before this fix.
UPDATE public.student_profiles AS sp
SET college_name = roster.college_name,
    register_number = coalesce(sp.register_number, sp.roll_number),
    phone = coalesce(sp.phone, profile.phone)
FROM auth.users AS auth_user
JOIN public.student_email_roster AS roster
  ON lower(roster.email) = lower(auth_user.email)
 AND roster.status = 'active'
LEFT JOIN public.profiles AS profile
  ON profile.id = auth_user.id
WHERE auth_user.id = sp.user_id
  AND (sp.college_name IS DISTINCT FROM roster.college_name
       OR sp.register_number IS NULL
       OR sp.phone IS NULL);

-- =============================================================================
-- 15g. Classes enrol matching students automatically (migration 056)
-- =============================================================================
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

-- =============================================================================
-- 15h. Security audit fixes (migration 057)
-- =============================================================================
-- 057: Fixes from the security audit (see SECURITY_QA_AUDIT_REPORT.md).
--
-- AUD-01  Exam content before the window opens. student_can_access_assessment
--         only checks "published" and class membership, so the student views
--         returned question text, options and coding problems for scheduled
--         exams that had not started (submission already refuses before
--         start_date). Content is now readable only once the exam has started.
-- AUD-02  is_email_allowed was executable by anon, letting anyone test whether
--         an email is an enrolled student or allow-listed teacher. No portal
--         calls it; only service_role keeps EXECUTE.
-- AUD-03  Every student could read every teacher's profile row (email, phone).
--         Students now see only teachers of classes they are enrolled in.
--         Teachers still see all teachers; admins see everyone.
-- AUD-04  Hardening: fixed search_path on two SECURITY DEFINER helpers and no
--         PUBLIC/anon EXECUTE on the unused auth trigger function.


-- AUD-01 -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_can_view_assessment_content(aid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.student_can_access_assessment(aid)
     and exists (
       select 1 from public.assessments a
       where a.id = aid
         and (a.start_date is null or now() >= a.start_date)
     )
$function$;

REVOKE ALL ON FUNCTION public.student_can_view_assessment_content(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_view_assessment_content(uuid) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.student_assessment_questions WITH (security_invoker = false) AS
  SELECT id, assessment_id, question_text, question_type, code_snippet, marks, order_index
  FROM public.assessment_questions q
  WHERE public.student_can_view_assessment_content(assessment_id);

CREATE OR REPLACE VIEW public.student_question_options WITH (security_invoker = false) AS
  SELECT o.id, o.question_id, o.option_label, o.option_text
  FROM public.question_options o
  JOIN public.assessment_questions q ON q.id = o.question_id
  WHERE public.student_can_view_assessment_content(q.assessment_id);

CREATE OR REPLACE VIEW public.student_coding_problems WITH (security_invoker = false) AS
  SELECT id, assessment_id, title, description, difficulty, language, starter_code, public_examples, marks
  FROM public.coding_problems p
  WHERE public.student_can_view_assessment_content(assessment_id);

-- Legacy view (no portal uses it): same start-time rule as the others.
CREATE OR REPLACE VIEW public.coding_problems_student WITH (security_invoker = false) AS
  SELECT p.id, p.assessment_id, p.title, p.description, p.difficulty, p.language,
         p.starter_code, p.public_examples, p.marks
  FROM public.coding_problems p
  JOIN public.assessments a ON a.id = p.assessment_id
  WHERE a.published AND a.class_id IS NOT NULL AND public.in_class(a.class_id)
    AND (a.start_date IS NULL OR a.start_date <= now());

-- AUD-02 -------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.is_email_allowed(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO service_role;

-- AUD-03 -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_has_teacher(p_teacher_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.class_memberships m
    join public.classes c on c.id = m.class_id
    where m.student_id = auth.uid()
      and (c.teacher_id = p_teacher_id
           or exists (select 1 from public.teacher_assignments ta
                      where ta.class_id = c.id and ta.teacher_id = p_teacher_id))
  )
$function$;

REVOKE ALL ON FUNCTION public.student_has_teacher(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_has_teacher(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (id = auth.uid())
    OR ((role = 'teacher') AND is_teacher())
    OR ((role = 'teacher') AND is_student() AND student_has_teacher(id))
    OR ((role = 'student') AND is_teacher() AND teacher_has_student(id))
  );

-- AUD-04 -------------------------------------------------------------------
ALTER FUNCTION public.current_user_role() SET search_path TO 'public';
ALTER FUNCTION public.get_user_role() SET search_path TO 'public';
REVOKE ALL ON FUNCTION public.handle_new_auth_user_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_profile() TO service_role;

-- =============================================================================
-- 16. Required seed row
-- =============================================================================
-- The admin portal reads a single settings row (CHECK id = 1).
INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =============================================================================
-- AFTER RUNNING
-- =============================================================================
-- A. Create the first admin. Sign-ups are blocked unless the email is on the
--    student roster or in allowed_emails (trigger enforce_signup_allowlist),
--    and every new account starts as a student (trigger handle_new_user).
--    Run A1, then create the user, then run A2:
--
--    A1. INSERT INTO public.allowed_emails (email, role, full_name, status)
--        VALUES ('admin@yourdomain.com', 'admin', 'Administrator', 'active');
--
--    -> Dashboard -> Authentication -> Users -> Add user -> Create new user
--       (same email, set a password, tick "Auto Confirm User").
--
--    A2. UPDATE public.profiles SET role = 'admin', is_active = true
--        WHERE email = 'admin@yourdomain.com';
--
--    Then sign in to the admin portal with that email and password.
--
-- B. Deploy the teacher invitation Edge Function (from D:\dudex-admin-website):
--      npx supabase login            (as the account that owns the new project)
--      npx supabase link --project-ref <NEW_PROJECT_REF>
--      npx supabase functions deploy invite-teacher
--      npx supabase secrets set TEACHER_PORTAL_URL=https://<teacher-portal-domain> ALLOWED_ORIGINS=https://<admin-portal-domain>
--    localhost on any port is always allowed for development.
--
-- C. Authentication -> URL Configuration: set Site URL and add each portal's
--    reset/callback URLs (e.g. <teacher-portal>/reset-password,
--    <student-portal>/reset-password, and the localhost URLs you use).
--
-- D. Authentication -> SMTP Settings: configure a real sender. The built-in
--    mailer only sends a few emails per hour (invites, OTPs, resets).
--
-- E. In each portal's .env, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
--    to the new project's URL and anon (publishable) key, then restart them:
--      D:\dudex-admin-website\.env
--      D:\dudex-teacher-portal\.env and .env.local
--      D:\dudex_student_portal_new\.env and .env.local
--    Never put the service_role key in any of these files.
-- =============================================================================
