import { whenSignedIn } from '../lib/supabase';
import { writeFailure, writeResult } from '../lib/persist';
import { supabase, supabaseAny } from '../lib/supabase';
import { Student, StudentStatus } from '../types';
import { activityService } from './activityService';

const STORAGE_KEY = 'dudex_students_cache';

// Data comes only from Supabase; an older browser copy is discarded so stale
// or demo records never show before the live data loads.
function loadCachedStudents(): Student[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  return [];
}

let cachedStudents: Student[] = loadCachedStudents();
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_students_changed'));
  }
}

// student_profiles CHECKs: gender Male|Female|Other; status active|suspended|graduated|pending.
function toDbGender(gender?: string): string {
  const g = String(gender || 'Male').toLowerCase();
  return g === 'female' ? 'Female' : g === 'other' ? 'Other' : 'Male';
}

function toDbStudentStatus(status?: string): string {
  const s = String(status || 'active').toLowerCase();
  if (s === 'inactive' || s === 'suspended') return 'suspended';
  if (s === 'graduated' || s === 'pending') return s;
  return 'active';
}

function rowToStudent(row: any): Student {
  const profile = row.profiles || {};
  const dept = row.departments || {};
  const college = dept.colleges || {};
  const spec = row.specializations || {};
  const batch = row.batches || {};
  const sec = row.sections || {};
  const yr = row.academic_years || {};

  // Check if we have a locally cached student with more complete details
  const localStudent = cachedStudents.find(
    (s) => s.id === row.id || s.studentId === row.roll_number || s.studentId === row.admission_number
  );

  const cleanStudentId = row.roll_number || row.admission_number || localStudent?.studentId || row.id;
  const fullName = (profile.full_name && profile.full_name !== 'Student') ? profile.full_name : (localStudent?.fullName || row.full_name || 'Student');
  const email = profile.email || localStudent?.email || '';
  const phone = profile.phone || localStudent?.phone || '';

  return {
    id: row.id,
    userId: row.user_id || profile.id,
    studentId: cleanStudentId,
    fullName,
    avatar: profile.avatar_url || localStudent?.avatar || undefined,
    profileImage: profile.avatar_url || localStudent?.profileImage || undefined,
    email,
    phone,
    dob: row.dob || row.date_of_birth || localStudent?.dob || '',
    gender: row.gender || localStudent?.gender || 'Male',
    address: row.address || row.current_address || localStudent?.address || '',
    department: row.department || dept.name || localStudent?.department || 'Computer Science',
    degree: row.degree || localStudent?.degree || 'B.Tech',
    course: row.course_name || spec.name || dept.name || row.department || localStudent?.course || 'Full-Stack Development',
    courseId: row.specialization_id || row.department_id || localStudent?.courseId,
    courseName: row.course_name || spec.name || dept.name || row.department || localStudent?.courseName || 'Full-Stack Development',
    batch: batch.name || row.batch_name || localStudent?.batch || 'Batch 1',
    batchId: row.batch_id || localStudent?.batchId,
    batchName: batch.name || row.batch_name || localStudent?.batchName || 'Batch 1',
    section: row.section || sec.name || localStudent?.section || 'A',
    academicYear: row.academic_year || yr.name || localStudent?.academicYear || '2026-2027',
    admissionDate: row.admission_date || row.updated_at?.split('T')[0] || localStudent?.admissionDate || new Date().toISOString().split('T')[0],
    admissionId: row.admission_number || localStudent?.admissionId || undefined,
    guardianName: row.guardian_name || localStudent?.guardianName || '',
    guardianPhone: row.guardian_phone || localStudent?.guardianPhone || '',
    guardianEmail: row.guardian_email || localStudent?.guardianEmail || '',
    guardianRelation: row.guardian_relation || localStudent?.guardianRelation || 'Parent',
    emergencyContact: row.emergency_contact || localStudent?.emergencyContact || '',
    loginEmail: email,
    accountEmail: row.college_email || email,
    status: (row.status === 'inactive' ? 'Inactive' : row.status === 'suspended' ? 'Suspended' : 'Active') as StudentStatus,
    feeStatus: localStudent?.feeStatus || 'Pending',
    attendancePercentage: row.attendance_percentage ?? localStudent?.attendancePercentage ?? undefined,
    averageScore: row.performance_score ?? localStudent?.averageScore ?? undefined,
    averageMarks: row.performance_score ?? localStudent?.averageMarks ?? undefined,
    assignmentsCompleted: localStudent?.assignmentsCompleted || 0,
    totalAssignments: localStudent?.totalAssignments || 0,
    examsAttempted: localStudent?.examsAttempted || 0,
    totalExams: localStudent?.totalExams || 0,
    totalFee: localStudent?.totalFee || 0,
    paidFee: localStudent?.paidFee || 0,
    skills: row.skills || localStudent?.skills || [],
    careerInterests: row.career_interest || localStudent?.careerInterests || '',
    notes: row.notes || localStudent?.notes || '',
    collegeName: row.college_name || college.name || localStudent?.collegeName || 'Dudex Institute of Technology',
    collegeMailId: row.college_email || localStudent?.collegeMailId || '',
    registerNumber: row.register_number || row.roll_number || row.admission_number || localStudent?.registerNumber || '',
    specialization: row.specialization || spec.name || localStudent?.specialization || '',
    whatsappNumber: row.whatsapp || localStudent?.whatsappNumber || '',
    createdAt: row.created_at || localStudent?.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || localStudent?.updatedAt || new Date().toISOString(),
  };
}

