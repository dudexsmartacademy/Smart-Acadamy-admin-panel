# Before-live vs Current — Three-Panel Comparison

**Date:** 2026-10-26 · **Type:** read-only audit. No code, database or deployment was changed while producing this report.

## 1. Versions compared

| Panel | Before-live (GitHub) | Current (local, not on GitHub) |
|---|---|---|
| Admin | `dudexsmartacademy/Frontend-admin-panel` @ `96447f5` (2026-10-14, single commit "Initial admin panel implementation") | `D:\dudex-admin-website` |
| Teacher | `dudexsmartacademy/Frontend-Teacher-Panel` @ `b296e6c` (2026-10-15, single commit) | `D:\dudex-teacher-portal` |
| Student | `dudexsmartacademy/Frontend-Student-Panel` @ `66b5014` (2026-10-15, single commit) | `D:\dudex_student_portal_new` |

Before-live repos were cloned with `git clone` into a scratch folder outside the projects. The current folders are **not git repositories**, so the comparison is a direct file-tree diff (content hash per file, line endings normalised), not `git diff`.

**Limitations**
- The before-live panels run on browser `localStorage` demo data and are not connected to Supabase, so "missing" below means *a capability the old UI offered* that the current UI no longer offers. The old capability only ever saved to the browser.
- Several current files were edited on **23–24 Oct** by someone other than this audit, after the last runtime sweep: admin `teacherClassService.ts`, `TeacherClasses*Page.tsx`, `AssignedClassesSection.tsx`; teacher `TeacherAttendance.tsx`, `liveClassService.ts`. Those files were reviewed statically only (marked UNVERIFIED at runtime).
- The admin folder contains `.v1_repos/`, an older copy of all three before-live repos (~440 files). It was excluded from the comparison.
- The Supabase dashboard was not signed in during this audit, so no live database checks were run.

## 2. Change statistics

| Panel | Files before | Files now | Added | Removed | Modified | Unchanged | `src/` added / removed / modified |
|---|---|---|---|---|---|---|---|
| Admin | 144 | 662* | 519* | 1 | 88 | 55 | 10 / 1 / 86 |
| Teacher | 177 | 227 | 51 | 1 | 90 | 86 | 5 / 1 / 85 |
| Student | 117 | 166 | 49 | 0 | 38 | 79 | 3 / 0 / 36 |

\* includes `.v1_repos` (438 files) and tooling (`.agents/skills`, `supabase/.temp`).

**Removed source files:** admin `src/data/teacherAttendanceDemo.ts` (demo data); teacher `src/pages/classes/ClassDetails.tsx` (route `/classes/:id` now uses `ClassDashboard`).

**Added source files:**
- **Admin:** `lib/supabase.ts`, `ResetPasswordPage.tsx`, `AssignedClassesSection.tsx`, `TemporaryPasswordNotice.tsx`, `classAssignmentService.ts`, `teacherInvitationService.ts`, `emailNotificationService.ts`, `teacherNoteService.ts`, `fileImportParser.ts`, `database.types.ts`.
- **Teacher:** `ResetPassword.tsx`, `announcementService.ts`, `codingAssessmentService.ts`, `communicationService.ts`, `hackerrankService.ts`.
- **Student:** `ResetPassword.tsx`, `academicService.ts`, `eligibilityService.ts`.

**Routes and menus:** no route or sidebar entry was removed in any panel. Added: `/reset-password` in admin and teacher. Renamed: teacher sidebar "My Attendance" → "Faculty Self-Attendance".

## 3. Features present before-live but missing or broken now

