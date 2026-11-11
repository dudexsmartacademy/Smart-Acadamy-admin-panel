export type TeacherStatus = 'active' | 'on-leave' | 'suspended' | 'unknown';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'visiting';
export type Gender = 'male' | 'female' | 'other' | 'prefer-not-to-say' | 'Male' | 'Female' | 'Other';

export interface Teacher {
  id: string;
  teacherId: string; // e.g. TCH-2024-001
  fullName: string;
  avatar?: string;
  email: string;
  phone: string;
  dob?: string;
  gender?: Gender;
  address?: string;
  
  // Professional
  department: string;
  designation: string;
  qualification: string;
  experienceYears?: number;
  joiningDate?: string;
  employmentType?: EmploymentType;
  primarySubject?: string;
  skills?: string[];
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  notes?: string;

  // Account
  loginEmail: string;
  status: TeacherStatus;
  
  // Computed / Relations
  assignedCourseIds: string[];
  assignedClassIds: string[];
  totalStudentsHandled?: number;
  attendanceRate?: number; // e.g., 96.5%
  rating?: number; // 4.8
  userId?: string;
  tempId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'converted';

export interface TeacherApplication {
  id: string;
  applicationNumber: string;
  fullName: string;
  email: string;
  phone: string;
  dob?: string;
  gender?: Gender;
  address?: string;
  department: string;
  qualification: string;
  experienceYears: number;
  requestedSubject: string;
  skills: string[];
  resumeUrl?: string;
  portfolioUrl?: string;
  coverLetter?: string;
  status: ApplicationStatus;
  appliedDate: string;
  reviewedDate?: string;
  reviewerNotes?: string;
  convertedTeacherId?: string;
}

export interface TeacherCourse {
  id: string;
  code: string;
  name: string;
  department: string;
  category: string;
  credits: number;
  batch: string;
  academicYear: string;
  teacherId: string;
  teacherName?: string;
  totalStudents: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'completed';
  description?: string;
}

export interface TeacherClass {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  batch: string;
  section: string;
  room: string;
  mode: 'online' | 'offline' | 'hybrid' | 'unknown';
  date: string;
  startTime: string;
  endTime: string;
  studentCount: number | null;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled' | 'unknown';
  meetLink?: string;
  /** classes.id for older class-targeted sessions. */
  classId?: string;
  /** Global batch names whose students see the session. */
  batches?: string[];
  /** Session topic / agenda. */
  topic?: string;
}

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'on_leave'
  | 'holiday'
  | 'missing_punch'
  | 'excused'
  | 'not_applicable'
  | 'not_marked'
  | 'Present'
  | 'Absent'
  | 'Late'
  | 'Excused'
  | 'Not Applicable'
  | 'Not Marked';

export interface TeacherAttendance {
  id: string;
  teacherId: string;
  teacherName: string;
  facultyId: string;
  department: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  durationMinutes: number;
  status: AttendanceStatus;
  remarks?: string;
  recordedBy: string;
  updatedAt: string;
}

export type LeaveType = 'casual' | 'sick' | 'medical' | 'annual' | 'maternity' | 'paternity' | 'unpaid' | 'special';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface TeacherLeave {
  id: string;
  teacherId: string;
  teacherName: string;
  department: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  submittedDate: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewRemarks?: string;
}

export type AssignmentStatus = 'draft' | 'published' | 'closed' | 'expired' | 'Draft' | 'Published' | 'Closed' | 'Expired';

export interface TeacherAssignment {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseName: string;
  subject: string;
  batch: string;
  assignedDate: string;
  dueDate: string;
  totalMarks: number;
  attachmentUrl?: string;
  status: AssignmentStatus;
  studentCount: number;
  submissionsCount: number;
  gradedCount: number;
  lateSubmissionsCount: number;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  submittedAt: string;
  status: 'submitted' | 'graded' | 'late' | 'pending';
  marksObtained?: number;
  feedback?: string;
}

export interface TeacherPerformance {
  teacherId: string;
  teacherName: string;
  department: string;
  classesConducted: number;
  classesScheduled: number;
  totalStudentsHandled: number | null;
  attendanceCompletionRate: number | null;
  assignmentsCreated: number;
  assignmentsCompletedByStudentsRate: number | null;
  coursesHandledCount: number;
  liveClassesConducted: number;
  notesPublished: number | null;
  announcementsPublished: number | null;
  avgStudentRating: number | null;
  activityTrend: {
    month: string;
    classes: number;
    attendance: number;
  }[];
}

/* =========================================================
   STUDENT & ACADEMIC DATA MODELS (PHASE 2)
   ========================================================= */

export type StudentStatus = 'active' | 'inactive' | 'suspended' | 'graduated' | 'dropped' | 'Active' | 'Inactive' | 'Suspended';
export type FeeStatus = 'paid' | 'partially_paid' | 'pending' | 'overdue' | 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue';

export interface Student {
  id: string;
  studentId: string; // e.g. STU-2026-001
  fullName: string;
  avatar?: string;
  profileImage?: string;
  email: string;
  phone: string;
  dob: string;
  gender: Gender;
  address: string;