export const fetchStudents = async (): Promise<Student[]> => {
  try {
    const { data, error } = await supabaseAny
      .from('student_profiles')
      .select(`
        *,
        profiles(full_name, email, phone, avatar_url)
      `)
      .order('updated_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      cachedStudents = data.map(rowToStudent);
      notifyChange();
    } else if (error) {
      console.warn('studentService fetch error:', error.message);
    }
  } catch (err) {
    console.error('Failed to fetch students from Supabase:', err);
  }
  return cachedStudents;
};

// Initial background fetch
whenSignedIn(fetchStudents);

export const getStudents = (): Student[] => cachedStudents;

export const getStudentById = (id: string): Student | undefined =>
  cachedStudents.find((s) => s.id === id || s.studentId === id);

/**
 * Creates a new student.
 * Strategy: 
 * 1. Immediately adds to local cache so UI updates instantly.
 * 2. Tries to create a Supabase auth user (this creates the profiles row).
 * 3. If auth user creation fails (e.g., email exists), tries to insert directly into profiles.
 * 4. Then inserts student_profiles linked to the profiles.id.
 */
export const createStudent = async (payload: Partial<Student>): Promise<Student> => {
  const year = new Date().getFullYear();
  const count = cachedStudents.length + 1;
  const studentId = payload.studentId || `STU-${year}-${String(count).padStart(3, '0')}`;
  const tempId = `stu-${Date.now()}`;

  const newStudent: Student = {
    id: tempId,
    studentId,
    fullName: payload.fullName || 'New Student',
    avatar: payload.avatar || payload.profileImage,
    profileImage: payload.profileImage || payload.avatar,
    email: payload.email || '',
    phone: payload.phone || '',
    dob: payload.dob || '2005-01-01',
    gender: payload.gender || 'Male',
    address: payload.address || '',
    department: payload.department || '',
    degree: payload.degree || 'B.Tech',
    course: payload.course || payload.courseName || '',
    courseId: payload.courseId,
    courseName: payload.courseName || payload.course || '',
    batch: payload.batch || payload.batchName || 'Batch 1',
    batchId: payload.batchId,
    batchName: payload.batchName || payload.batch || 'Batch 1',
    section: payload.section || 'A',
    academicYear: payload.academicYear || '2026-2027',
    admissionDate: payload.admissionDate || new Date().toISOString().split('T')[0],
    admissionId: payload.admissionId,
    guardianName: payload.guardianName || '',
    guardianPhone: payload.guardianPhone || '',
    guardianEmail: payload.guardianEmail || '',
    guardianRelation: payload.guardianRelation || 'Parent',
    emergencyContact: payload.emergencyContact || '',
    loginEmail: payload.loginEmail || payload.email || '',
    accountEmail: payload.accountEmail || payload.email || '',
    status: payload.status || 'Active',
    feeStatus: payload.feeStatus || 'Pending',
    attendancePercentage: payload.attendancePercentage || 0,
    averageScore: payload.averageScore || payload.averageMarks || 0,
    averageMarks: payload.averageMarks || payload.averageScore || 0,
    assignmentsCompleted: payload.assignmentsCompleted || 0,
    totalAssignments: payload.totalAssignments || 0,
    examsAttempted: payload.examsAttempted || 0,
    totalExams: payload.totalExams || 0,
    totalFee: payload.totalFee || 0,
    paidFee: payload.paidFee || 0,
    skills: payload.skills || [],
    careerInterests: payload.careerInterests || '',
    notes: payload.notes || '',
    collegeName: payload.collegeName || '',
    collegeMailId: payload.collegeMailId || '',
    registerNumber: payload.registerNumber || studentId,
    specialization: payload.specialization || '',
    whatsappNumber: payload.whatsappNumber || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload,
  };

  // Optimistically add to cache so UI reflects the new student immediately
  cachedStudents = [newStudent, ...cachedStudents];
  notifyChange();

  // Background persist to Supabase
  (async () => {
    try {
      let profileId: string | null = null;

      // Step 1: Find existing profile by email (case-insensitive).
      // We do NOT call supabase.auth.signUp from the admin panel — that
      // requires server-side admin privileges and causes 500 errors with the
      // anon key.  Students create their own auth accounts via the student
      // portal; the admin panel only links to existing profiles.
      if (newStudent.email) {
        const trimmedEmail = newStudent.email.trim();
        const { data: existingProfile } = await supabaseAny
          .from('profiles')
          .select('id')
          .ilike('email', trimmedEmail)
          .maybeSingle();

        if (existingProfile?.id) {
          profileId = existingProfile.id;
        }
      }

      // Step 2: If no existing profile, update the local cache only.
      // We cannot insert into profiles because profiles.id has a FK to
      // auth.users(id) — only Supabase Auth can create those rows.
      // The student_profiles.user_id is NOT NULL, so we can only insert
      // a student_profiles row when we have a valid profileId.
      if (!profileId) {
        console.info(
          'studentService: No auth profile found for',
          newStudent.email || '(no email)',
          '— student saved to local cache only. They will be linked once they register via the student portal.'
        );
        return;
      }

      // Step 3: Build studentPayload with ONLY live student_profiles columns.
      // The live table stores academic details as text (department, course_name,
      // specialization, batch_name, section, academic_year, college_name) rather
      // than college/department/specialization foreign keys.
      const registerNumber = newStudent.registerNumber || newStudent.studentId || null;
      const studentPayload: Record<string, any> = {
        user_id: profileId,
        register_number: registerNumber,
        roll_number: registerNumber,
        admission_number: newStudent.admissionId || null,
        dob: newStudent.dob || null,
        gender: toDbGender(newStudent.gender),
        guardian_name: newStudent.guardianName || null,
        guardian_phone: newStudent.guardianPhone || null,
        guardian_email: newStudent.guardianEmail || null,
        address: newStudent.address || null,
        phone: newStudent.phone || null,
        department: newStudent.department || '',
        course_name: newStudent.courseName || newStudent.course || '',
        specialization: newStudent.specialization || null,
        batch_name: newStudent.batchName || newStudent.batch || '',
        section: newStudent.section || '',
        academic_year: newStudent.academicYear || '',
        college_name: newStudent.collegeName || null,
        admission_date: newStudent.admissionDate || null,
        status: toDbStudentStatus(newStudent.status),
      };
      if (newStudent.batchId) {
        studentPayload.batch_id = newStudent.batchId;
      }

      // Step 4: Check if a student_profiles row already exists for this user
      const { data: existingSp } = await supabaseAny
        .from('student_profiles')
        .select('id')
        .eq('user_id', profileId)
        .maybeSingle();

      let spData: any = null;
      let spError: any = null;

      if (existingSp?.id) {
        // Update existing row (omit user_id from update to avoid unique conflicts)
        const { user_id: _uid, ...updateFields } = studentPayload;
        const updateRes = await supabaseAny
          .from('student_profiles')
          .update(updateFields)
          .eq('id', existingSp.id)
          .select('id')
          .maybeSingle();
        spData = updateRes.data || existingSp;
        spError = updateRes.error;
      } else {
        // Insert new row
        const insertRes = await supabaseAny
          .from('student_profiles')
          .insert(studentPayload)
          .select('id')
          .maybeSingle();
        spData = insertRes.data;
        spError = insertRes.error;
      }

      if (spError) {
        console.warn('studentService: student_profiles persist error:', spError.message);
      }

      if (spData?.id) {
        // Update cache with the real DB id
        const idx = cachedStudents.findIndex((s) => s.id === tempId);
        if (idx !== -1) {
          cachedStudents[idx] = { ...cachedStudents[idx], id: spData.id, userId: profileId || undefined };
          notifyChange();
        }
        // Auto-enrollment into matching classes is handled by the database
        // trigger trg_enroll_student_in_classes (migration 056). It matches
        // on college_name, department, batch, section and academic_year.
      }
    } catch (err) {
      console.error('studentService: async persist failed:', err);
    }
  })();

  activityService.log(
    'Student Enrolled',
    'students',
    newStudent.fullName,
    `Registered new student ${newStudent.fullName} (${newStudent.studentId}) in ${newStudent.course}`
  );

  return newStudent;
};

