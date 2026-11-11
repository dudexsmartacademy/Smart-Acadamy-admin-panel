import { whenSignedIn } from '../lib/supabase';
import { writeResult } from '../lib/persist';
import { supabaseAny as supabase } from '../lib/supabase';
import { StudentEnrollment } from '../types';
import { studentService } from './studentService';
import { activityService } from './activityService';

let cachedEnrollments: StudentEnrollment[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_enrollments_changed'));
  }
}

function rowToEnrollment(row: any): StudentEnrollment {
  const prof = row.profiles || row.student_profiles?.profiles || {};
  const cls = row.classes || {};

  return {
    id: row.id,
    studentId: row.student_id || '',
    studentName: prof.full_name || row.student_name || 'Enrolled Student',
    courseId: row.course_id || '',
    courseName: row.course_name || cls.name || 'Academic Course',
    batchId: row.batch_id || '',
    batchName: row.batch_name || 'Batch',
    section: row.section || 'A',
    enrollmentDate: row.enrolled_at ? row.enrolled_at.split('T')[0] : (row.created_at ? row.created_at.split('T')[0] : ''),
    feePlan: 'Standard Tuition',
    totalFee: 0,
    status: row.is_active === false ? 'Completed' : 'Active',
  };
}

export const fetchEnrollments = async (): Promise<StudentEnrollment[]> => {
  try {
    const { data, error } = await supabase
      .from('class_memberships')
      .select(`
        id,
        class_id,
        student_id,
        enrolled_at,
        profiles (
          full_name
        ),
        classes (
          id,
          name
        )
      `)
      .order('enrolled_at', { ascending: false });

    if (!error && data) {
      cachedEnrollments = data.map(rowToEnrollment);
      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch enrollments from Supabase:', err);
  }
  return cachedEnrollments;
};

// Initial background fetch
whenSignedIn(fetchEnrollments);

export const subscribeEnrollments = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const getEnrollments = (): StudentEnrollment[] => {
  return cachedEnrollments;
};

export const getEnrollmentById = (id: string): StudentEnrollment | undefined => {
  return cachedEnrollments.find((e) => e.id === id);
};

export const getEnrollmentsByStudent = (studentId: string): StudentEnrollment[] => {
  // class_memberships.student_id references profiles.id (auth UID), but the
  // admin panel passes student_profiles.id. Try both.
  const student = studentService.getStudentById(studentId);
  const altId = student?.userId;
  return cachedEnrollments.filter(
    (e) => e.studentId === studentId || (altId && e.studentId === altId)
  );
};

export const getEnrollmentsByStudentId = getEnrollmentsByStudent;

export const createEnrollment = (data: Partial<StudentEnrollment> & {
  studentId: string;
  studentName: string;
  courseName: string;
  batchName: string;
}): StudentEnrollment => {
  const newEnrollment: StudentEnrollment = {
    id: crypto.randomUUID(),
    studentId: data.studentId,
    studentName: data.studentName,
    courseId: data.courseId,
    courseName: data.courseName,
    batchId: data.batchId,
    batchName: data.batchName,
    section: data.section || 'A',
    enrollmentDate: data.enrollmentDate || new Date().toISOString().split('T')[0],
    feePlan: data.feePlan || 'Standard Tuition',
    totalFee: data.totalFee || 0,
    status: (data.status as any) || 'Active',
    ...data,
  };

  cachedEnrollments = [newEnrollment, ...cachedEnrollments];
  notifyChange();

  // Update student record
  const student = studentService.getStudentById(newEnrollment.studentId);
  if (student) {
    studentService.updateStudent(student.id, {
      course: newEnrollment.courseName,
      courseId: newEnrollment.courseId,
      courseName: newEnrollment.courseName,
      batch: newEnrollment.batchName,
      batchId: newEnrollment.batchId,
      batchName: newEnrollment.batchName,
    });
  }

  activityService.log(
    'Student Enrolled in Course',
    'enrollments',
    newEnrollment.studentName,
    `Enrolled ${newEnrollment.studentName} in ${newEnrollment.courseName} (${newEnrollment.batchName})`
  );

  (async () => {
    try {
      const classId = newEnrollment.batchId;
      if (!classId) {
        // No class id available — auto-enrollment into matching classes is
        // handled by the database trigger trg_enroll_student_in_classes
        // (migration 056). Skip manual class_memberships insert.
        return;
      }

      await supabase
        .from('class_memberships')
        .insert({
          class_id: classId,
          student_id: newEnrollment.studentId,
          enrolled_at: `${newEnrollment.enrollmentDate}T00:00:00Z`,
        });
    } catch (err: any) {
      console.warn('Supabase enrollment insertion failed:', err);
    }
  })();

  return newEnrollment;
};

export const updateEnrollment = (id: string, updates: Partial<StudentEnrollment>): StudentEnrollment | null => {
  const index = cachedEnrollments.findIndex((e) => e.id === id);
  if (index === -1) return null;

  cachedEnrollments[index] = { ...cachedEnrollments[index], ...updates };
  const updated = cachedEnrollments[index];
  notifyChange();

  // The live class_memberships table has no active/status column, so an
  // enrollment status change is kept in the admin cache only.
  return updated;
};

export const updateEnrollmentStatus = (id: string, status: StudentEnrollment['status']): StudentEnrollment | null => {
  return updateEnrollment(id, { status });
};

export const deleteEnrollment = (id: string): boolean => {
  const target = cachedEnrollments.find((e) => e.id === id);
  if (!target) return false;

  cachedEnrollments = cachedEnrollments.filter((e) => e.id !== id);
  notifyChange();

  supabase
    .from('class_memberships')
    .delete()
    .eq('id', id)
    .then(writeResult('Deleting the enrollment'), (err: any) => {
      console.warn('Supabase enrollment deletion failed:', err);
    });

  return true;
};

export const enrollmentService = {
  getEnrollments,
  getEnrollmentById,
  getEnrollmentsByStudent,
  getEnrollmentsByStudentId: getEnrollmentsByStudent,
  createEnrollment,
  updateEnrollment,
  updateEnrollmentStatus,
  deleteEnrollment,
  subscribe: subscribeEnrollments,
};