  // Academic Relations
  department: string;
  degree?: string;
  course?: string;
  courseId?: string;
  courseName?: string;
  batch?: string;
  batchId?: string;
  batchName?: string;
  section: string;
  academicYear: string;
  admissionDate: string;
  admissionId?: string;

  // Guardian Details
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianRelation?: string;
  emergencyContact: string;

  // Account
  loginEmail?: string;
  accountEmail?: string;
  status: StudentStatus;
  feeStatus: FeeStatus;

  // Academic Metrics
  attendancePercentage: number; // e.g. 92.5
  averageScore?: number;
  averageMarks?: number;
  assignmentsCompleted?: number;
  totalAssignments?: number;
  examsAttempted?: number;
  totalExams?: number;
  totalFee?: number;
  paidFee?: number;

  // Professional and Contact Details
  whatsappNumber?: string;
  alternatePhone?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  collegeName?: string;
  collegeMailId?: string;
  registerNumber?: string;
  specialization?: string;

  // Interests & Skills
  skills?: string[];
  careerInterests?: string | string[];
  notes?: string;

  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StudentQueryCategory =
  | 'Technical Issues'
  | 'Attendance Correction'
  | 'Exam / Assessment Query'
  | 'Course Content & Notes'
  | 'Live Session Access'
  | 'General Inquiry';

export type StudentQueryPriority = 'low' | 'medium' | 'high' | 'urgent';
export type StudentQueryStatus =
  | 'pending'
  | 'in_review'
  | 'resolved'
  | 'rejected'
  | 'Pending'
  | 'In Review'
  | 'Resolved'
  | 'Rejected';

export interface StudentQuery {
  id: string;
  queryCode: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  studentEmail: string;
  studentPhone?: string;
  whatsappNumber?: string;
  collegeName?: string;
  department?: string;
  batch: string;
  section?: string;
  category: StudentQueryCategory | string;
  subject?: string;
  description: string;
  priority: StudentQueryPriority;
  status: StudentQueryStatus;
  submittedAt: string;
  resolvedAt?: string;
  assignedFaculty?: string;
  adminResponse?: string;
  attachmentUrl?: string;
}

export type AdmissionStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'waitlisted' | 'converted' | 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Waitlisted' | 'Converted';

export interface StudentAdmission {
  id: string;
  applicationId: string; // e.g. ADM-2026-104
  applicantName?: string;
  fullName: string;
  email: string;
  phone: string;
  dob?: string;
  gender?: Gender;
  address?: string;
  department?: string;
  courseId?: string;
  courseName: string;
  batchId?: string;
  batchName?: string;
  qualification: string;
  previousInstitute?: string;
  percentageScore?: number;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  applicationDate: string;
  status: AdmissionStatus;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewerNotes?: string;
  convertedStudentId?: string;
  notes?: string;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentIdCode?: string;
  courseId?: string;
  courseName: string;
  batchId?: string;
  batchName: string;
  section?: string;
  enrollmentDate: string;
  academicYear?: string;
  feePlan: string;
  totalFee?: number;
  status: 'active' | 'transferred' | 'completed' | 'dropped' | 'Active' | 'Transferred' | 'Completed' | 'Dropped';
}

export interface StudentAttendance {
  id: string;
  studentId: string;
  studentName: string;
  studentIdCode?: string;
  courseId?: string;
  courseName: string;
  batchId?: string;
  batchName: string;
  classId?: string;
  className?: string;
  subject?: string;
  subjectName?: string;
  teacherId?: string;
  teacherName: string;
  date: string;
  session?: string;
  mode?: string;
  status: AttendanceStatus;
  remarks?: string;
  recordedBy?: string;
  updatedAt?: string;
}

export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  studentIdCode: string;
  courseName: string;
  batchName: string;
  totalConducted: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  riskStatus: 'safe' | 'warning' | 'critical';
}

export type ExamStatus = 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled';

export interface StudentExam {
  id: string;
  examCode?: string;
  title: string;
  courseId?: string;
  courseName: string;
  subject?: string;
  subjectName?: string;
  teacherId?: string;
  teacherName: string;
  batchId?: string;
  batchName: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  room?: string;
  mode?: 'offline' | 'online' | 'hybrid';
  status: ExamStatus;
  studentCount?: number;
  enrolledStudentsCount?: number;
  attemptsCount?: number;
  resultsPublished?: boolean;
  description?: string;
}

export interface StudentResult {
  id: string;
  resultCode?: string;
  studentId: string;
  studentName: string;
  studentIdCode?: string;
  studentAvatar?: string;
  examId?: string;
  examTitle: string;
  courseId?: string;
  courseName?: string;
  batchName?: string;
  subject?: string;
  subjectName?: string;
  assessmentType?: string;
  attemptNumber?: number;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  resultStatus: 'pass' | 'fail' | 'Passed' | 'Failed';
  publishedDate: string;
  submittedAt?: string;
  resultScreenshotUrl?: string;
  evaluatorTeacherId?: string;
  evaluatorTeacherName?: string;
  feedback?: string;
  questionBreakdown?: {
    question: string;
    max: number;
    scored: number;
  }[];
}

export interface FeeRecord {
  id: string;
  invoiceNumber?: string;
  studentId: string;
  studentName: string;
  studentIdCode?: string;
  courseId?: string;
  courseName: string;
  batchName?: string;
  feePlan: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: FeeStatus;
  lastPaymentDate?: string;
}

export interface PaymentTransaction {
  id: string;
  receiptNumber?: string;
  studentId: string;
  studentName: string;
  studentIdCode?: string;
  feeRecordId?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Other';
  transactionReference: string;
  collectedBy?: string;
  remarks?: string;
  status: 'successful' | 'refunded' | 'pending' | 'Successful';
}

export interface StudentCertificate {
  id: string;
  certificateNumber?: string;
  certificateId?: string;
  studentId: string;
  studentName: string;
  studentIdCode?: string;
  courseId?: string;
  courseName: string;
  completionDate?: string;
  issuedDate?: string;
  issueDate?: string;
  gradeAchieved?: string;
  status: 'issued' | 'pending' | 'revoked' | 'Issued' | 'Pending' | 'Revoked';
  issuedBy?: string;
  verificationUrl?: string;
  signatoryTitle?: string;
}

/* =========================================================
   GENERAL ACADEMIC ENTITIES
   ========================================================= */

export interface AcademicCourse {
  id: string;
  courseCode?: string;
  code?: string;
  name: string;
  department?: string;
  category: string;
  duration?: string;
  durationMonths?: number;
  fee?: number;
  totalFee?: number;
  credits?: number;
  description: string;
  status: 'active' | 'inactive' | 'Active' | 'Inactive';
  leadTeacherId?: string;
  leadTeacherName?: string;
  subjectIds?: string[];
  batchIds?: string[];
  enrolledStudentsCount?: number;
  createdAt?: string;
}

export interface AcademicSubject {
  id: string;
  subjectCode?: string;
  code?: string;
  name: string;
  courseId: string;
  courseName: string;
  department?: string;
  teacherId?: string;
  teacherName?: string;
  credits?: number;
  description?: string;
  status: 'active' | 'inactive' | 'Active' | 'Inactive';
}

export interface AcademicBatch {
  id: string;
  batchCode: string;
  name: string;
  courseId: string;
  courseName: string;
  department?: string;
  startDate: string;
  endDate: string;
  teacherId?: string;
  teacherName?: string;
  mentorTeacherId?: string;
  mentorTeacherName?: string;
  classroom: string;
  maxCapacity?: number;
  studentCapacity?: number;
  currentStudentsCount?: number;
  studentCount?: number;
  status: 'active' | 'upcoming' | 'graduated' | 'Active' | 'Upcoming' | 'Graduated';
}

export interface AcademicClass {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  subjectId?: string;
  subject?: string;
  subjectName?: string;
  teacherId: string;
  teacherName: string;
  batchId: string;
  batchName: string;
  section?: string;
  classroom: string;
  mode?: 'offline' | 'online' | 'hybrid';
  date: string;
  startTime: string;
  endTime: string;
  meetLink?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled';
  attendanceTaken?: boolean;
}

/* =========================================================
   PHASE 3: GENERAL MANAGEMENT & OPERATIONS DATA MODELS
   ========================================================= */

export type ClassroomStatus = 'Available' | 'Occupied' | 'Maintenance' | 'Inactive';

export interface Classroom {
  id: string;
  name: string;
  roomNumber: string;
  building: string;
  floor: string;
  capacity: number;
  facilities: string[];
  status: ClassroomStatus;
  currentClass?: string;
  notes?: string;
}

export type CalendarEventType = 'Class' | 'Exam' | 'Assignment' | 'Teacher Leave' | 'Student Event' | 'Announcement' | 'Deadline' | 'Academic Event' | 'Holiday';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  courseName?: string;
  batchName?: string;
  targetLink?: string;
  description?: string;
}

