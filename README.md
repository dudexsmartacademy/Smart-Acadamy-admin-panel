# Smart-Acadamy-admin-panel

A comprehensive institutional administration portal for **DudeX Smart Academy**, built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Supabase**. It provides administrative control over academic colleges, degree departments, student enrollments, faculty provisioning, live classes, exams, fee management, certifications, announcements, and faculty leave requests.

Part of the **DudeX Smart Academy** platform ecosystem, designed to operate in tandem with the [Teacher Portal](https://github.com/dudexsmartacademy/Smart-Acadamy-Teacher-panel) and [Student Portal](https://github.com/dudexsmartacademy/Smart-Acadamy-Student-panel-).

---

## ✨ Features & Functional Modules

| Module | Description |
|---|---|
| **Executive Dashboard** | Institutional overview of enrolled students, active faculty, batch distributions, fee collections, and platform metrics |
| **College & Campus Directory** | Multi-institution directory with branch management, affiliation details, and campus contact tracking |
| **Academic Batches & Classes** | Configure degree years, batch allocations (Batch 1–5), sections, and class session schedules |
| **Student Roster & Admissions** | Manage eligible student email rosters, review admission inquiries, and oversee active cohort enrollments |
| **Faculty Management** | Faculty directory, profile auditing, subject assignments, and secure onboarding with automated invitation dispatch |
| **Faculty Leave & Attendance** | Review advance faculty leave requests (approve/reject), manage 90-day attendance records, and automatically reconcile curriculum calendars |
| **Live Classes Orchestration** | Schedule institutional webinars, masterclasses, and lecture sessions with Google Meet/Zoom integration and batch targeting |
| **Academic Calendar** | Institutional milestones, exam schedules, lecture blocks, and holiday calendar with cross-portal synchronization |
| **Curriculum Notes & Study Materials** | Review and curate faculty-published study materials, syllabi, and multi-file attachments |
| **Examinations & Results** | Manage MCQ question banks, HackerRank coding challenges, student scorecard evaluations, and grade reports |
| **Certification Engine** | Generate and issue verified digital completion certificates with secure storage |
| **Announcements & Circulars** | Broadcast priority bulletins, notifications, and timetables to specific cohorts, faculty, or students |
| **Fee Management** | Track fee structures, student payment statuses, receipts, and revenue summaries |
| **Activity & Audit Logs** | Comprehensive audit trail logging administrator, teacher, and student activities across the academy |

---

## 🛠 Tech Stack

- **Frontend Framework** — [React 19](https://react.dev/)
- **Programming Language** — [TypeScript](https://www.typescriptlang.org/)
- **Build Tool** — [Vite 6](https://vite.dev/) with Fast Refresh
- **Styling** — [Tailwind CSS](https://tailwindcss.com/) + Custom DudeX Theme Engine
- **Icons** — [Lucide React](https://lucide.dev/)
- **Charts & Visualizations** — [Recharts](https://recharts.org/)
- **Backend & Database** — [Supabase](https://supabase.com/) (PostgreSQL 15, Auth, Row Level Security, Storage, Realtime)
- **Deployment** — [Vercel](https://vercel.com/) (SPA Routing, Secure HTTP Headers)

---

## 🏗 Architecture & Ecosystem Flow

```
Admin Portal (dudex-admin-website)
   │
   ├─► Supabase Auth (Admin RBAC Security Definitions)
   │
   ├─► PostgreSQL Database (Centralized Schema)
   │    ├── student_email_roster      (Verified student whitelist)
   │    ├── teacher_profiles          (Faculty database & assignments)
   │    ├── teacher_leave_requests    (Leave workflows & review decisions)
   │    ├── teacher_attendance        (Faculty daily attendance records)
   │    ├── live_classes              (Synchronized live placement lectures)
   │    ├── calendar_events           (Campus-wide milestones & holidays)
   │    ├── announcements             (Targeted multi-role bulletins)
   │    ├── notifications             (Push notifications)
   │    └── external_assessment_submissions (HackerRank scorecards)
   │
   ├─► Supabase Storage Buckets
   │    ├── certificates              (Generated student certificates)
   │    ├── academy-notes             (Curriculum reference files)
   │    └── hackerrank-results        (Student score verification screenshots)
   │
   └─► Supabase Realtime Channels     (Immediate cross-portal sync with Teacher & Student panels)
```

---

## 📋 Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- A **Supabase** project configured with the DudeX Smart Academy schema (migrations located in `supabase/migrations/`)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/dudexsmartacademy/Smart-Acadamy-admin-panel.git
cd Smart-Acadamy-admin-panel
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Configure your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

> ⚠️ **Security Notice**: Never commit `.env` or paste your `service_role` secret key into browser-facing frontend code.

### 4. Database Setup
Execute the latest migrations in order from `supabase/migrations/` in your Supabase SQL Editor:
- `045_live_portal_contracts.sql` — Portal contract definitions & admin validation functions
- `046_shared_portal_rls.sql` — Shared RLS policies across portals
- `065_fix_announcements_and_notifications_rls.sql` — Announcements & notifications sync
- `066_calendar_events_sync_and_locations.sql` — Calendar persistence & location/room columns
- `067_fix_teacher_leave_and_attendance_sync.sql` — Leave review, rejection handling & attendance sync

### 5. Start the development server
```bash
npm run dev
```
Open your browser at `http://localhost:5173` (or the indicated local port).

### 6. Build for production
```bash
npm run build
```
The compiled output is optimized and written to the `dist/` directory.

### 7. Preview production build locally
```bash
npm run preview
```

---

## 📂 Project Structure

```text
dudex-admin-website/
├── public/                     # Static brand assets, icons, manifest
├── src/
│   ├── assets/                 # SVGs, images, and brand logos
│   ├── components/             # Reusable UI component library
│   │   ├── common/             # Buttons, Modals, Badges, Tables, Inputs, Drawers
│   │   ├── layout/             # AdminHeader, AdminSidebar, GlobalSearchModal
│   │   └── teachers/           # Faculty modals, attendance selectors, invitation components
│   ├── constants/              # Storage keys, badge limits, priority levels
│   ├── context/                # AuthContext, ThemeContext, ToastContext
│   ├── data/                   # Initial fixtures, fallback demo datasets
│   ├── layouts/                # AdminLayout wrapper with responsive sidebar
│   ├── lib/                    # Supabase client (`src/lib/supabase.ts`), persistence utilities
│   ├── pages/                  # Page route views
│   │   ├── dashboard/          # Admin Dashboard with KPI summary widgets
│   │   ├── colleges/           # Multi-college management views
│   │   ├── students/           # Enrollments, Admissions, Results, Attendance
│   │   ├── teachers/           # Faculty directory, profiles, assignments, leave reviews
│   │   ├── academic/           # Batches, classes, courses, and subject structures
│   │   ├── live-classes/       # Masterclass & lecture scheduling
│   │   ├── calendar/           # Institution calendar with location/room management
│   │   ├── teacher-notes/      # Study material moderation
│   │   └── general/            # Announcements, Notifications, System Settings
│   ├── routes/                 # AppRoutes & ProtectedRoute authentication guards
│   ├── services/               # Data service modules communicating with Supabase
│   │   ├── teacherLeaveService.ts       # Leave approval, rejection & reversion
│   │   ├── teacherAttendanceService.ts  # Daily faculty attendance tracking
│   │   ├── announcementService.ts       # Broadcast notifications
│   │   ├── studentService.ts            # Student roster and performance records
│   │   └── teacherService.ts            # Faculty profiles & onboarding
│   ├── types/                  # TypeScript interface contracts & database definitions
│   └── utils/                  # File parsers, grade calculators, formatters
├── supabase/
│   ├── migrations/             # SQL schema migrations (045 through 067)
│   └── tests/                  # Security regression & role simulation tests
├── .env.example                # Template for environment variables
├── .gitignore                  # Git ignore rules (securing .env, node_modules, dist)
├── index.html                  # HTML template entry point
├── package.json                # Project dependencies and script declarations
├── tailwind.config.js          # Tailwind CSS styling configuration
├── tsconfig.json               # TypeScript compiler configuration
├── vercel.json                 # Vercel SPA routing and header configuration
└── vite.config.js              # Vite bundler configuration
```

---

## 🌐 Deployment (Vercel)

The application is pre-configured with `vercel.json` for automatic Single Page Application (SPA) routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

To deploy via the Vercel CLI:
```bash
npm install -g vercel
vercel
```
Or import the repository directly into your [Vercel Dashboard](https://vercel.com/dashboard) and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Project Settings → Environment Variables**.

---

## 📜 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts the Vite local development server with HMR |
| `npm run build` | Compiles TypeScript and builds production bundles to `dist/` |
| `npm run preview` | Locally serves the production `dist/` build |
| `npm run lint` | Runs Oxlint for code quality and syntax auditing |

---

## 🧩 Related Repositories

| Repository | Description |
|---|---|
| **[Smart-Acadamy-Teacher-panel](https://github.com/dudexsmartacademy/Smart-Acadamy-Teacher-panel)** | Faculty dashboard for class sessions, attendance heatmap, daily notes, MCQ/coding tests, and leave requests |
| **[Smart-Acadamy-Student-panel-](https://github.com/dudexsmartacademy/Smart-Acadamy-Student-panel-)** | Student portal for attending classes, accessing materials, taking assessments, and viewing scorecards |

---

## 📄 License

This software is private and proprietary to **DudeX Smart Academy**.
