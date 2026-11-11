export const STORAGE_KEYS = {
  ADMIN_AUTH: 'dudex_admin_auth',
  ADMIN_PROFILE: 'dudex_admin_profile',
  TEACHERS: 'dudex_teachers',
  TEACHER_APPLICATIONS: 'dudex_teacher_applications',
  TEACHER_COURSES: 'dudex_teacher_courses',
  TEACHER_CLASSES: 'dudex_teacher_classes',
  TEACHER_SCHEDULE: 'dudex_teacher_schedule',
  TEACHER_ATTENDANCE: 'dudex_teacher_attendance',
  TEACHER_ASSIGNMENTS: 'dudex_teacher_assignments',
  TEACHER_ASSIGNMENT_SUBMISSIONS: 'dudex_teacher_assignment_submissions',
  TEACHER_PERFORMANCE: 'dudex_teacher_performance',
  TEACHER_LEAVE: 'dudex_teacher_leave',

  // Phase 2: Student & Academic Management Keys
  STUDENTS: 'dudex_students',
  ADMISSIONS: 'dudex_student_admissions',
  ENROLLMENTS: 'dudex_student_enrollments',
  STUDENT_ATTENDANCE: 'dudex_student_attendance',
  EXAMS: 'dudex_student_exams',
  RESULTS: 'dudex_student_results',
  FEES: 'dudex_student_fees',
  PAYMENTS: 'dudex_student_payments',
  CERTIFICATES: 'dudex_student_certificates',
  STUDENT_QUERIES: 'dudex_student_queries',

  // Shared Academic Entities
  ACADEMIC_COURSES: 'dudex_academic_courses',
  ACADEMIC_SUBJECTS: 'dudex_academic_subjects',
  ACADEMIC_BATCHES: 'dudex_academic_batches',
  ACADEMIC_CLASSES: 'dudex_academic_classes',

  // Phase 3: General Management & Operations Keys
  CLASSROOMS: 'dudex_classrooms',
  CALENDAR_EVENTS: 'dudex_calendar_events',
  ANNOUNCEMENTS: 'dudex_announcements',
  CENTRAL_NOTIFICATIONS: 'dudex_central_notifications',
  ROLES_PERMISSIONS: 'dudex_roles_permissions',
  ADMIN_USERS: 'dudex_admin_users',
  CONTENT_SECTIONS: 'dudex_content_sections',
  SLIDE_BANNERS: 'dudex_slide_banners',
  STORAGE_FILES: 'dudex_storage_files',

  ACTIVITY_LOGS: 'dudex_activity_logs',
  SETTINGS: 'dudex_settings',
  NOTIFICATIONS: 'dudex_notifications',
  THEME: 'dudex_theme_preference',
  GRADE_CONFIG: 'dudex_grade_configuration',
} as const;

// Admin credentials are managed exclusively through Supabase Authentication.
// No default credentials are stored in code.

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Artificial Intelligence & Data Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Management & Business Studies',
  'Applied Sciences & Mathematics',
];

export const DESIGNATIONS = [
  'Professor & Head of Dept',
  'Associate Professor',
  'Assistant Professor',
  'Senior Lecturer',
  'Lead AI Research Instructor',
  'Visiting Faculty',
  'Technical Lab Instructor',
];

export const SUBJECTS_MAP: Record<string, string[]> = {
  'Computer Science & Engineering': [
    'Advanced Data Structures',
    'Design & Analysis of Algorithms',
    'Full Stack Web Development',
    'Operating Systems',
    'Database Management Systems',
    'Cloud Computing & DevOps',
  ],
  'Artificial Intelligence & Data Science': [
    'Machine Learning Systems',
    'Deep Neural Networks',
    'Natural Language Processing',
    'Computer Vision Foundations',
    'Big Data Analytics',
    'Reinforcement Learning',
  ],
  'Information Technology': [
    'Cyber Security & Cryptography',
    'Network Architecture',
    'Distributed Systems',
    'Mobile Application Development',
  ],
  'Applied Sciences & Mathematics': [
    'Discrete Mathematics',
    'Linear Algebra & Numerical Methods',
    'Applied Probability & Statistics',
  ],
  'Management & Business Studies': [
    'Tech Entrepreneurship',
    'Product Management',
    'Business Analytics',
  ],
};

export const BATCHES = [
  '2023-2027 (Batch A)',
  '2023-2027 (Batch B)',
  '2024-2028 (Batch Alpha)',
  '2024-2028 (Batch Beta)',
  '2025-2029 (Batch Prime)',
];

export const ROOMS = [
  'Tech Lab A-101',
  'AI Research Hub B-204',
  'Quantum Auditorium',
  'Lecture Hall 3',
  'Virtual Studio 1 (Online)',
  'Virtual Studio 2 (Online)',
  'Computing Cluster 402',
];

export const FEE_PLANS = [
  'Annual Lump Sum (5% Discount)',
  'Semester Installments (2x/Year)',
  'Quarterly Installments (4x/Year)',
  'Merit Scholarship Waiver (50%)',
  'Full Institutional Scholarship (100%)',
];