export type AudienceType = 'All Users' | 'Teachers Only' | 'Students Only' | 'Specific Course' | 'Specific Batch' | 'Specific Section' | 'Specific Teacher' | 'Specific Student';
export type AnnouncementPriority = 'Low' | 'Normal' | 'High';
export type AnnouncementStatus = 'Draft' | 'Published' | 'Archived';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: AudienceType;
  courseName?: string;
  courseId?: string;
  batchName?: string;
  batchId?: string;
  section?: string;
  specificTeacherName?: string;
  specificStudentName?: string;
  priority: AnnouncementPriority;
  publishDate: string;
  expiryDate: string;
  status: AnnouncementStatus;
  viewsCount: number;
  author: string;
}

export interface CentralNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  priority: 'Low' | 'Normal' | 'High';
  audience: AudienceType;
  courseName?: string;
  batchName?: string;
  section?: string;
  specificTeacherName?: string;
  specificStudentName?: string;
  actionUrl?: string;
  status: 'Sent' | 'Scheduled' | 'Draft';
  createdAt: string;
  scheduledDate?: string;
  recipientsCount: number;
  readCount: number;
  unreadCount: number;
  read: boolean;
}


export type AdminRoleName =
  | 'Super Admin'
  | 'Administrator'
  | 'Academic Manager'
  | 'Teacher Manager'
  | 'Student Manager'
  | 'Finance Manager'
  | 'Viewer'
  | (string & {});

