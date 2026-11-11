import { whenSignedIn } from '../lib/supabase';
import { writeFailure, writeResult } from '../lib/persist';
import { supabase, supabaseAny } from '../lib/supabase';
import { StudentAdmission, AdmissionStatus, Student } from '../types';
import { studentService } from './studentService';
import { activityService } from './activityService';

let cachedAdmissions: StudentAdmission[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_admissions_changed'));
  }
}

function rowToAdmission(row: any): StudentAdmission {
  return {
    id: row.id,
    applicationId: row.application_number || row.id,
    applicantName: row.full_name || row.applicant_name || 'Applicant',
    fullName: row.full_name || row.applicant_name || 'Applicant',
    email: row.email || '',
    phone: row.phone || '',
    dob: row.dob || row.date_of_birth || undefined,
    gender: row.gender || undefined,
    address: row.address || undefined,
    department: row.department || undefined,
    courseId: row.course_id || undefined,
    courseName: row.course_name || row.specialization || '',
    batchId: row.batch_id || undefined,
    batchName: row.batch_name || undefined,
    qualification: row.qualification || "Bachelor's Degree",
    previousInstitute: row.previous_institute || undefined,
    percentageScore: row.percentage_score || undefined,
    guardianName: row.guardian_name || undefined,
    guardianPhone: row.guardian_phone || undefined,
    guardianEmail: row.guardian_email || undefined,
    applicationDate: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    status: (row.status as AdmissionStatus) || 'Pending',
    reviewedBy: row.reviewed_by || undefined,
    reviewedDate: row.reviewed_at || undefined,
    reviewerNotes: row.reviewer_notes || undefined,
    convertedStudentId: row.converted_student_id || undefined,
    notes: row.notes || undefined,
  };
}


// admissions.status CHECK: pending | under_review | approved | rejected | converted
function toDbAdmissionStatus(status?: string): string {
  const s = String(status || 'pending').toLowerCase().replace(/\s+/g, '_');
  return ['pending', 'under_review', 'approved', 'rejected', 'converted'].includes(s) ? s : 'pending';
}

export const fetchAdmissions = async (): Promise<StudentAdmission[]> => {
  try {
    const { data, error } = await supabaseAny
      .from('admissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      cachedAdmissions = data.map(rowToAdmission);
      notifyChange();
    } else if (error) {
      console.warn('admissionService: Could not fetch admissions:', error.message);
    }
  } catch (err) {
    console.error('Failed to fetch admissions from Supabase:', err);
  }
  return cachedAdmissions;
};

// Initial background fetch
whenSignedIn(fetchAdmissions);

export const subscribeAdmissions = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const getAdmissions = (): StudentAdmission[] => cachedAdmissions;

export const getAdmissionById = (id: string): StudentAdmission | undefined =>
  cachedAdmissions.find((a) => a.id === id || a.applicationId === id);

export const createAdmission = (data: Partial<StudentAdmission>): StudentAdmission => {
  const count = cachedAdmissions.length + 1;
  const year = new Date().getFullYear();
  const newAdmission: StudentAdmission = {
    id: crypto.randomUUID(),
    applicationId: `ADM-${year}-${String(count).padStart(3, '0')}`,
    applicantName: data.applicantName || data.fullName || 'New Applicant',
    fullName: data.fullName || data.applicantName || 'New Applicant',
    email: data.email || '',
    phone: data.phone || '',
    gender: data.gender || 'Male',
    courseName: data.courseName || '',
    qualification: data.qualification || "Bachelor's Degree",
    applicationDate: new Date().toISOString().split('T')[0],
    status: (data.status as any) || 'Pending',
    notes: data.notes || '',
    ...data,
  };

  cachedAdmissions = [newAdmission, ...cachedAdmissions];
  notifyChange();

  supabaseAny
    .from('admissions')
    .insert({
      id: newAdmission.id,
      application_id: newAdmission.applicationId,
      full_name: newAdmission.fullName,
      email: newAdmission.email,
      phone: newAdmission.phone,
      gender: newAdmission.gender,
      course_name: newAdmission.courseName,
      course_id: newAdmission.courseId || null,
      batch_id: newAdmission.batchId || null,
      qualification: newAdmission.qualification,
      guardian_name: newAdmission.guardianName || null,
      guardian_phone: newAdmission.guardianPhone || null,
      address: newAdmission.address || null,
      status: toDbAdmissionStatus(newAdmission.status),
      notes: newAdmission.notes || null,
    })
    .then(writeResult('Updating the admission'), (err: any) => {
      console.warn('admissionService: insert failed:', err?.message);
    });

  activityService.log(
    'Admission Application Submitted',
    'admissions',
    newAdmission.applicantName!,
    `Submitted application ${newAdmission.applicationId} for ${newAdmission.courseName}`
  );

  return newAdmission;
};

