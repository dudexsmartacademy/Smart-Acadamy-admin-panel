# Dudex Smart Academy — Security, QA & Production-Readiness Audit

**Date:** 2026-10-22 · **Scope:** Admin portal (`D:\dudex-admin-website`), Teacher portal (`D:\dudex-teacher-portal`), Student portal (`D:\dudex_student_portal_new`), the shared Supabase project (`aekrexelgkualdtczwmt`), its migrations, policies, storage and the `invite-teacher` Edge Function.
**Companion:** [`TEST_EXECUTION_REPORT.md`](TEST_EXECUTION_REPORT.md) (commands, counts, results).

> This audit reduces demonstrable risk; it does **not** certify the system as secure or bug-free. Everything below is labelled as verified (with how), fixed, or still open. No penetration test beyond the controlled probes listed here was performed.

---

## A. Executive summary

| Area | Result |
|---|---|
| Architecture | 3 React 19 + Vite + TypeScript SPAs (~80k lines), one shared Supabase project (53 tables, all with RLS), 1 Edge Function, SQL migrations 045–058. |
| Authorization model | Enforced in the database (RLS + `SECURITY DEFINER` RPCs), not just the UI. Verified with an 83-case role simulation and live API probes as anonymous, student and teacher users. |
| Confirmed security findings | **7 fixed and verified** (AUD-01 … AUD-07), including one exam-integrity issue and one credential-in-logs incident. |
| Open items | No automated test suites/CI, email delivery not production-ready (Resend domain + SMTP), no source control/backups verified, bundle size, lint debt. See the [roadmap](#f-remediation-roadmap). |
| Builds | All three portals type-check (0 errors) and build. `npm audit` (all deps): **0 vulnerabilities** in all three after fixes. |
| Recommendation | **Not yet production-ready.** The security posture of the data layer is good after the fixes, but go-live needs: verified email delivery, source control + CI, backups/PITR, and at least smoke-level automated tests. |

---

## B. Inventory

| Component | Stack | Notes |
|---|---|---|
| Admin portal | React 19, Vite 6, Tailwind, `@supabase/supabase-js` | 137 TS/TSX files, ~37k lines. No `lint` script, no tests. |
| Teacher portal | React 19, Vite 6, Tailwind v4, ESLint | 112 files, ~32k lines. No tests. |
| Student portal | React 19, Vite 8 (rolldown), oxlint | 94 files, ~11k lines. No tests. |
| Database | Supabase Postgres | 53 public tables (RLS on all), 7 views, ~110 functions, triggers for enrolment/auth/guards. |
| Storage | 8 buckets | `applications`, `avatars`, `avaters`, `banners`, `certificates`, `hackerrank-results`, `materials`, `notes`. |
| Edge Function | `invite-teacher` (Deno) | Admin-only teacher creation with temporary password; Resend for mail. |
| Tests that exist | `supabase/tests/role_simulation_test.sql` (83 checks) and, new, `supabase/tests/security_regression_test.sql` (9 checks). |
| Deployment | `vercel.json` / `_redirects` per portal; no CI, **no git repositories**. |

---

## C. Detailed findings register

Severity reflects exploitability × impact × data sensitivity for this project.

### AUD-01 — Exam questions readable before the exam opens · **Medium-High** · FIXED
- **Component:** `student_can_access_assessment()` and the views `student_assessment_questions`, `student_question_options`, `student_coding_problems` (+ legacy `coding_problems_student`).
- **Evidence:** rollback-only probe as the real student account: with the TEST MCQ moved to start tomorrow, the student could read **1 question and 4 options** via the API (`AUDIT_PROBE future_exam_questions_visible=1 options_visible=4`). The UI's locked "Start Test" button was the only control.
- **Impact:** any enrolled student could fetch question text/options of a scheduled exam days early (answer keys were *not* exposed; grading is server-side).
- **Root cause:** the access function checked `published` + class membership only, not `start_date`.
- **Fix:** migration `057` adds `student_can_view_assessment_content()` (requires `now() >= start_date`) and rebuilds the four views on it. Student portal now unlocks "Start Test" at the start time (matches the server, which already rejects submissions before `start_date`).
- **Verification:** dry-run then live: future exam → 0 questions/0 options; open exam → 1 question/2 options (S02, S03, S06, S07 PASS). Role simulation still 83/83.

### AUD-02 — Anonymous enumeration of students and teachers · **Medium** · FIXED
- **Component:** RPC `is_email_allowed(text)` (`SECURITY DEFINER`, granted to `anon`).
- **Evidence:** unauthenticated call returned `true` for an enrolled student's email and for an allow-listed teacher's email.
- **Impact:** anyone could confirm who studies/teaches at the academy (privacy, targeted phishing).
- **Fix:** `057` revokes EXECUTE from `PUBLIC, anon, authenticated` (no portal or trigger uses it; `service_role` keeps it).
- **Verification:** `has_function_privilege('anon', …) = false` live; S01 PASS.

### AUD-03 — Every student could read every teacher's email and phone · **Medium** · FIXED
- **Component:** policy `profiles_select`.
- **Evidence:** live as the student: 5 profile rows visible, including 4 teachers (emails, phones) who don't teach them.
- **Fix:** `057` — students see only teachers of classes they are enrolled in (`student_has_teacher()`); teachers still see all teachers (staff directory); admins unchanged. The student portal never reads teacher profiles (it uses stored `teacher_name`), so no feature depends on the wider access.
- **Verification:** live: teacher profiles visible to the student 4 → **1** (their own teacher). S04/S05/S08 PASS; portal smoke test clean.

### AUD-04 — `SECURITY DEFINER` hygiene · **Low** · FIXED
- `current_user_role()` and `get_user_role()` ran without a pinned `search_path`; `handle_new_auth_user_profile()` (unused trigger function) was executable by `anon`.
- **Fix:** `057` pins `search_path` and revokes the grant. **Verification:** S09 PASS (0 definer functions without `search_path`).

### AUD-05 — Student certificates bucket was public · **Medium** · FIXED
- `certificates` (and the misspelt `avaters`) were public buckets: files are served by URL without RLS, so the `certs_student` own-folder policy didn't protect downloads.
- **Fix:** `058` makes both private (both empty; no portal uses public URLs for them). **Verification:** live `storage.buckets.public = false`.

### AUD-06 — Credential written to Edge Function logs · **High (incident)** · CONTAINED
- While diagnosing a Resend error, a temporary log line printed the `MAIL_FROM` secret, which had been set to a Gmail app password by mistake. The value is in the `invite-teacher` logs.
- **Containment:** the logging was removed and the function redeployed (it now logs only whether `MAIL_FROM` *looks like* an address); the owner revoked the app password. `MAIL_FROM` was corrected.
- **Residual:** the revoked value remains in Supabase log retention until it ages out. Lesson captured: never log secret values, even "non-secret" config.

### AUD-07 — Vulnerable dev dependencies · **High (dev-server only)** · FIXED
- Teacher and student portals: `vite` / `launch-editor` advisories (arbitrary file read via dev server, Windows command-execution issues). Not shipped in production bundles.
- **Fix:** `npm audit fix` (vite 6.2.0→6.4.5 teacher, 8.3.0→8.3.5 student; patch-level). **Verification:** `npm audit` = 0 vulnerabilities in all three portals; type-check and builds pass. Restart the dev servers to pick up the new vite.

### Functional defects found and fixed during this engagement (verified)
| ID | Defect | Fix | Verified by |
|---|---|---|---|
| FN-01 | Student registration always failed via API: trigger ran `UPDATE … ` without `WHERE` (blocked by `pg_safeupdate`). | `055` | Registration via API succeeded; portal opened. |
| FN-02 | Registration saved wrong college; register no./phone/specialization dropped. | `054` + backfill | Row content checked live. |
| FN-03 | Admin could not assign classes; nothing linked teachers↔students. | `056` + Assigned Classes UI | Teacher saw class/student; student enrolled automatically. |
| FN-04 | **Every MCQ publish failed** ("Invalid time value" swallowed by `alert`). | IST-aware time parsing | Published live; times correct in IST. |
| FN-05 | **Students could never start a test** (brief page parsed raw timestamps). | Rewrote timing | Student took test, 1/1 scored. |
| FN-06 | Teacher attendance page ignored saved/code check-ins. | Loads saved records | Teacher saw "Present". |
| FN-07 | Teachers got reset links instead of temporary passwords; no forced change. | Edge Function + portals | Function live; email delivery blocked (AUD-11). |
| FN-08 | Admin reload always redirected to Students list. | Honour `from` in login | Reload stays on page. |
| FN-09 | Hard-coded data: "2 Active" badge, "DudeX Academy" college, `localhost:5174`. | Real values/config | Visual check. |

### Open findings
| ID | Severity | Finding | Next action |
|---|---|---|---|
| AUD-08 | Medium | No unit/integration/E2E tests in any portal; no CI. Regressions (e.g. FN-04, FN-05) shipped unnoticed. | Add Vitest + Playwright smoke suites; run the two SQL suites in CI against a staging project. |
| AUD-09 | Medium (ops) | Email not production-ready: Resend domain unverified (temporary passwords not delivered; admin fallback works); Supabase built-in SMTP rate-limits OTPs (HTTP 429 observed). | Verify a domain in Resend; configure custom SMTP in Supabase Auth. |
| AUD-10 | Medium (ops) | No git repositories; backups/PITR, monitoring and alerting not verified. | `git init` + remote, enable PITR, set up log alerts. |
| AUD-11 | Low | Teacher first-sign-in (forced password change) not verified end-to-end. | Re-test once email delivery works (code path type-checked; flag set server-side confirmed). |
| AUD-12 | Low | `invite-teacher` CORS always allows `localhost:*` (also in production). Not a security boundary (JWT + admin check), but unnecessary. | Gate the localhost rule behind an env flag. |
| AUD-13 | Low | `applications` bucket accepts anonymous uploads with no MIME allow-list. | Set `allowed_mime_types` (pdf/images) and consider a captcha on the public form. |
| AUD-14 | Low | Teacher portal ESLint: 41 errors (unused vars, `any`, set-state-in-effect). | Clean up incrementally. |
| AUD-15 | Low | Single JS bundles 1.0–1.5 MB (no code-splitting). | Route-level `lazy()` imports. |
| AUD-16 | Info | Legacy views `coding_problems_student`, `mcq_questions_student` unused (now time-gated). | Drop in a future migration. |
| AUD-17 | Not tested | Supabase Auth settings (password length policy, leaked-password protection, OTP expiry) are dashboard settings, not inspected. Client minimum is 6 chars. | Review Auth → Policies; raise minimum to ≥ 8. |

---

## D. Security report

**Authentication.** Supabase Auth for all portals; each portal re-checks the role server-side after sign-in (teacher: `user_roles` + active `teacher_profiles`; student: roster + `student_profiles`; admin: `is_admin()`). The signup trigger ignores client-supplied role metadata (role-sim F00). Teachers now get admin-issued temporary passwords and must change them on first sign-in; password reset via email link. Only `anon` keys exist in env files and bundles (verified by decoding every JWT found); no `service_role`/secret keys and no source maps in `dist`.

**Authorization / permission matrix (verified).**
| Actor | Allowed (verified) | Denied (verified) |
|---|---|---|
| Anonymous | Read colleges/departments (registration); insert pending admissions/teacher applications | All 20 sensitive tables (42501), admin RPCs, roster RPC, invite function (401), inserting an `approved` admission, roster/teacher enumeration (after AUD-02) |
| Student | Own profile/attendance/results/fees; class content within window; mark attendance with a valid code; one attempt per exam | Changing own role/status/average score (guard triggers), granting roles, inserting results/attendance, inserting payments or marking fees paid, creating classes/announcements, joining classes, starting attendance codes, re-submitting, invite function (403), other teachers' contact data (after AUD-03), exam content before start (after AUD-01) |
| Teacher | Own classes, their students, own assessments/results, attendance codes for assigned classes | Other teachers' assessments/classes, unassigned students (role-sim T-series) |
| Admin | Everything via `is_admin()` policies | — |
The 83-check role simulation covers admin/teacher/student/second-teacher/second-student isolation (create, read, update, delete paths) and passes before and after the fixes.

**Database.** RLS enabled on 53/53 public tables. Policies with `USING (true)` are SELECT-only on reference data (colleges, courses, subjects, batches, settings, banners). Public INSERT policies are constrained (`status='pending'`, reviewer/conversion fields null). All `SECURITY DEFINER` functions now pin `search_path`. Five student views intentionally run as definer and are filtered by access functions (verified definitions).

**Storage.** Private: applications, certificates, avaters, hackerrank-results, materials, notes. Public by design: avatars, banners (writes limited to own folder / admins).

**Secrets.** Secrets only in Supabase Edge Function secrets. One incident (AUD-06) contained. Env files are not in source control (there is no source control — AUD-10).

**Dependencies.** 0 known vulnerabilities after AUD-07 (all deps, all portals).

**Not performed:** network-level/TLS testing, load/DoS testing, third-party penetration test, brute-force testing of Auth endpoints (Supabase-managed rate limits not exercised).

---

## E. Change log (this audit)

| File | Change | Verified by |
|---|---|---|
| `supabase/migrations/057_security_audit_fixes.sql` (new, applied live) | AUD-01/02/03/04 | Dry-run probe, live checks, SECTEST 9/9, role-sim 83/83 |
| `supabase/migrations/058_private_certificate_buckets.sql` (new, applied live) | AUD-05 | Live bucket flags |
| `supabase/setup/dudex_full_setup.sql` | Sections 15h (057) and private buckets | Static review |
| `supabase/tests/security_regression_test.sql` (new) | Regression tests S01–S09 | Run live: 9 pass, 0 fail |
| `supabase/functions/invite-teacher/index.ts` | No secret values in logs (AUD-06); deployed | Deploy + log check |
| `D:\dudex_student_portal_new\src\pages\mcq-assessments\AssessmentDetailsPage.tsx` | Unlock at start time (AUD-01 UI) | tsc, build |
| Teacher/Student `package-lock.json` | `npm audit fix` (AUD-07) | `npm audit` 0, tsc, build |

Earlier in the same engagement (see FN table): migrations 054–056 and the temporary-password feature (Edge Function, admin and teacher portal files) — documented in `PRODUCTION.md`.

**Manual steps for the owner:** restart dev servers (new vite); verify a Resend domain and set `MAIL_FROM`; configure Supabase SMTP; review Auth password policy.

---

## F. Remediation roadmap
1. **Email delivery** (AUD-09) — verify Resend domain; custom SMTP for Auth. Then re-test AUD-11.
2. **Source control, CI, backups** (AUD-10) — git + remote, CI running type-check/build/`npm audit` and both SQL suites against a staging project; enable PITR.
3. **Automated tests** (AUD-08) — Playwright smoke per portal (sign-in, registration, MCQ publish → attempt → result, attendance code); Vitest for date/time and grading helpers.
4. **Auth policy review** (AUD-17), **upload hardening** (AUD-13), **CORS gating** (AUD-12).
5. **Quality/performance** — lint debt (AUD-14), code-splitting (AUD-15), drop legacy views (AUD-16).

---

## G. Production-readiness checklist

| Item | Status | Evidence |
|---|---|---|
| Builds reproducible (all portals) | PASS | `vite build` ×3 |
| Type safety | PASS | `tsc` 0 errors ×3 |
| Lint clean | FAIL | Teacher ESLint 41 errors; admin has no linter |
| Dependency vulnerabilities | PASS | `npm audit` 0 ×3 |
| No privileged keys in clients | PASS | Env + bundle JWT decode: `anon` only |
| RLS on all tables | PASS | 53/53 |
| Role isolation (admin/teacher/student/anon) | PASS | Role-sim 83/83, live probes |
| Exam content gated by schedule | PASS | SECTEST S02–S07 |
| Storage access control | PASS | Policies + bucket flags |
| Edge Function authN/authZ | PASS | 401 anon, 403 student, admin-only |
| Email delivery (teacher passwords, OTP) | BLOCKED | Resend domain unverified; SMTP not configured |
| Teacher first-sign-in flow | BLOCKED | Needs email delivery / sign-in |
| Automated test suites / CI | FAIL | None exist |
| Source control | FAIL | No git repositories |
| Backups / PITR / restore drill | NOT TESTED | Dashboard setting not inspected |
| Monitoring & alerting | NOT TESTED | — |
| Rollback procedure | NOT TESTED | Migrations are forward-only; no down scripts |
| Load / performance testing | NOT TESTED | Bundle size noted (AUD-15) |
| Accessibility | NOT TESTED | — |
| Payment gateway | NOT APPLICABLE | No gateway/webhook integration in any portal |
| Fee ledger integrity | PASS | Only admins write `fee_records`/`payment_transactions`; student insert → 42501, student "mark paid" → 0 rows |
| Operational docs | PASS | `PRODUCTION.md`, this report |
