# Dudex Smart Academy integration and security rollout

## Current status: do not apply the old migrations

The admin, teacher, and student portals are configured for the same Supabase project. The live database was inspected previously and does **not** match the teacher portal migration schema. In particular:

- `public.profiles.role` is the current text-based role source, and `public.user_roles` is a view over profiles.
- The live project has different assessment, attendance, student-profile, and teacher-profile columns from migrations 042–044.
- The live project does not contain `student_email_roster` or the `provision_teacher_account` RPC expected by current portal code.
- The role audit found no users with multiple role rows, but one `teacher_profiles` record has no matching `teacher` role in `profiles`. Its account identity and role must be confirmed by an authorized administrator.
- Two `auth.users` insert triggers currently create/update profiles. One trigger trusts `raw_user_meta_data.role`; the other inserts a default `student` role. Signup must be consolidated into one non-escalating path.
- The prior catalog output reports that `anon` can select `public.user_roles`. The view uses `security_invoker`, but broad underlying `profiles` policies can still expose role/profile data; the effective access needs retesting after policy replacement.
- RLS is enabled on the audited core tables, but permissive policies are OR-combined. The catalog includes broad authenticated access on sensitive tables such as profiles, assessment questions/options, student attempts, attendance sessions, and teacher leave requests; broad assessment, attendance, and live-class policies; and public-write policies on academic reference tables. Adding narrower policies alone will not restrict these accesses.
- The catalog audit showed table CRUD grants to `anon` and `authenticated` on most of the 53 audited public tables. Grants must be assessed together with each table's RLS status and policies.
- The prior schema snapshot reports that `student_profiles` uses text-based academic fields and lacks `college_id`/`department_id`, while `teacher_profiles` lacks migration-required faculty/college/department IDs. It also reports absent `course_offerings`, `questions`, `student_answers`, and `grading_rules`, plus different live MCQ/attendance models. The existing registration/provisioning/assessment migrations therefore need redesign, not just policy edits.

Do **not** apply `042_student_email_roster.sql`, `043_auth_rbac_hardening.sql`, or `044_secure_rpc_authorization.sql` to this project as written. Do not run `supabase db push` against production. They assume tables, columns, functions, and role types that do not match the inspected live schema. The catalog audit was read-only; no production database changes were made.
The database password previously posted in this conversation should be rotated in the Supabase dashboard and must not be reused or pasted into source code, CLI commands, or chat.

## 1. Run the read-only schema audit

Open [`supabase/audit_live_schema.sql`](./supabase/audit_live_schema.sql) in the Supabase SQL Editor. Run its numbered `SELECT` statements individually. The audit returns schema metadata, policy/function/trigger definitions, and aggregate role-conflict counts; it does not return application user rows or modify the database.

Keep the output for sections 1–17. Do not share database passwords, API keys, service-role keys, user rows, or unredacted function definitions that contain secrets. These results are needed before authoring role-specific policies or changing table names/relationships in the portals.

Resolve the existing teacher/profile role mismatch using an administrator-approved account decision before enforcing role constraints. Do not infer or silently rewrite a person's role from profile data.

## 2. Migration and policy plan

The Supabase CLI is not available in the current environment, so no live database query or write was performed in this session. Migrations [`045_live_portal_contracts.sql`](./supabase/migrations/045_live_portal_contracts.sql) and [`046_shared_portal_rls.sql`](./supabase/migrations/046_shared_portal_rls.sql) are drafts based on the supplied schema snapshot, not production-ready migrations. Do not run either against production.

Migrations 042–044 are not a valid base. The supplied schema snapshot informed migration 045, but the complete live policy/function catalog is still required before authoring the remaining RLS changes:

1. Preserve the live schema and keep `profiles.role` as the single role source unless a separately approved migration moves every portal together.
2. Fix signup/profile triggers so client-supplied Auth metadata cannot grant `admin` or `teacher`, and do not create incomplete profile rows.
3. Design the roster and teacher provisioning contracts against actual live columns. Use trusted server-side operations for Auth user creation; never put a service-role key in a browser app.
4. Replace broad permissive policies with tested `admin`, assigned-`teacher`, and own-record `student` policies. PostgreSQL permissive policies combine with OR; adding a narrow policy does not cancel an existing broad one.
5. Use a safe student assessment view/RPC that never exposes correct answers. Submit and grade attempts through an authorized server-side operation.
6. Create a staging migration with catalog assertions and non-destructive DDL, apply it only to a local/staging database with synthetic data, and run role-based tests as student, teacher, and admin before production rollout.