| # | Panel | Feature (before-live) | Current status | Evidence | Severity |
|---|---|---|---|---|---|
| M1 | Admin | Teacher attendance detail: **Mark Present**, **Apply Leave** for a teacher, **Edit** a day's record, **Export** CSV | **REMOVED.** The page is now a read-only history (2,505 → 229 lines; 36 → 2 interactive controls). `teacherAttendanceService.recordAttendance` / `updateAttendance` still exist but no page calls them. | `pages/teacher-attendance/TeacherAttendanceDetailPage.tsx` | High |
| M2 | Admin | Create / edit / delete a teacher's live class from Teacher Classes | **BROKEN** (changed 24 Oct, not runtime-verified). `createClass` attaches the session to whichever `classes` row comes first (`.limit(1)`), not the chosen class. It converts `teacher_id` to a `teacher_profiles.id`, while the schema's foreign key points to `profiles(id)`, so inserts are expected to fail. It uses a placeholder meet link. Failures are only `console.warn`, so the UI shows success. Edit/delete use a random local id that never matches the database row. | `services/teacherClassService.ts:140-244` | High |
| M3 | Admin | Class form saves | **INCOMPLETE.** The form still shows "Class changes are paused … This form will not save changes" while its submit now calls the service in M2. | `pages/teacher-classes/TeacherClassFormPage.tsx:303` | Medium |
| M4 | Teacher | Live Classes list: **Delete** a session | **REMOVED.** No delete button or handler in any live-class page; the service has no delete. | `pages/live-classes/LiveClasses.tsx` (8 → 0 controls) | Medium |
| M5 | Teacher | Self-attendance page: **Mark Present**, **Edit** a day, **Export CSV** | **MODIFIED / partly removed.** Check-in/check-out moved to the dashboard card (saved to `teacher_attendance`). Leave requests are new and save to `teacher_leave_requests`. **Editing a past day and CSV export no longer exist.** | `pages/attendance/TeacherAttendance.tsx` (1,046 → 410 lines), `components/dashboard/TeacherAttendanceCard.tsx` | Low |
| M6 | Teacher | **Create Class** / **Edit Class** forms (title, schedule, meet link, description) | **MODIFIED by design.** Create redirects to Create Live Class; Edit is read-only ("managed centrally"). Classes are now assigned by the admin. | `pages/classes/CreateClass.tsx` (redirect), `EditClass.tsx` | Info |
| M7 | Student | Profile: **Save College Details** (editable college/degree/batch) | **MODIFIED by design.** College details are read-only because they come from the admin roster and registration. Personal details remain editable ("Save Personal Details"). | `pages/profile/ProfilePage.tsx` | Info |
| M8 | Admin | Teacher note view: "Note Information" panel | **MODIFIED.** Layout simplified; attachments still shown when present. | `pages/teacher-notes/TeacherNoteViewPage.tsx` | Info |

**Checked and NOT missing:**
- **Renamed, not removed:**
  - Admin teacher edit/suspend → `updateTeacherRecord` / `setTeacherStatus`.
  - Results create/edit/delete → `recordStudentResult` / `updateStudentResult` / `deleteStudentResult`.
  - Average score recalculation is now a database trigger.
- **Never used:** v1's `deleteTeacher` had no callers.
- **Never existed in either version:** a student attendance-correction screen.
- **Removed on purpose:**
  - Teacher self-signup (accounts are now admin-created).
  - All demo/mock data (`mockData.ts`, `initial*` arrays) — the expected replacement by live data.

## 4. Panel-by-panel feature checklist

Status meanings: **WORKING** = route and features present, runtime-verified in earlier sessions with no errors · **MODIFIED** = changed behaviour · **REMOVED** · **BROKEN** · **INCOMPLETE** · **UNVERIFIED** = changed after the last runtime check.

### Admin
| Module | Status |
|---|---|
| Login, forgot/reset password | WORKING (reset page ADDED) |
| Students: directory, profile/dossier, admissions, enrollments, schedule, mark attendance, attendance, assignments, exams, results, performance, at-risk, queries | WORKING (student dossier crash fixed in the previous audit) |
| Academic setup, calendar, announcements, student mail IDs (roster + batch assignment) | WORKING / MODIFIED (roster batch ADDED) |
| Teachers: profiles, add faculty (temporary password), applications, HackerRank, leave, notes | WORKING / MODIFIED (temporary-password flow ADDED; email delivery blocked on Resend domain) |
| Teacher attendance (list + detail) | **REMOVED** write actions (M1) |
| Teacher classes: assigned classes | ADDED; UNVERIFIED after 24 Oct edits |
| Teacher classes: live sessions create/edit/delete | **BROKEN** (M2) / INCOMPLETE (M3) |

### Teacher
| Module | Status |
|---|---|
| Login (password/OTP), reset password, forced first-login password change | WORKING / ADDED |
| Dashboard, students, subjects, results, performance, at-risk, exports, notifications, calendar, profile | WORKING |
| MCQ create → publish → results | WORKING (publish and timezone bugs fixed earlier) |
| Coding, HackerRank, notes, materials, announcements, communication | WORKING / MODIFIED (moved to Supabase services) |
| Student attendance + attendance codes | WORKING |
| Faculty self-attendance & leave | MODIFIED (M5); UNVERIFIED after 24 Oct edits |
| Classes create/edit | MODIFIED (M6) |
| Live classes | WORKING for create/list; **Delete REMOVED** (M4); UNVERIFIED after 24 Oct edits |

### Student
| Module | Status |
|---|---|
| Landing, OTP verify, registration (roster name, degree, batch), reset password | WORKING / ADDED |
| Dashboard, live classes, daily notes, attendance, mark attendance (code), assessments (MCQ/coding/HackerRank), results, help | WORKING |
| Profile | MODIFIED (M7) |