export interface RolePermission {
  id: string;
  roleName: AdminRoleName;
  description: string;
  usersCount: number;
  permissions: {
    module: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canPublish: boolean;
    canExport: boolean;
    canManage: boolean;
  }[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: AdminRoleName;
  status: 'Active' | 'Inactive' | 'Suspended';
  avatar?: string;
  lastLogin: string;
  createdAt: string;
}

export interface ContentSection {
  id: string;
  sectionKey: string;
  title: string;
  subtitle?: string;
  content: string;
  lastUpdated: string;
}

export interface SlideBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaRoute: string;
  audience: AudienceType;
  startDate: string;
  endDate: string;
  displayOrder: number;
  status: 'Active' | 'Inactive';
}

export interface StorageFile {
  id: string;
  name: string;
  fileType: 'PDF' | 'Image' | 'Document' | 'Archive' | 'Audio' | 'Video';
  sizeBytes: number;
  sizeFormatted: string;
  ownerName: string;
  relatedEntity: string;
  createdDate: string;
  status: 'Active' | 'Archived';
  downloadUrl?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  module: 'teachers' | 'students' | 'admissions' | 'enrollments' | 'attendance' | 'applications' | 'courses' | 'classes' | 'classrooms' | 'assignments' | 'exams' | 'results' | 'fees' | 'payments' | 'certificates' | 'leave' | 'settings' | 'auth' | 'announcements' | 'notifications' | 'roles' | 'content' | 'storage' | 'system' | 'notes';
  entity: string;
  description: string;
  details?: string;
  ipAddress?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Super Admin' | 'Academic Admin' | 'Operations Admin';
  avatar?: string;
  department: string;
  joinedDate: string;
  lastLogin: string;
  twoFactorEnabled: boolean;
}

export interface SystemSettings {
  platformName: string;
  logoUrl?: string;
  supportEmail: string;
  contactPhone: string;
  address?: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  theme: 'dark' | 'light' | 'system';
  sidebarDefaultCollapsed: boolean;

  // Academic Settings
  academicYear?: string;
  currentSemester?: string;
  defaultCourseDuration?: string;
  defaultCourseDurationMonths?: number;
  defaultClassDuration?: number;
  defaultClassDurationMinutes?: number;
  gradingSystem?: string;

  // Attendance Settings
  attendanceMinThreshold?: number;
  minAttendanceThreshold?: number;
  lateThresholdMins?: number;
  lateThresholdMinutes?: number;
  correctionWindowDays?: number;
  defaultAttendanceStatus?: AttendanceStatus;
  attendanceAlertThresholdDays?: number;
  autoApproveLeaveDays?: number;

  // Assessment Settings
  defaultExamDurationMins?: number;
  defaultExamDurationMinutes?: number;
  defaultPassingMarkPct?: number;
  defaultPassingMarks?: number;

  // Notifications
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  teacherNotificationsEnabled?: boolean;
  enableTeacherNotifications?: boolean;
  studentNotificationsEnabled?: boolean;
  enableStudentNotifications?: boolean;
  attendanceAlertsEnabled?: boolean;
  enableAttendanceAlerts?: boolean;
  assessmentAlertsEnabled?: boolean;
  enableAssessmentAlerts?: boolean;
  resultAlertsEnabled?: boolean;
  enableResultAlerts?: boolean;
  systemAlertsEnabled?: boolean;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}