Do not copy policies from migrations 042–044 as a shortcut. Production rollout remains blocked until the complete live schema, policy, grant, trigger, and function definitions have been audited; the migrations have been reconciled to that catalog; and staging role-isolation tests pass.

Required preparation sequence:

- Run the numbered read-only statements in [`audit_live_schema.sql`](./supabase/audit_live_schema.sql) individually and retain the results.
- Reconcile every migration reference to actual table columns, constraints, relationships, triggers, function bodies, grants, and existing RLS policies.
- Apply the reconciled migrations to an isolated staging project with synthetic users first. Verify direct API access and each relevant workflow as student, teacher, and admin before production.

Migration 046 is especially high risk: it drops every policy on every public base table and on `storage.objects`, changes grants, and then rebuilds only a subset of role-specific workflows. It also assumes columns and relationships whose presence has not been confirmed from the supplied snapshot, including note publication/archive fields. A successful SQL parse is not proof that its PL/pgSQL compiles, that it matches the live catalog, or that it preserves portal workflows.

Do not apply migrations 045 or 046 until they have been reconciled and tested in staging. The verification scripts [`verify_045_live_portal_contracts.sql`](./supabase/verify_045_live_portal_contracts.sql) and [`verify_046_shared_portal_rls.sql`](./supabase/verify_046_shared_portal_rls.sql) check for expected objects; they do not validate every application workflow or prove role isolation. Do not run migrations 042–044.

## 3. Portal integration findings to resolve

All three portal builds currently point at the same project host, but sharing a project URL alone does not make their workflows compatible. The portal code still has schema and persistence mismatches:

- Student signup/eligibility and admin roster management expect `student_email_roster`, which is absent from the supplied live schema. Migration 045 adds that table with admin-only RLS, an eligibility RPC bound to the verified signed-in student's email, and an atomic student registration RPC. See [`AuthContext.tsx`](../dudex_student_portal_new/src/context/AuthContext.tsx) and [`collegeStudentEmailService.ts`](./src/services/collegeStudentEmailService.ts).
- Student OTP signup can create an Auth user before roster eligibility is checked. The client denies portal access if the check fails, but the account may remain without a usable student profile; the eligibility RPC and signup trigger contract must be implemented and tested together.
- Admin teacher provisioning expects `provision_teacher_account` and a `faculty_id` field that are absent. Migration 045 adds the field and an admin-only provisioning RPC; it requires the Auth account to exist before assigning the teacher role. See [`teacherService.ts`](./src/services/teacherService.ts).
- Teacher MCQ assessment defaults, student sample MCQ/coding content, sample calendar events, and academic fallback catalogs have been disabled. Admin teacher-class demo records have also been removed.
- Admin teacher-class create/edit/delete actions remain disabled until the required RLS policies are verified. The class reader maps only database values and reports query failures.
- Teacher class lists and dashboards now read the verified live class, membership, and live-session columns without browser-local fallback records or fabricated metrics. In the live schema, `live_classes.teacher_id` references `profiles.id`; required session fields include `title`, `teacher_name`, `subject`, `topic`, `date`, `start_time`, `end_time`, and `meeting_url`. The service no longer assumes the stale `description`, `meeting_platform`, or `course_offering_id` columns. Class metadata is read-only in the teacher portal; live-session scheduling binds writes to the signed-in teacher profile. Production RLS policies for these reads and writes have not been audited, so the workflow is not yet production-security verified.
- The student notes page now builds subject filters from loaded notes, clears stale notes and reports fetch failures, and no longer displays fabricated attachment sizes or reading times. Downloads report failures instead of always showing success.
- Student profile changes now require verified, successful Supabase updates before app state or the UI reports success; profile photos no longer rely on browser-local storage, and the profile page no longer displays a fabricated `Batch 1`.
- Admin teacher profile/status updates now check database results before changing the cache or reporting success. Teacher email edits are not written directly to `profiles`, because Auth email changes require a verified Auth flow. Teacher creation no longer populates fabricated demographic defaults and requires the database record to be readable after provisioning. The teacher directory no longer merges browser-only teacher records or assumes a missing status means active; its delete controls now deactivate records instead of issuing unverified hard deletes.
- Teacher self-attendance and admin teacher-attendance history views are paused rather than showing generated 90-day or browser-local data. Admin dashboards and other analytics still need a complete schema-backed review; do not treat the portals as fully integrated or rely on their current local state as authoritative.
- Several services optimistically write to in-memory/localStorage state and then ignore failed Supabase writes. Make these operations await the database result and report errors before treating the change as persisted.
- The MCQ RPC in migration 044 now rejects repeated question IDs before scoring, but that migration still assumes tables/functions absent from the live schema and remains unsafe to apply there.