## 5. Security / database / cross-panel notes
Covered in depth in `SECURITY_QA_AUDIT_REPORT.md` (migrations 057/058 applied on 2026-10-22). New in this comparison:
- **M2** risks writing live sessions to the **wrong class**, if the foreign key allows the insert. Students of an unrelated class would then see that session. This is a cross-panel data-placement issue.
- The before-live panels kept everything in `localStorage` with no server-side checks. The current panels enforce access in the database (RLS), a strict improvement.

## 6. Tests performed

| Test | Result |
|---|---|
| File-tree diff (hash per file) for all 3 panels | PASSED (ran; results above) |
| Route / sidebar comparison | PASSED (no removals) |
| Interactive-surface comparison per modified page | PASSED (ran; flagged pages listed) |
| Exported service-function comparison | PASSED (ran; renames vs removals resolved) |
| Runtime check of files changed 23–24 Oct | NOT RUN (browser not signed in to Supabase, read-only scope) |
| Live database FK check for M2 | NOT RUN (dashboard not signed in); based on schema dump `live_classes_teacher_id_fkey → profiles(id)` |

## 7. Prioritised fixes (not applied — need your go-ahead)

| Priority | Fix | Files | Acceptance criteria |
|---|---|---|---|
| High | M2: create the live session for the **selected** class and the teacher's `profiles.id`; use the inserted row's id; surface errors instead of `console.warn`; drop the placeholder link | `src/services/teacherClassService.ts`, `TeacherClassFormPage.tsx` | Created session appears under the right class in teacher and student portals; edit/delete change the same row; a failing insert shows an error |
| High | M1: restore admin Mark Present / Apply Leave / Edit / Export on the teacher attendance detail page, using the existing `recordAttendance` / `updateAttendance` | `TeacherAttendanceDetailPage.tsx` | Admin can mark and edit a teacher's day; teacher sees it under My Attendance; CSV downloads |
| Medium | M3: remove the "paused / will not save" banner once M2 is fixed | `TeacherClassFormPage.tsx` | Banner gone; save works end to end |
| Medium | M4: add Delete for live sessions (teacher owns the row) | teacher `liveClassService.ts`, `LiveClasses.tsx` | Teacher deletes own session; it disappears for students |
| Low | M5: optional edit/export for faculty self-attendance | teacher `TeacherAttendance.tsx` | CSV export of own history |

## 7a. Fix status (2026-10-26)

| # | Status | What changed | Verified (live, admin + teacher sessions) |
|---|---|---|---|
| M1 | **FIXED** | Admin teacher-attendance detail: Mark Present/Late/Half Day/Absent for any date, Apply Leave (date range, Sundays skipped), Edit (status, check-in/out, remarks), Export CSV. Service writes are now real upserts on `(teacher_id, date)` that surface errors (no phantom `localStorage` records, no invented "09:00 AM" times). Approving a leave request now records every day of the leave, not just the first. | Mark → row saved as Admin; Edit → Late + 05:00 PM saved; Leave 8–11 Oct → 3 days; CSV with all rows; the same rows appear in the teacher's My Attendance. Test rows deleted afterwards. Leave-*approval* path: type-checked only. |
| M2 | **FIXED** | Admin live-class create/edit/delete write the real `live_classes` columns, for the class the admin picks from the teacher's **assigned classes**, with the teacher's login id; use the database row id; surface errors. Form reads its own fields (it previously read non-existent element ids), uses start/end time inputs and a required meeting link. Detail page got Schedule/Edit/Delete and a rules-of-hooks fix. | Create → correct `class_id`, `teacher_id`, fields; visible in the teacher portal; not visible to a student of another class. Edit → same row updated, status kept. Delete → row removed. |
| M3 | **FIXED** | "Paused / will not save" banner removed; a hint appears only when the teacher has no assigned classes. | Form shows no banner. |
| M4 | **FIXED** | Teacher Live Classes: Delete button + `deleteLiveClass` (own rows only). | Teacher deleted own session; deleting another teacher's session was refused (service and raw API). |

**New finding (pre-existing, not caused by these fixes):** on a *full page reload* of admin detail pages (teacher classes, teacher profile), data takes ~25–30 s to appear and pages show "Loading…" / "not found" meanwhile. Navigating inside the app is fast. Not investigated further.

## 8. Verdict
**NOT READY.** The current panels keep every route and menu of the before-live version and add real backend persistence, authentication and security. But two admin features from the first version are missing or broken (teacher attendance management; live-class create/edit/delete), and teacher live-class delete is gone. The files changed on 23–24 Oct also need a runtime re-check.
