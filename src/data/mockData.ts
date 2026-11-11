import {
  Teacher,
  TeacherApplication,
  TeacherCourse,
  TeacherClass,
  TeacherAttendance,
  TeacherLeave,
  TeacherAssignment,
  AssignmentSubmission,
  ActivityLog,
  NotificationItem,
  AdminProfile,
  SystemSettings,
  Student,
  StudentAdmission,
  StudentEnrollment,
  StudentAttendance,
  StudentExam,
  StudentResult,
  FeeRecord,
  PaymentTransaction,
  StudentCertificate,
  AcademicCourse,
  AcademicSubject,
  AcademicBatch,
  AcademicClass,
  Classroom,
  CalendarEvent,
  Announcement,
  CentralNotification,
  RolePermission,
  AdminUser,
  ContentSection,
  SlideBanner,
  StorageFile,
} from '../types';

export const initialAdminProfile: AdminProfile = {
  id: '',
  name: '',
  email: '',
  phone: '',
  role: 'Super Admin',
  department: 'Administration',
  joinedDate: '',
  lastLogin: '',
  twoFactorEnabled: false,
};

export const initialSettings: SystemSettings = {
  platformName: 'DUDEx Smart Academy',
  supportEmail: 'support@dudex.academy',
  contactPhone: '',
  timezone: 'Asia/Kolkata',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '12h',
  theme: 'dark',
  sidebarDefaultCollapsed: false,
};

export const initialTeachers: Teacher[] = [];
export const initialApplications: TeacherApplication[] = [];
export const initialCourses: TeacherCourse[] = [];
export const initialClasses: TeacherClass[] = [];
export const initialAttendance: TeacherAttendance[] = [];
export const initialLeaves: TeacherLeave[] = [];
export const initialAssignments: TeacherAssignment[] = [];
export const initialSubmissions: AssignmentSubmission[] = [];
export const initialActivityLogs: ActivityLog[] = [];
export const initialNotifications: NotificationItem[] = [];

export const initialStudents: Student[] = [];
export const initialAdmissions: StudentAdmission[] = [];
export const initialEnrollments: StudentEnrollment[] = [];
export const initialStudentAttendance: StudentAttendance[] = [];
export const initialExams: StudentExam[] = [];
export const initialResults: StudentResult[] = [];
export const initialFeeRecords: FeeRecord[] = [];
export const initialPayments: PaymentTransaction[] = [];
export const initialCertificates: StudentCertificate[] = [];

export const initialAcademicCourses: AcademicCourse[] = [];
export const initialAcademicSubjects: AcademicSubject[] = [];
export const initialAcademicBatches: AcademicBatch[] = [];
export const initialAcademicClasses: AcademicClass[] = [];

export const initialClassrooms: Classroom[] = [];
export const initialCalendarEvents: CalendarEvent[] = [];
export const initialAnnouncements: Announcement[] = [];
export const initialCentralNotifications: CentralNotification[] = [];
export const initialRolesPermissions: RolePermission[] = [];
export const initialAdminUsers: AdminUser[] = [];
export const initialContentSections: ContentSection[] = [];
export const initialSlideBanners: SlideBanner[] = [];
export const initialStorageFiles: StorageFile[] = [];