The three Supabase client initializers now reject missing/placeholder configuration rather than silently connecting to a dummy URL. Use only the project's public anon/publishable key in each portal's deployment environment.

Migration 045 does not repair the existing permissive policies on profiles, assessment data, attendance, classes, results, storage, or other existing tables. Do not interpret a successful execution of that migration as proof of full portal integration or role isolation. Run the read-only catalog audit, author role-specific replacement policies from its exact output, then verify direct API access as student, teacher, and admin.

## 4. Staging, Auth, and email rollout

Before production:

1. Use a local Supabase CLI stack or an isolated preview branch of the existing project, if enabled. Do not create a separate Supabase project or copy production student records; use synthetic accounts and data.
2. Apply only the reviewed migration to that isolated environment, then test direct API access and UI flows using separate student, teacher, and admin accounts.
3. In **Authentication → Providers → Email**, configure confirmation and password-reset behavior. Configure a verified SMTP sender in Supabase; keep SMTP credentials in Supabase settings, never Vite variables.
4. In **Authentication → URL Configuration**, use each deployed portal's exact reset/callback URLs. Avoid broad wildcard redirects.
5. Verify registration, email confirmation, password reset, role denial, and mail delivery in staging before production.

### Admin-issued teacher invitations

The admin portal calls the `invite-teacher` Edge Function. It validates the caller's active admin role, upserts the teacher in `public.allowed_emails`, creates or locates the Auth account, assigns the teacher profile through `provision_teacher_account`, and sends the invitation/password setup email to the teacher portal. The function never generates or emails a password. Teacher self-signup remains disabled; the student portal's student-role and roster gate remains unchanged.

The database setup used by this function must provide `public.allowed_emails` with `email`, `role`, `full_name`, `status`, and `created_by` columns, and a unique constraint/index usable by `ON CONFLICT (email)`. The table must not allow anonymous or ordinary authenticated users to add or change allow-list entries; the Edge Function writes it with the server-only service-role key. The existing `provision_teacher_account` RPC must remain admin-checked and must create/update `profiles` and `teacher_profiles` for the same account.

Deploy the function from the admin portal's Supabase project directory after linking the shared project:

```powershell
supabase login
supabase link --project-ref aekrexelgkualdtczwmt
supabase secrets set TEACHER_PORTAL_URL=https://teacher.yourdomain.com ALLOWED_ORIGINS=https://admin.yourdomain.com
supabase functions deploy invite-teacher --project-ref aekrexelgkualdtczwmt
```

Replace the example URLs with the exact production portal origins. For local development, append the exact admin localhost origin to `ALLOWED_ORIGINS`; do not use `*`. Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into the Edge Function runtime—never put the service-role key in a portal environment.

In Supabase Dashboard:

1. Confirm `public.allowed_emails` has the columns and unique email constraint above, and only the trusted Edge Function/service role can write it.
2. Confirm `provision_teacher_account` is executable by the authenticated admin caller and validates `is_admin()` before changing a role.
3. Under **Authentication → URL Configuration**, allow the exact teacher portal `/reset-password` callback URL.
4. Under **Authentication → SMTP Settings**, configure a verified sender and production SMTP credentials.
5. Deploy the function, then test an admin invitation, an existing-account setup-email resend, a non-admin denial, and a student login denial. Confirm the invitation email's link lands on the teacher portal and permits setting the password.

## 5. Target permission matrix

This is the intended least-privilege contract for the shared database, not a claim about current production access. Effective permissions remain **unverified** until the complete live grants and policy predicates can be read and role-tested. `No` means direct table CRUD is denied; where an operation is required, it must use an audited, role-checked RPC or server-side workflow.

