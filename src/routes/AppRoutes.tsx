import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute';
import { AdminLayout } from '../layouts/AdminLayout';

// =========================================================
// AUTH PAGES
// =========================================================

import { LoginPage } from '../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';


// =========================================================
// TEACHER MANAGEMENT
// =========================================================

import { TeacherFormPage } from '../pages/teachers/TeacherFormPage';
import { TeacherDetailPage } from '../pages/teachers/TeacherDetailPage';

import { TeacherApplicationsPage } from '../pages/teacher-applications/TeacherApplicationsPage';

import { TeacherAttendancePage } from '../pages/teacher-attendance/TeacherAttendancePage';
import { TeacherAttendanceDetailPage } from '../pages/teacher-attendance/TeacherAttendanceDetailPage';

import TeacherClassesPage
  from '../pages/teacher-classes/TeacherClassesPage';

import TeacherClassesDetailPage
  from '../pages/teacher-classes/TeacherClassesDetailPage';

import TeacherClassFormPage
  from '../pages/teacher-classes/TeacherClassFormPage';



import { TeacherLeavePage }
  from '../pages/teacher-leave/TeacherLeavePage';

import TeacherLeaveDetailPage
  from '../pages/teacher-leave/TeacherLeaveDetailPage';

import { TeacherProfilePage }
  from '../pages/teachers/TeacherProfilePage';

import { TeacherProfileDetailPage }
  from '../pages/teachers/TeacherProfileDetailPage';

// =========================================================
// TEACHER NOTES
// =========================================================

import TeacherNotesPage
  from '../pages/teacher-notes/TeacherNotesPage';

import TeacherNotesDetailPage
  from '../pages/teacher-notes/TeacherNotesDetailPage';

import TeacherNoteViewPage
  from '../pages/teacher-notes/TeacherNoteViewPage';

import TeacherNoteFormPage
  from '../pages/teacher-notes/TeacherNoteFormPage';

// =========================================================
// TEACHER HACKERRANK
// =========================================================

import TeacherHackerrankTeachersPage
  from '../pages/teacher-hackerrank/TeacherHackerrankTeachersPage';

import TeacherHackerrankPage
  from '../pages/teacher-hackerrank/TeacherHackerrankPage';

import TeacherHackerrankFormPage
  from '../pages/teacher-hackerrank/TeacherHackerrankFormPage';

import TeacherHackerrankResultsPage
  from '../pages/teacher-hackerrank/TeacherHackerrankResultsPage';

import TeacherHackerrankStudentResultPage
  from '../pages/teacher-hackerrank/TeacherHackerrankStudentResultPage';

// =========================================================
// STUDENT MANAGEMENT
// =========================================================

import { StudentListPage } from '../pages/students/StudentListPage';
import { StudentProfileDetailPage } from '../pages/students/StudentProfileDetailPage';
import { StudentDetailPage } from '../pages/students/StudentDetailPage';

import { AdmissionsPage } from '../pages/students/AdmissionsPage';
import { EnrollmentsPage } from '../pages/students/EnrollmentsPage';
import { StudentSchedulePage } from '../pages/students/StudentSchedulePage';
import { MarkAttendancePage } from '../pages/students/MarkAttendancePage';
import { StudentAttendancePage } from '../pages/students/StudentAttendancePage';
import { StudentAttendanceDetailPage } from '../pages/students/StudentAttendanceDetailPage';
import { StudentAssignmentsPage } from '../pages/students/StudentAssignmentsPage';

import { ExamsPage } from '../pages/students/ExamsPage';
import { ResultsPage } from '../pages/students/ResultsPage';
import { ResultDetailPage } from '../pages/students/ResultDetailPage';
import { StudentPerformancePage } from '../pages/students/StudentPerformancePage';
import { AtRiskStudentsPage } from '../pages/students/AtRiskStudentsPage';
import { StudentQueriesPage } from '../pages/students/StudentQueriesPage';

import { FeesPage } from '../pages/students/FeesPage';
import { PaymentsPage } from '../pages/students/PaymentsPage';
import { CertificatesPage } from '../pages/students/CertificatesPage';

// =========================================================
// GENERAL MANAGEMENT
// =========================================================

