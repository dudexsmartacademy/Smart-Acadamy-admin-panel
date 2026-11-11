export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = 'student' | 'teacher' | 'admin';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type QuestionType = 'mcq_single' | 'mcq_multiple' | 'coding' | 'subjective';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type AssessmentStatus = 'draft' | 'scheduled' | 'active' | 'closed' | 'archived';
export type AssessmentType = 'mcq' | 'coding' | 'hybrid' | 'assignment';
export type AttemptStatus = 'in_progress' | 'submitted' | 'auto_submitted' | 'expired' | 'evaluated';
export type LiveClassStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';
export type ProgrammingLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'cpp' | 'c' | 'sql';
export type SubmissionStatus = 'pending' | 'running' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'runtime_error' | 'compilation_error';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: AppRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: AppRole;
        };
      };
      colleges: {
        Row: {
          id: string;
          name: string;
          code: string;
          city: string | null;
          state: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          city?: string | null;
          state?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          code?: string;
          city?: string | null;
          state?: string | null;
          updated_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          college_id: string;
          name: string;
          code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          college_id: string;
          name: string;
          code: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          college_id?: string;
          name?: string;
          code?: string;
          updated_at?: string;
        };
      };
      specializations: {
        Row: {
          id: string;
          department_id: string;
          name: string;
          code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          name: string;
          code: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          department_id?: string;
          name?: string;
          code?: string;
          updated_at?: string;
        };
      };
      academic_years: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          updated_at?: string;
        };
      };
      batches: {
        Row: {
          id: string;
          college_id: string;
          name: string;
          start_year: number;
          end_year: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          college_id: string;
          name: string;
          start_year: number;
          end_year: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          college_id?: string;
          name?: string;
          start_year?: number;
          end_year?: number;
          updated_at?: string;
        };
      };
      sections: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      classes: {
        Row: {
          id: string;
          college_id: string;
          department_id: string;
          specialization_id: string | null;
          batch_id: string;
          section_id: string;
          academic_year_id: string;
          name: string;
          code: string | null;
          semester: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          college_id: string;
          department_id: string;
          specialization_id?: string | null;
          batch_id: string;
          section_id: string;
          academic_year_id: string;
          name: string;
          code?: string | null;
          semester?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          college_id?: string;
          department_id?: string;
          specialization_id?: string | null;
          batch_id?: string;
          section_id?: string;
          academic_year_id?: string;
          name?: string;
          code?: string | null;
          semester?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      student_profiles: {
        Row: {
          id: string;
          user_id: string;
          rrn: string;
          college_id: string;
          department_id: string;
          specialization_id: string | null;
          batch_id: string;
          roll_number: string | null;
          date_of_birth: string | null;
          gender: string | null;
          guardian_name: string | null;
          guardian_phone: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rrn: string;
          college_id: string;
          department_id: string;
          specialization_id?: string | null;
          batch_id: string;
          roll_number?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          guardian_name?: string | null;
          guardian_phone?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          rrn?: string;
          college_id?: string;
          department_id?: string;
          specialization_id?: string | null;
          batch_id?: string;
          roll_number?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          guardian_name?: string | null;
          guardian_phone?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
      class_memberships: {
        Row: {
          id: string;
          class_id: string;
          student_id: string;
          enrolled_at: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          student_id: string;
          enrolled_at?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          class_id?: string;
          student_id?: string;
          is_active?: boolean;
        };
      };
      teacher_profiles: {
        Row: {
          id: string;
          user_id: string;
          faculty_id: string;
          college_id: string;
          department_id: string;
          designation: string;
          phone: string | null;
          profile_photo: string | null;
          qualification: string | null;
          experience_years: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          faculty_id: string;
          college_id: string;
          department_id: string;
          designation?: string;
          phone?: string | null;
          profile_photo?: string | null;
          qualification?: string | null;
          experience_years?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          faculty_id?: string;
          college_id?: string;
          department_id?: string;
          designation?: string;
          phone?: string | null;
          profile_photo?: string | null;
          qualification?: string | null;
          experience_years?: number;
          status?: string;
          updated_at?: string;
        };
      };
      teacher_assignments: {
        Row: {
          id: string;
          teacher_id: string;
          class_id: string;
          subject_id: string | null;
          academic_year_id: string;
          permission_level: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          class_id: string;
          subject_id?: string | null;
          academic_year_id: string;
          permission_level?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          teacher_id?: string;
          class_id?: string;
          subject_id?: string | null;
          academic_year_id?: string;
          permission_level?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          department_id: string;
          name: string;
          code: string;
          credits: number;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          name: string;
          code: string;
          credits?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          department_id?: string;
          name?: string;
          code?: string;
          credits?: number;
          description?: string | null;
          updated_at?: string;
        };
      };
      course_offerings: {
        Row: {
          id: string;
          subject_id: string;
          class_id: string;
          teacher_id: string;
          academic_year_id: string;
          semester: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          class_id: string;
          teacher_id: string;
          academic_year_id: string;
          semester?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subject_id?: string;
          class_id?: string;
          teacher_id?: string;
          academic_year_id?: string;
          semester?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      live_classes: {
        Row: {
          id: string;
          class_id: string;
          course_offering_id: string | null;
          teacher_id: string;
          title: string;
          description: string | null;
          meeting_platform: string;
          meeting_url: string;
          scheduled_date: string;
          start_time: string;
          end_time: string;
          status: LiveClassStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          course_offering_id?: string | null;
          teacher_id: string;
          title: string;
          description?: string | null;
          meeting_platform?: string;
          meeting_url: string;
          scheduled_date: string;
          start_time: string;
          end_time: string;
          status?: LiveClassStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          course_offering_id?: string | null;
          title?: string;
          description?: string | null;
          meeting_platform?: string;
          meeting_url?: string;
          scheduled_date?: string;
          start_time?: string;
          end_time?: string;
          status?: LiveClassStatus;
          updated_at?: string;
        };
      };
      class_sessions: {
        Row: {
          id: string;
          class_id: string;
          course_offering_id: string | null;
          teacher_id: string;
          session_date: string;
          start_time: string | null;
          end_time: string | null;
          mode: string;
          room: string | null;
          meeting_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          course_offering_id?: string | null;
          teacher_id: string;
          session_date: string;
          start_time?: string | null;
          end_time?: string | null;
          mode?: string;
          room?: string | null;
          meeting_url?: string | null;
          created_at?: string;
        };
        Update: {
          session_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          mode?: string;
          room?: string | null;
          meeting_url?: string | null;
        };
      };
      attendance_records: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          status: AttendanceStatus;
          marked_by: string;
          marked_at: string;
          remarks: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          status?: AttendanceStatus;
          marked_by: string;
          marked_at?: string;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: AttendanceStatus;
          marked_by?: string;
          marked_at?: string;
          remarks?: string | null;
          updated_at?: string;
        };
      };
      attendance_correction_requests: {
        Row: {
          id: string;
          attendance_record_id: string;
          student_id: string;
          requested_status: AttendanceStatus;
          reason: string;
          supporting_document_url: string | null;
          status: string;
          reviewed_by: string | null;
          review_remarks: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          attendance_record_id: string;
          student_id: string;
          requested_status: AttendanceStatus;
          reason: string;
          supporting_document_url?: string | null;
          status?: string;
          reviewed_by?: string | null;
          review_remarks?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          reviewed_by?: string | null;
          review_remarks?: string | null;
          reviewed_at?: string | null;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          created_by: string;
          subject_id: string;
          question_text: string;
          question_type: QuestionType;
          topic: string;
          difficulty: DifficultyLevel;
          marks: number;
          explanation: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          subject_id: string;
          question_text: string;
          question_type?: QuestionType;
          topic: string;
          difficulty?: DifficultyLevel;
          marks?: number;
          explanation?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subject_id?: string;
          question_text?: string;
          question_type?: QuestionType;
          topic?: string;
          difficulty?: DifficultyLevel;
          marks?: number;
          explanation?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      question_options: {
        Row: {
          id: string;
          question_id: string;
          option_text: string;
          option_order: number;
          is_correct: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_text: string;
          option_order?: number;
          is_correct?: boolean;
          created_at?: string;
        };
        Update: {
          option_text?: string;
          option_order?: number;
          is_correct?: boolean;
        };
      };
      assessments: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          class_id: string;
          course_offering_id: string | null;
          subject_id: string | null;
          type: AssessmentType;
          duration_seconds: number;
          max_marks: number;
          pass_marks: number;
          start_at: string | null;
          end_at: string | null;
          attempts_allowed: number;
          negative_marking: boolean;
          negative_marks: number;
          randomize_questions: boolean;
          randomize_options: boolean;
          show_result_immediately: boolean;
          show_correct_answers: boolean;
          status: AssessmentStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          class_id: string;
          course_offering_id?: string | null;
          subject_id?: string | null;
          type?: AssessmentType;
          duration_seconds?: number;
          max_marks?: number;
          pass_marks?: number;
          start_at?: string | null;
          end_at?: string | null;
          attempts_allowed?: number;
          negative_marking?: boolean;
          negative_marks?: number;
          randomize_questions?: boolean;
          randomize_options?: boolean;
          show_result_immediately?: boolean;
          show_correct_answers?: boolean;
          status?: AssessmentStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          class_id?: string;
          course_offering_id?: string | null;
          subject_id?: string | null;
          type?: AssessmentType;
          duration_seconds?: number;
          max_marks?: number;
          pass_marks?: number;
          start_at?: string | null;
          end_at?: string | null;
          attempts_allowed?: number;
          negative_marking?: boolean;
          negative_marks?: number;
          randomize_questions?: boolean;
          randomize_options?: boolean;
          show_result_immediately?: boolean;
          show_correct_answers?: boolean;
          status?: AssessmentStatus;
          updated_at?: string;
        };
      };
      assessment_questions: {
        Row: {
          id: string;
          assessment_id: string;
          question_id: string;
          question_order: number;
          marks: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          question_id: string;
          question_order?: number;
          marks?: number;
          created_at?: string;
        };
        Update: {
          question_order?: number;
          marks?: number;
        };
      };
      student_attempts: {
        Row: {
          id: string;
          assessment_id: string;
          student_id: string;
          attempt_number: number;
          started_at: string;
          expires_at: string;
          submitted_at: string | null;
          status: AttemptStatus;
          score: number | null;
          percentage: number | null;
          grade: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          student_id: string;
          attempt_number?: number;
          started_at?: string;
          expires_at: string;
          submitted_at?: string | null;
          status?: AttemptStatus;
          score?: number | null;
          percentage?: number | null;
          grade?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          submitted_at?: string | null;
          status?: AttemptStatus;
          score?: number | null;
          percentage?: number | null;
          grade?: string | null;
          updated_at?: string;
        };
      };
      student_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_option_id: string | null;
          answer_text: string | null;
          marks_awarded: number;
          is_correct: boolean;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_option_id?: string | null;
          answer_text?: string | null;
          marks_awarded?: number;
          is_correct?: boolean;
          submitted_at?: string;
        };
        Update: {
          selected_option_id?: string | null;
          answer_text?: string | null;
          marks_awarded?: number;
          is_correct?: boolean;
        };
      };
      results: {
        Row: {
          id: string;
          assessment_id: string;
          student_id: string;
          attempt_id: string;
          score: number;
          max_marks: number;
          percentage: number;
          grade: string;
          is_passed: boolean;
          published_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          student_id: string;
          attempt_id: string;
          score: number;
          max_marks: number;
          percentage: number;
          grade: string;
          is_passed?: boolean;
          published_at?: string;
          created_at?: string;
        };
        Update: {
          score?: number;
          max_marks?: number;
          percentage?: number;
          grade?: string;
          is_passed?: boolean;
        };
      };
      notes: {
        Row: {
          id: string;
          class_id: string;
          course_offering_id: string | null;
          subject_id: string | null;
          teacher_id: string;
          note_date: string;
          title: string;
          description: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          class_id: string;
          course_offering_id?: string | null;
          subject_id?: string | null;
          teacher_id: string;
          note_date: string;
          title: string;
          description?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          class_id?: string;
          course_offering_id?: string | null;
          subject_id?: string | null;
          note_date?: string;
          title?: string;
          description?: string | null;
          is_published?: boolean;
          updated_at?: string;
          archived_at?: string | null;
        };
      };
      note_attachments: {
        Row: {
          id: string;
          note_id: string;
          file_path: string;
          file_name: string;
          file_type: string;
          file_size: number;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          file_path: string;
          file_name: string;
          file_type: string;
          file_size: number;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          file_path?: string;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          display_order?: number;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          title: string;
          message: string;
          notification_type: string;
          link_url: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          title: string;
          message: string;
          notification_type?: string;
          link_url?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          priority: string;
          scope: string;
          target_class_id: string | null;
          target_department_id: string | null;
          target_batch_id: string | null;
          publish_at: string;
          expires_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          priority?: string;
          scope?: string;
          target_class_id?: string | null;
          target_department_id?: string | null;
          target_batch_id?: string | null;
          publish_at?: string;
          expires_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          priority?: string;
          scope?: string;
          target_class_id?: string | null;
          publish_at?: string;
          expires_at?: string | null;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          action?: string;
          metadata?: Json;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          entity_type: string;
          entity_id: string;
          old_data: Json | null;
          new_data: Json | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          action: string;
          entity_type: string;
          entity_id: string;
          old_data?: Json | null;
          new_data?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          reason?: string | null;
        };
      };
      platform_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          value?: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      grading_rules: {
        Row: {
          id: string;
          college_id: string | null;
          grade: string;
          min_percentage: number;
          max_percentage: number;
          grade_point: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          college_id?: string | null;
          grade: string;
          min_percentage: number;
          max_percentage: number;
          grade_point?: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          grade?: string;
          min_percentage?: number;
          max_percentage?: number;
          grade_point?: number;
          description?: string | null;
        };
      };
      coding_problems: {
        Row: {
          id: string;
          question_id: string;
          title: string;
          problem_statement: string;
          input_format: string | null;
          output_format: string | null;
          constraints: string | null;
          time_limit_ms: number;
          memory_limit_mb: number;
          starter_templates: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          title: string;
          problem_statement: string;
          input_format?: string | null;
          output_format?: string | null;
          constraints?: string | null;
          time_limit_ms?: number;
          memory_limit_mb?: number;
          starter_templates?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          problem_statement?: string;
          input_format?: string | null;
          output_format?: string | null;
          constraints?: string | null;
          time_limit_ms?: number;
          memory_limit_mb?: number;
          starter_templates?: Json;
          updated_at?: string;
        };
      };
      coding_test_cases: {
        Row: {
          id: string;
          coding_problem_id: string;
          input_data: string;
          expected_output: string;
          is_hidden: boolean;
          weightage: number;
          explanation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          coding_problem_id: string;
          input_data: string;
          expected_output: string;
          is_hidden?: boolean;
          weightage?: number;
          explanation?: string | null;
          created_at?: string;
        };
        Update: {
          input_data?: string;
          expected_output?: string;
          is_hidden?: boolean;
          weightage?: number;
          explanation?: string | null;
        };
      };
      code_submissions: {
        Row: {
          id: string;
          attempt_id: string | null;
          coding_problem_id: string;
          student_id: string;
          language: ProgrammingLanguage;
          code: string;
          status: SubmissionStatus;
          score: number;
          test_cases_passed: number;
          total_test_cases: number;
          execution_time_ms: number | null;
          memory_used_kb: number | null;
          error_message: string | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          attempt_id?: string | null;
          coding_problem_id: string;
          student_id: string;
          language: ProgrammingLanguage;
          code: string;
          status?: SubmissionStatus;
          score?: number;
          test_cases_passed?: number;
          total_test_cases?: number;
          execution_time_ms?: number | null;
          memory_used_kb?: number | null;
          error_message?: string | null;
          submitted_at?: string;
        };
        Update: {
          status?: SubmissionStatus;
          score?: number;
          test_cases_passed?: number;
          execution_time_ms?: number | null;
          error_message?: string | null;
        };
      };
    };
    Functions: {
      has_role: {
        Args: { check_user_id: string; check_role: AppRole };
        Returns: boolean;
      };
      calculate_grade: {
        Args: { p_percentage: number; p_college_id?: string | null };
        Returns: string;
      };
      get_student_attendance_summary: {
        Args: { p_student_id: string };
        Returns: {
          total_sessions: number;
          present_count: number;
          absent_count: number;
          late_count: number;
          excused_count: number;
          percentage: number;
        }[];
      };
      get_student_subject_attendance: {
        Args: { p_student_id: string; p_subject_id: string };
        Returns: {
          subject_id: string;
          total_sessions: number;
          present_count: number;
          absent_count: number;
          late_count: number;
          excused_count: number;
          percentage: number;
        }[];
      };
      get_class_attendance_summary: {
        Args: { p_class_id: string };
        Returns: {
          class_id: string;
          total_sessions: number;
          enrolled_students: number;
          average_percentage: number;
        }[];
      };
      submit_mcq_attempt: {
        Args: {
          p_attempt_id: string;
          p_answers: Json;
        };
        Returns: {
          success: boolean;
          attempt_id: string;
          score: number;
          max_marks: number;
          percentage: number;
          grade: string;
          is_passed: boolean;
          submitted_at: string;
        };
      };
    };
  };
}
