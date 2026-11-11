# Test Execution Report — Dudex Smart Academy

**Date:** 2026-10-22 · **Environment:** Windows 11, Node 22.16, local Vite dev servers (student :5173, teacher :5176, admin :5177) against the **live** Supabase project `aekrexelgkualdtczwmt`. SQL suites run in the Supabase SQL Editor; every SQL test ends with a deliberate error so all changes roll back.
Main report: [`SECURITY_QA_AUDIT_REPORT.md`](SECURITY_QA_AUDIT_REPORT.md).

**Labels:** *Automated* = scripted run with recorded result · *Manual* = driven in the browser pane and observed · *Static* = code/config review only.

## 1. Build, type-check, lint, dependency audit (Automated)

| Portal | Command | Baseline | After fixes |
|---|---|---|---|
| Admin | `npx tsc -p tsconfig.json --noEmit` | 0 errors | 0 errors |
| Admin | `npx vite build` | ✓ (1.55 MB JS) | ✓ |
| Admin | `npm audit` | 0 | 0 |
| Admin | lint | no linter configured | — |
| Teacher | `npx tsc -b` | 0 errors | 0 errors |
| Teacher | `npx eslint .` | 41 errors, 4 warnings | unchanged (open AUD-14) |
| Teacher | `npx vite build` | ✓ (1.07 MB JS) | ✓ |
| Teacher | `npm audit` | 2 high (vite, launch-editor) | **0** (`npm audit fix`) |
| Student | `npx tsc -b` | 0 errors | 0 errors |
| Student | `npx oxlint` | warnings only | warnings only |
| Student | `npx vite build` | ✓ (1.06 MB JS) | ✓ |
| Student | `npm audit` (all deps) | 2 high (vite, launch-editor), 1 moderate (source-map-js) | **0** (`npm audit fix`) |

Unit/integration/E2E suites: **none exist** in any portal (0 tests to run) — recorded as open finding AUD-08.

## 2. Database test suites (Automated, live, rolled back)

| Suite | File | Before fixes | After fixes |
|---|---|---|---|
| Role simulation (admin / 2 teachers / 2 students; CRUD isolation, guards, RPCs) | `supabase/tests/role_simulation_test.sql` | **83 pass, 0 fail** | **83 pass, 0 fail** |
| Security regression (new; AUD-01…04) | `supabase/tests/security_regression_test.sql` | — (would fail S01–S03, S05, S09) | **9 pass, 0 fail** |

Security regression cases: S01 anon cannot call `is_email_allowed` · S02/S03 future-exam questions/options hidden · S04 student sees own teacher · S05 student cannot see unrelated teacher · S06/S07 open-exam questions/options visible · S08 teachers still see teachers · S09 all definer functions pin `search_path`.

## 3. Static database security queries (Automated SQL)

| Check | Result |
|---|---|
| Public tables without RLS | 0 of 53 |
| `anon` write grants | INSERT on `admissions`, `teacher_applications` only; policies force `status='pending'` and null reviewer/conversion fields |
| `USING (true)` policies | SELECT-only, reference tables |
| Definer functions executable by `anon` | 2 before (`is_email_allowed`, `handle_new_auth_user_profile`) → 0 after |
| Definer functions without `search_path` | 2 before → 0 after |
| Definer views | 5; definitions reviewed — all filtered by access functions; now time-gated |
| Storage buckets | 2 public buckets holding personal data before (`certificates`, `avaters`) → 0 after |

## 4. Live API probes (Automated, real endpoints)

**Anonymous client** (fresh `anon` session): 20 sensitive tables → all `42501`; `colleges` 0 rows, `departments` 3 rows (needed for registration); `admin_dashboard_counts` → denied; `get_my_student_roster_profile` → denied; `invite-teacher` → **401**; insert `admissions{status:'approved'}` → denied; `is_email_allowed` → returned `true` for real student/teacher (**AUD-02**, fixed → now denied).

**Student session** (`allaishahinayathulla@…`):
| Attempt | Result |
|---|---|
| Set own `profiles.role = 'admin'` | Blocked by guard trigger |
| Change own `status` / `average_score` | Blocked by guard trigger |
| Insert `user_roles` admin row | 42501 |
| Insert attendance / announcement / class / class membership | 42501 (RLS) |
| Update own attendance | 0 rows |
| Insert payment / mark fee paid | 42501 / 0 rows |
| `start_attendance_code_session` | "not assigned to this class" |
| Re-submit completed MCQ | "No attempts remaining" |
| `invite-teacher` | **403** |
| Read teacher profiles | 4 before (**AUD-03**) → 1 after |
| Read future-exam questions (rolled-back probe) | 1 q + 4 options before (**AUD-01**) → 0 after |

## 5. Functional end-to-end flows (Manual, browser pane, live data)

| Flow | Result | Notes |
|---|---|---|
| Admin: add student emails to roster (single/CSV) | PASS | earlier in engagement |
| Student: OTP verify → registration → portal | PASS | after FN-01/FN-02 fixes |
| Admin: assign class to teacher → auto-enrolment | PASS | 1 student enrolled |
| Teacher: generate attendance code → student checks in → both portals show it | PASS | after FN-06 |
| Teacher: create & publish MCQ | PASS | after FN-04 (previously every publish failed) |
| Student: see, start, submit MCQ | PASS | after FN-05; server-graded 1/1 |
| Teacher: result visible (Results, Students) | PASS | |
| Admin: add faculty → temporary password | PASS (account + fallback display) | Email **BLOCKED** (Resend domain unverified, HTTP 403) |
| Teacher: first sign-in forced password change | BLOCKED | needs delivered password / user sign-in |
| Teacher: forgot password / profile change password | NOT TESTED end-to-end | code reviewed (Static) |
| Post-fix smoke: student Assessments/Results/Attendance/Dashboard; teacher Students/Results/Dashboard | PASS | 0 failed requests |
| All screens sweep (admin 26, teacher 31 routes, student 9 views) | PASS | 0 failed requests/console errors (earlier in engagement) |

## 6. Not executed / limitations
- No load, stress or DoS testing (out of scope for a live shared project).
- No browser-matrix, mobile, or accessibility testing.
- Supabase Auth dashboard settings (password policy, rate limits, OTP expiry) not inspected.
- Backups/PITR, monitoring and restore not verified (no dashboard access path used).
- Email delivery blocked on Resend domain verification and SMTP configuration.
- Dev servers still run the previous vite version until restarted.