| Data area | Admin: read / insert / update / delete | Teacher: read / insert / update / delete | Student: read / insert / update / delete |
|---|---|---|---|
| `profiles` | All / trusted account workflow / approved non-role fields / no direct delete | Self and assigned learners' minimum display fields / no / own approved contact fields / no | Own profile / no / own approved contact fields only / no |
| `teacher_profiles` | All / trusted provisioning workflow / approved fields and status / no direct delete | Own profile / no / own allowed fields / no | Public teacher-directory fields only / no / no / no |
| `student_profiles` | All / approved enrollment workflow / approved enrollment/status fields / no direct delete | Assigned learners' minimum academic fields / no / no / no | Own record / no / own allowed portfolio/contact fields only; not role, status, roster, or enrollment IDs / no |
| Academic reference data (`colleges`, `departments`, `batches`, `sections`, `classes`, `subjects`, offerings) | Read all / yes / yes / controlled soft-delete only | Assigned records / no / no / no | Records needed for own enrollment and published learning / no / no / no |
| Classes and memberships | Read all / yes / yes / controlled soft-delete only | Assigned classes / no / no class-metadata edits until a verified workflow exists / no | Own memberships and enrolled classes / no / no / no |
| `live_classes` | Read all / yes / yes / cancel or archive; no hard delete | Assigned/owned sessions / own assigned sessions / own sessions only / cancel or archive; no hard delete | Published sessions for own enrollment / no / no / no |
| Attendance sessions and records | Read all / audited administrative correction workflow / audited correction workflow / no direct delete | Assigned classes and records / assigned session only / own assigned records via correction workflow / no | Own attendance only / no / no / no |
| Assessments, questions, options | Read all / yes / yes / controlled archival | Assigned assessments / assigned assessments / own assigned assessments / controlled archival | Published safe questions only; never answer keys / attempt RPC only / no direct scoring or answer-key edits / no |
| Attempts, answers, results | All / trusted grading or correction workflow / trusted correction workflow / no direct delete | Assigned classes, submissions, and results / grading workflow / assigned grading workflow / no direct delete | Own attempts/results only / submit-attempt RPC only / no direct scoring updates / no |
| Notes, announcements, notifications | All / yes / yes / controlled archival | Assigned/published content / own assigned content / own authored content / no direct delete | Published/assigned content and own notifications / no / own notification-read state only / no |
| Activity and audit logs | Read all / system only / no updates / no deletes | Own audit-safe subset only if explicitly required / no / no / no | No access / no / no / no |
| Storage objects | Authorized buckets only; admin operation through reviewed policy | Own/assigned objects only | Own/published objects only | No cross-user access |

## 6. Staging validation and rollback

1. Snapshot the live catalog using `supabase/audit_live_schema.sql`; include the new RLS-disabled-table/grant and function-grant checks once the 403 is resolved. Store schema/policy definitions, not student rows or credentials.
2. Build a local Supabase database or approved staging environment with synthetic users and records. Do not create another production project or copy real student data.
3. Author a schema-asserting migration that replaces named broad policies and corrects Auth triggers only after matching the captured catalog. Keep changes transactional where PostgreSQL supports it; avoid data deletes and role rewrites.
4. Use separate student, teacher, and admin JWTs through the actual Data API and each portal. Assert positive and negative CRUD for every matrix row, including cross-student reads, unassigned teacher reads/writes, forged signup role metadata, profile updates, and status revocation.
5. Run the admin, teacher, and student builds/lints, then smoke-test sign-in, OTP/confirmation, password reset, live classes, attendance, notes, assessments, results, notifications, and teacher provisioning against staging. Verify failed writes are visible and do not mutate local UI state.
6. Before any production rollout, export the pre-migration function/trigger/policy/grant definitions and test a rollback on staging. Rollback restores the captured definitions and grants, but must not silently restore broad policies. Preserve all production rows; do not delete or rewrite the mismatched teacher account without an administrator decision.

The current production policy matrix cannot be filled with verified CRUD permissions while the 403 remains and full catalog output is unavailable. Re-run the role-conflict aggregates and policy audit after staging validation. No production SQL migration, policy change, profile-role change, or SMTP test was performed.