import { CreateAcademicPage } from '../pages/general/CreateAcademicPage';
import { CalendarPage } from '../pages/general/CalendarPage';
import { AnnouncementsPage } from '../pages/general/AnnouncementsPage';
import { CollegeStudentEmailsPage } from '../pages/general/CollegeStudentEmailsPage';

// =========================================================
// AUXILIARY ADMIN PAGES
// =========================================================

import { ProfilePage }
  from '../pages/profile/ProfilePage';


import { NotFoundPage }
  from '../pages/notFound/NotFoundPage';

// =========================================================
// APP ROUTES
// =========================================================

export const AppRoutes: React.FC = () => {
  return (
    <Routes>

      {/* =====================================================
          ROOT
      ===================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/admin/students/list"
            replace
          />
        }
      />

      {/* =====================================================
          PUBLIC AUTH ROUTES
      ===================================================== */}

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />
      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />

      {/* =====================================================
          PROTECTED ADMIN CONSOLE
      ===================================================== */}

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >

        {/* ===================================================
            ADMIN ROOT
        =================================================== */}

        <Route
          index
          element={
            <Navigate
              to="/admin/students/list"
              replace
            />
          }
        />


        {/* ===================================================
            STUDENT MANAGEMENT
        =================================================== */}

        <Route
          path="students"
          element={
            <Navigate
              to="/admin/students/list"
              replace
            />
          }
        />

        <Route
          path="students/list"
          element={<StudentListPage />}
        />

        <Route
          path="students/:studentId"
          element={<StudentDetailPage />}
        />

        <Route
          path="students/profile/:studentId"
          element={<StudentProfileDetailPage />}
        />

        <Route
          path="students/admissions"
          element={<AdmissionsPage />}
        />

        <Route
          path="students/enrollments"
          element={<EnrollmentsPage />}
        />

        <Route
          path="students/schedule"
          element={<StudentSchedulePage />}
        />

        <Route
          path="students/mark-attendance"
          element={<MarkAttendancePage />}
        />

        <Route
          path="students/attendance"
          element={<StudentAttendancePage />}
        />

        <Route
          path="students/attendance/:studentId"
          element={<StudentAttendanceDetailPage />}
        />

        <Route
          path="students/assignments"
          element={<StudentAssignmentsPage />}
        />

        <Route
          path="students/exams"
          element={<ExamsPage />}
        />

        <Route
          path="students/results"
          element={<ResultsPage />}
        />

        <Route
          path="students/results/:studentId"
          element={<ResultDetailPage />}
        />

        <Route
          path="students/:studentId/results"
          element={<ResultDetailPage />}
        />

        <Route
          path="students/:studentId/results/:resultId"
          element={<ResultDetailPage />}
        />

        <Route
          path="students/performance"
          element={<StudentPerformancePage />}
        />

        <Route
          path="students/at-risk"
          element={<AtRiskStudentsPage />}
        />

        <Route
          path="students/queries"
          element={<StudentQueriesPage />}
        />

        {/* ===================================================
            GENERAL MANAGEMENT
        =================================================== */}

        <Route
          path="academic"
          element={<CreateAcademicPage />}
        />

        <Route
          path="academic/create"
          element={<CreateAcademicPage />}
        />

        <Route
          path="calendar"
          element={<CalendarPage />}
        />

        <Route
          path="announcements"
          element={<AnnouncementsPage />}
        />

        <Route
          path="student-emails"
          element={<CollegeStudentEmailsPage />}
        />

        {/* ===================================================
            TEACHER MANAGEMENT
        =================================================== */}

        <Route
          path="teachers"
          element={
            <Navigate
              to="/admin/teachers/profiles"
              replace
            />
          }
        />

        <Route
          path="teachers/new"
          element={<TeacherFormPage />}
        />

        <Route
          path="teachers/applications"
          element={
            <Navigate
              to="/admin/teachers/profiles"
              replace
            />
          }
        />

        {/* ===================================================
            TEACHER HACKERRANK
        =================================================== */}

        {/* Base HackerRank route */}

        <Route
          path="teachers/hackerrank"
          element={<TeacherHackerrankTeachersPage />}
        />

        {/* Teacher HackerRank Dashboard */}

        <Route
          path="teachers/hackerrank/:teacherId"
          element={<TeacherHackerrankPage />}
        />

        {/* Create HackerRank Challenge */}

        <Route
          path="teachers/hackerrank/:teacherId/create"
          element={<TeacherHackerrankFormPage />}
        />

        {/* Edit HackerRank Challenge */}

        <Route
          path="teachers/hackerrank/:teacherId/edit/:challengeId"
          element={<TeacherHackerrankFormPage />}
        />

        {/* HackerRank Results */}

        <Route
          path="teachers/hackerrank/:teacherId/results/:challengeId"
          element={<TeacherHackerrankResultsPage />}
        />

        {/* Individual Student Result */}

        <Route
          path="teachers/hackerrank/:teacherId/results/:challengeId/student/:resultId"
          element={<TeacherHackerrankStudentResultPage />}
        />

        {/* ===================================================
            TEACHER DETAIL
        =================================================== */}

        <Route
          path="teachers/:teacherId"
          element={<TeacherDetailPage />}
        />

        <Route
          path="teachers/:teacherId/edit"
          element={<TeacherFormPage />}
        />

        {/* ===================================================
            TEACHER ATTENDANCE
        =================================================== */}

        <Route
          path="teachers/attendance"
          element={<TeacherAttendancePage />}
        />

        <Route
          path="teachers/attendance/:teacherId"
          element={<TeacherAttendanceDetailPage />}
        />

        {/* ===================================================
            TEACHER CLASSES
        =================================================== */}

        <Route
          path="teachers/classes"
          element={<TeacherClassesPage />}
        />

        <Route
          path="teachers/classes/:teacherId"
          element={<TeacherClassesDetailPage />}
        />

        <Route
          path="teachers/classes/:teacherId/create"
          element={<TeacherClassFormPage />}
        />

        <Route
          path="teachers/classes/:teacherId/edit/:classId"
          element={<TeacherClassFormPage />}
        />

        {/* ===================================================
            TEACHER LEAVE
        =================================================== */}

        <Route
          path="teachers/leave"
          element={<TeacherLeavePage />}
        />

        <Route
          path="teachers/leave/:teacherId"
          element={<TeacherLeaveDetailPage />}
        />

        {/* ===================================================
            TEACHER PROFILES
        =================================================== */}

        <Route
          path="teachers/profiles"
          element={<TeacherProfilePage />}
        />

        <Route
          path="teachers/profile"
          element={
            <Navigate
              to="/admin/teachers/profiles"
              replace
            />
          }
        />

        <Route
          path="teachers/profile/:teacherId"
          element={<TeacherProfileDetailPage />}
        />

        {/* ===================================================
            TEACHER NOTES
        =================================================== */}

        <Route
          path="teachers/notes"
          element={<TeacherNotesPage />}
        />

        <Route
          path="teachers/notes/:teacherId"
          element={<TeacherNotesDetailPage />}
        />

        <Route
          path="teachers/notes/:teacherId/new"
          element={<TeacherNoteFormPage />}
        />

        <Route
          path="teachers/notes/:teacherId/create"
          element={<TeacherNoteFormPage />}
        />

        <Route
          path="teachers/notes/:teacherId/edit/:noteId"
          element={<TeacherNoteFormPage />}
        />

        <Route
          path="teachers/notes/view/:noteId"
          element={<TeacherNoteViewPage />}
        />
        <Route
          path="teachers/notes/:teacherId/view/:noteId"
          element={<TeacherNoteViewPage />}
        />

        {/* ===================================================
            AUXILIARY ADMIN PAGES
        =================================================== */}


        <Route
          path="profile"
          element={<ProfilePage />}
        />


        {/* ===================================================
            ADMIN 404
        =================================================== */}

        <Route
          path="404"
          element={<NotFoundPage />}
        />

        <Route
          path="*"
          element={<NotFoundPage />}
        />

      </Route>

      {/* =====================================================
          GLOBAL CATCH-ALL
      ===================================================== */}

      <Route
        path="*"
        element={<NotFoundPage />}
      />

    </Routes>
  );
};