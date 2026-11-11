# Dudex Smart Academy — production readiness

Three Vite + React apps share one Supabase project:

| Portal | Folder | Who uses it |
|---|---|---|
| Admin | `D:\dudex-admin-website` | Administrators |
| Teacher | `D:\dudex-teacher-portal` | Faculty |
| Student | `D:\dudex_student_portal_new` | Students |

## Status (verified 2026-10-22)

- All three portals type-check and produce production builds (`npm run build`).
- `supabase/tests/role_simulation_test.sql` runs every database operation the
  portals perform as admin, teacher and student under RLS — **83/83 checks pass
  on the live project**, including security checks (students can't read answer
  keys, other students' data, or self-verify; teachers can't provision accounts).
  The script ends with a deliberate error so all its changes roll back.
- Migrations applied to the live project: 047–052 (see `supabase/migrations`).
- `supabase/setup/dudex_full_setup.sql` recreates the whole database on a new
  project (tested twice on an empty Postgres).

## How the portals connect

```
Admin  ──creates──▶ colleges, departments, batches, subjects, student roster,
                    teachers (invite-teacher Edge Function), announcements, exams
Teacher ─publishes─▶ live classes, notes (+files), MCQ/coding/HackerRank
                    assessments, announcements, attendance (+codes)
Student ─reads─────▶ all of the above for their class; takes quizzes (graded on
                    the server), submits code / HackerRank results, marks
                    attendance with a code
Teacher ─reviews───▶ coding submissions and HackerRank results → results table
Admin  ─sees───────▶ everything (results, submissions, attendance, leave, fees)
```

## Before going live — your checklist

1. **Hosting**: each folder is a static SPA. Build command `npm run build`,
   output `dist`. `vercel.json` (Vercel) and `public/_redirects` (Netlify) are
   included so deep links refresh correctly.
2. **Environment variables** (in each host's settings, not in git):
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` (admin) / `VITE_SUPABASE_PUBLISHABLE_KEY` (teacher, student) = the project's anon/publishable key.
   - `VITE_TEACHER_PORTAL_URL` (admin) = the teacher portal URL shown on teacher profiles.
   - Never put the service-role key in any portal.
3. **Edge Function secrets** (Supabase → Edge Functions → Secrets):
   - `ALLOWED_ORIGINS` = your admin portal's production URL (e.g. `https://admin.example.com`).
     Localhost on any port is always allowed for development.
   - `TEACHER_PORTAL_URL` = the teacher portal's production URL (the welcome email links to its `/login`).
   - `RESEND_API_KEY` = an API key from https://resend.com (used to email teachers their temporary password).
   - `MAIL_FROM` = the sender, e.g. `Dudex Smart Academy <no-reply@your-domain.com>`. The domain must be verified in Resend.
   Without these two, Add Faculty still works, but the admin is shown the temporary password once to pass on.
4. **Auth → URL Configuration**: set the Site URL and add each portal's
   production URL and its `/reset-password` page to the redirect allow-list.
5. **Auth → SMTP Settings**: configure a real sender. Supabase's built-in mailer
   only sends a few emails per hour (student OTPs, teacher invitations, resets).
6. **First accounts**: admins sign in normally. Teachers are created from
   Admin → Faculty (Add Faculty): the account gets a temporary password that is
   emailed to the teacher. On first sign-in the teacher must choose a permanent
   password; later they can change it in Profile or use "Forgot password?" on
   the sign-in page. "Resend Temporary Password" on a teacher's profile issues a
   new one. Students must first be added to the college
   roster (Admin → College Student Emails), then register in the student portal.
7. **Source control & backups**: none of the three folders is a git repository.
   Put each under git before deploying, and enable Supabase backups (PITR).

## Moving to a new Supabase project

Run `supabase/setup/dudex_full_setup.sql` in the new project's SQL Editor, then
follow the "AFTER RUNNING" notes at the end of that file (first admin, Edge
Function deploy, Auth URLs, SMTP, portal `.env`).

## Known limitations (by design today)

- **Coding assessments**: there is no code-execution server. Students submit
  code; teachers review it and enter a score (Teacher → Coding → Review), which
  publishes the result. "Run Code" in the student portal says so honestly.
- **HackerRank**: students self-report their score with a screenshot; the
  owning teacher verifies or rejects it (Teacher → HackerRank → Review).
- **Teacher self check-in attendance** is not implemented (admin records teacher
  attendance instead).
- Several admin screens keep a browser cache for speed; the database is the
  source of truth and is re-read on load.
- Bundle sizes are ~1–1.5 MB (gzip 250–390 KB). Fine for production; route-level
  code splitting would improve first load further.