export const updateAdmissionStatus = (
  id: string,
  status: any,
  reviewerNotes?: string,
  adminName = 'Administrator'
): StudentAdmission | null => {
  const index = cachedAdmissions.findIndex((a) => a.id === id || a.applicationId === id);
  if (index === -1) return null;

  const current = cachedAdmissions[index];
  const updated: StudentAdmission = {
    ...current,
    status,
    reviewedBy: adminName,
    reviewedDate: new Date().toISOString(),
    reviewerNotes: reviewerNotes || current.reviewerNotes,
  };

  cachedAdmissions[index] = updated;
  notifyChange();

  // admissions.reviewed_by references the reviewing admin's user id.
  void (async () => {
    const { data: { user } } = await supabaseAny.auth.getUser();
    const { error } = await supabaseAny
      .from('admissions')
      .update({
        status: toDbAdmissionStatus(status),
        reviewed_by: user?.id ?? null,
        reviewer_notes: reviewerNotes || null,
      })
      .eq('id', current.id);
    if (error) console.warn('admissionService: update failed:', error.message);
  })();

  activityService.log(
    `Admission Application ${String(status).toUpperCase()}`,
    'admissions',
    updated.applicantName || updated.fullName,
    `Application ${updated.applicationId} status marked as ${status}`
  );

  return updated;
};

export const convertAdmissionToStudent = (admissionId: string): Student | null => {
  const adm = getAdmissionById(admissionId);
  if (!adm) return null;

  const studentId = studentService.generateNextStudentId();
  const name = adm.applicantName || adm.fullName || 'Converted Student';

  const createdStudent = studentService.createStudentSync({
    studentId,
    fullName: name,
    email: adm.email,
    phone: adm.phone,
    dob: adm.dob || '2005-01-01',
    gender: adm.gender || 'Male',
    address: adm.address || '',
    department: adm.department || '',
    course: adm.courseName || '',
    courseId: adm.courseId,
    courseName: adm.courseName || '',
    batch: adm.batchName || '',
    batchId: adm.batchId,
    batchName: adm.batchName || '',
    section: 'A',
    academicYear: '2026-2027',
    admissionDate: new Date().toISOString().split('T')[0],
    admissionId: adm.applicationId,
    guardianName: adm.guardianName || '',
    guardianPhone: adm.guardianPhone || adm.phone,
    guardianEmail: adm.guardianEmail || adm.email,
    guardianRelation: 'Parent / Guardian',
    emergencyContact: adm.guardianPhone || adm.phone,
    loginEmail: adm.email,
    status: 'Active',
    feeStatus: 'Pending',
    attendancePercentage: 100,
    averageScore: 0,
    assignmentsCompleted: 0,
    totalAssignments: 0,
    examsAttempted: 0,
    totalExams: 0,
    totalFee: 0,
    paidFee: 0,
    skills: ['Academic Candidate'],
    careerInterests: [],
    notes: `Admitted via Application ${adm.applicationId}`,
  });

  updateAdmissionStatus(adm.id, 'Converted', `Converted to student account (${studentId})`);

  activityService.log(
    'Applicant Converted to Enrolled Student',
    'admissions',
    name,
    `Converted admission application ${adm.applicationId} into student ${name} (${studentId})`
  );

  return createdStudent;
};

export const admissionService = {
  getAdmissions,
  fetchAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmissionStatus,
  convertToStudent: (admissionId: string) => {
    const student = convertAdmissionToStudent(admissionId);
    const admission = getAdmissionById(admissionId);
    return student && admission ? { student, admission } : null;
  },
  deleteAdmission: (id: string) => {
    const exists = cachedAdmissions.some(a => a.id === id);
    if (!exists) return false;
    cachedAdmissions = cachedAdmissions.filter((a) => a.id !== id);
    notifyChange();
    supabaseAny.from('admissions').delete().eq('id', id).then(writeResult('Deleting the admission'), writeFailure('Deleting the admission'));
    return true;
  },
  subscribe: subscribeAdmissions,
};