// Sync wrapper for backward-compatibility with pages that don't await
export const createStudentSync = (payload: Partial<Student>): Student => {
  const year = new Date().getFullYear();
  const count = cachedStudents.length + 1;
  const studentId = payload.studentId || `STU-${year}-${String(count).padStart(3, '0')}`;
  const tempId = `stu-${Date.now()}`;

  const newStudent: Student = {
    id: tempId,
    studentId,
    fullName: payload.fullName || 'New Student',
    avatar: payload.avatar || payload.profileImage,
    profileImage: payload.profileImage || payload.avatar,
    email: payload.email || '',
    phone: payload.phone || '',
    dob: payload.dob || '2005-01-01',
    gender: payload.gender || 'Male',
    address: payload.address || '',
    department: payload.department || '',
    degree: payload.degree || 'B.Tech',
    course: payload.course || payload.courseName || '',
    courseId: payload.courseId,
    courseName: payload.courseName || payload.course || '',
    batch: payload.batch || payload.batchName || 'Batch 1',
    batchId: payload.batchId,
    batchName: payload.batchName || payload.batch || 'Batch 1',
    section: payload.section || 'A',
    academicYear: payload.academicYear || '2026-2027',
    admissionDate: payload.admissionDate || new Date().toISOString().split('T')[0],
    admissionId: payload.admissionId,
    guardianName: payload.guardianName || '',
    guardianPhone: payload.guardianPhone || '',
    guardianEmail: payload.guardianEmail || '',
    guardianRelation: payload.guardianRelation || 'Parent',
    emergencyContact: payload.emergencyContact || '',
    loginEmail: payload.loginEmail || payload.email || '',
    accountEmail: payload.accountEmail || payload.email || '',
    status: payload.status || 'Active',
    feeStatus: payload.feeStatus || 'Pending',
    attendancePercentage: payload.attendancePercentage || 0,
    averageScore: payload.averageScore || 0,
    averageMarks: payload.averageMarks || 0,
    assignmentsCompleted: 0,
    totalAssignments: 0,
    examsAttempted: 0,
    totalExams: 0,
    totalFee: 0,
    paidFee: 0,
    skills: payload.skills || [],
    careerInterests: payload.careerInterests || '',
    notes: payload.notes || '',
    collegeName: payload.collegeName || '',
    collegeMailId: payload.collegeMailId || '',
    registerNumber: payload.registerNumber || studentId,
    specialization: payload.specialization || '',
    whatsappNumber: payload.whatsappNumber || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload,
  };

  cachedStudents = [newStudent, ...cachedStudents];
  notifyChange();

  // Fire-and-forget the async persist
  createStudent(payload).catch(() => {});

  activityService.log('Student Added', 'students', newStudent.fullName,
    `Registered ${newStudent.fullName} (${studentId})`);

  return newStudent;
};

export const updateStudent = (id: string, updates: Partial<Student>): Student | null => {
  const index = cachedStudents.findIndex((s) => s.id === id || s.studentId === id);
  if (index === -1) return null;

  const updatedStudent: Student = {
    ...cachedStudents[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  cachedStudents[index] = updatedStudent;
  notifyChange();

  // Async update to Supabase
  const isUuid = (s?: string) => Boolean(s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s));
  const targetId = isUuid(id) ? id : (isUuid(updatedStudent.id) ? updatedStudent.id : updatedStudent.userId);

  const spPayload: Record<string, any> = {
    dob: updatedStudent.dob || null,
    gender: toDbGender(updatedStudent.gender),
    guardian_name: updatedStudent.guardianName || null,
    guardian_phone: updatedStudent.guardianPhone || null,
    guardian_email: updatedStudent.guardianEmail || null,
    address: updatedStudent.address || null,
    department: updatedStudent.department || undefined,
    course_name: updatedStudent.courseName || updatedStudent.course || undefined,
    specialization: updatedStudent.specialization || null,
    batch_name: updatedStudent.batchName || updatedStudent.batch || undefined,
    section: updatedStudent.section || undefined,
    academic_year: updatedStudent.academicYear || undefined,
    status: toDbStudentStatus(updatedStudent.status),
    roll_number: updatedStudent.registerNumber || updatedStudent.studentId || undefined,
  };

  if (targetId && isUuid(targetId)) {
    supabaseAny
      .from('student_profiles')
      .update(spPayload)
      .or(`id.eq.${targetId},user_id.eq.${targetId}`)
      .then(
        ({ error }: any) => {
          if (error) console.warn('studentService update error:', error.message);
        },
        () => {}
      );
  } else {
    supabaseAny
      .from('student_profiles')
      .update(spPayload)
      .eq('roll_number', updatedStudent.registerNumber || updatedStudent.studentId)
      .then(writeResult('Updating the student record'), writeFailure('Updating the student record'));
  }

  if (updatedStudent.userId && isUuid(updatedStudent.userId)) {
    supabaseAny
      .from('profiles')
      .update({
        full_name: updatedStudent.fullName,
        email: updatedStudent.email,
        phone: updatedStudent.phone || null,
        avatar_url: updatedStudent.avatar || null,
      })
      .eq('id', updatedStudent.userId)
      .then(writeResult('Updating the student record'), writeFailure('Updating the student record'));
  }

  activityService.log(
    'Student Record Updated',
    'students',
    updatedStudent.fullName,
    `Updated details for ${updatedStudent.fullName} (${updatedStudent.studentId})`
  );

  return updatedStudent;
};

export const updateStudentStatus = (id: string, status: any): Student | null =>
  updateStudent(id, { status });

export const toggleStudentStatus = (id: string, status: StudentStatus): Student | null =>
  updateStudent(id, { status });

export const deleteStudent = (id: string): boolean => {
  const target = cachedStudents.find((s) => s.id === id || s.studentId === id);
  if (!target) return false;

  cachedStudents = cachedStudents.filter((s) => s.id !== id && s.studentId !== id);
  notifyChange();

  supabaseAny
    .from('student_profiles')
    .delete()
    .or(`id.eq.${id},register_number.eq.${id}`)
    .then(
      ({ error }: any) => {
        if (error) console.warn('studentService delete error:', error.message);
      },
      () => {}
    );

  activityService.log(
    'Student Record Deleted',
    'students',
    target.fullName,
    `Removed student ${target.fullName} (${target.studentId})`
  );

  return true;
};

export const generateNextStudentId = (): string => {
  const count = cachedStudents.length + 1;
  const year = new Date().getFullYear();
  return `STU-${year}-${String(count).padStart(3, '0')}`;
};

export const getAtRiskStudents = (): Student[] =>
  cachedStudents.filter((s) => {
    const isInactive = s.status === 'Suspended' || s.status === 'suspended';
    if (isInactive) return true;

    // Only flag as low attendance if attendance has actually been recorded/evaluated
    const hasAtt = s.attendancePercentage !== undefined && s.attendancePercentage !== null;
    const isLowAtt = hasAtt && s.attendancePercentage < 75;

    // Only flag as low marks if marks have actually been recorded/evaluated
    const hasScore =
      (s.averageScore !== undefined && s.averageScore !== null) ||
      (s.averageMarks !== undefined && s.averageMarks !== null);
    const scoreVal = s.averageScore ?? s.averageMarks ?? 100;
    const isLowMarks = hasScore && scoreVal < 50;

    return isLowAtt || isLowMarks;
  });

export const studentService = {
  getStudents,
  fetchStudents,
  getStudentById,
  createStudent,
  createStudentSync,
  updateStudent,
  updateStudentStatus,
  toggleStudentStatus,
  deleteStudent,
  generateNextStudentId,
  getAtRiskStudents,
  onStudentsChange(cb: () => void): () => void {
    listeners.push(cb);
    return () => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
};
