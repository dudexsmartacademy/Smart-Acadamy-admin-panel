import { whenSignedIn } from '../lib/supabase';
import { supabaseAny as supabase } from '../lib/supabase';
import { StudentResult } from '../types';
import { calculateGrade } from '../utils/gradeCalculator';
import { activityService } from './activityService';
import { getStudents } from './studentService';

let cachedResults: StudentResult[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_results_changed'));
  }
}

// The `results` table is the gradebook: student submissions (graded by the
// submit_assessment_attempt RPC) and admin-entered marks both land there.
function rowToResult(row: any): StudentResult {
  const students = getStudents();
  const matchedStudent = students.find((s) => s.id === row.student_id || s.userId === row.student_id);
  const sp = row.student_profiles || {};
  const prof = sp.profiles || row.profiles || {};
  const ass = row.assessments || {};
  const maxMarks = Number(row.max_marks ?? row.max_score) || 100;
  const marksObtained = Number(row.score ?? row.marks_obtained) || 0;
  const gradeInfo = calculateGrade(marksObtained, maxMarks);
  const isPassed = row.is_passed !== undefined ? Boolean(row.is_passed) : (String(row.status || '').toLowerCase() === 'passed' || marksObtained >= (maxMarks * 0.4));
  const status = isPassed ? 'pass' : 'fail';
  const rawType = String(ass.type || row.type || '').toLowerCase();

  const studentName = prof.full_name || matchedStudent?.fullName || row.student_name || 'Student';
  const studentIdCode = sp.roll_number || sp.admission_number || matchedStudent?.studentId || (row.student_id ? row.student_id.substring(0, 8) : '');
  const studentAvatar = prof.avatar_url || matchedStudent?.avatar || undefined;
  const batchName = sp.batch_name || matchedStudent?.batch || row.batch_name || '';

  return {
    id: row.id,
    resultCode: row.id,
    studentId: sp.id || matchedStudent?.id || row.student_id || '',
    studentName,
    studentIdCode,
    studentAvatar,
    examId: row.assessment_id || '',
    examTitle: ass.title || row.assessment_title || 'Assessment',
    courseName: ass.classes?.name || row.course_name || '',
    batchName,
    subjectName: ass.classes?.name || row.subject_name || row.subject || '',
    assessmentType: rawType.includes('code') || rawType === 'coding' ? 'Coding Assessment' : 'MCQ Examination',
    attemptNumber: 1,
    marksObtained,
    maxMarks,
    percentage: row.percentage !== undefined && row.percentage !== null ? Number(row.percentage) : Math.round((marksObtained / (maxMarks || 1)) * 100),
    grade: row.grade || gradeInfo.grade,
    resultStatus: status,
    publishedDate: (row.published_at || row.date || row.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
    submittedAt: row.created_at || undefined,
    feedback: row.feedback || undefined,
    ...({ studentUserId: sp.user_id || matchedStudent?.userId }),
  } as StudentResult;
}

export const fetchResults = async (): Promise<StudentResult[]> => {
  try {
    let { data, error } = await supabase
      .from('results')
      .select(`
        *,
        assessments (
          id,
          title,
          type,
          subject
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      const fb = await supabase
        .from('results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!fb.error && fb.data) {
        data = fb.data;
        error = null;
      }
    }

    if (error) {
      console.warn('resultService fetch error:', error.message);
    } else if (data) {
      const mapped = data.map(rowToResult);
      cachedResults = mapped;

      // Merge external assessment submissions (HackerRank challenges)
      try {
        const { data: extSubs } = await supabase
          .from('external_assessment_submissions')
          .select('*')
          .order('submitted_at', { ascending: false });

        const existingPairs = new Set(data.map((r: any) => `${r.student_id}::${r.assessment_id}`));
        (extSubs || []).forEach((sub: any) => {
          const pairKey = `${sub.student_id}::${sub.assessment_id}`;
          if (!existingPairs.has(pairKey)) {
            existingPairs.add(pairKey);
            const score = Number(sub.verified_score ?? sub.reported_score) || 0;
            const maxMarks = 100;
            const percentage = Math.round((score / maxMarks) * 100);
            const grade = percentage >= 85 ? 'A+' : percentage >= 75 ? 'A' : percentage >= 60 ? 'B' : 'C';
            const isPassed = percentage >= 40;
            const students = getStudents();
            const matchedStudent = students.find((s) => s.id === sub.student_id || s.userId === sub.student_id);

            cachedResults.push({
              id: sub.id,
              resultCode: sub.id,
              studentId: matchedStudent?.id || sub.student_id || '',
              studentName: matchedStudent?.fullName || 'Student',
              studentIdCode: matchedStudent?.studentId || (sub.student_id ? String(sub.student_id).substring(0, 8) : ''),
              studentAvatar: matchedStudent?.avatar || undefined,
              examId: sub.assessment_id || '',
              examTitle: 'HackerRank Challenge',
              courseName: matchedStudent?.courseName || '',
              batchName: matchedStudent?.batch || '',
              subjectName: 'Coding Assessment',
              assessmentType: 'Coding Assessment',
              attemptNumber: 1,
              marksObtained: score,
              maxMarks,
              percentage,
              grade,
              resultStatus: isPassed ? 'pass' : 'fail',
              publishedDate: (sub.submitted_at || sub.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
              submittedAt: sub.submitted_at || sub.created_at || undefined,
              feedback: sub.review_note || undefined,
              ...({ studentUserId: sub.student_id || matchedStudent?.userId }),
            } as StudentResult);
          }
        });
      } catch {}

      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch results from Supabase:', err);
  }
  return cachedResults;
};

// Initial background fetch & Realtime subscription
whenSignedIn(() => {
  void fetchResults();
  try {
    supabase
      .channel('public:results')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results' },
        () => {
          void fetchResults();
        }
      )
      .subscribe();
  } catch (e) {
    console.error('Failed to subscribe to results realtime channel:', e);
  }
});

// Periodic fallback polling
if (typeof window !== 'undefined') {
  setInterval(() => {
    void fetchResults();
  }, 10000);
}

export const getResults = (): StudentResult[] => {
  return cachedResults;
};

export const getResultById = (id: string): StudentResult | undefined => {
  return cachedResults.find((r) => r.id === id || r.resultCode === id);
};

export const getResultsByStudent = (
  studentId: string,
  studentName?: string,
  studentRrn?: string
): StudentResult[] => {
  const normName = (studentName || '').toLowerCase().trim();
  const normRrn = (studentRrn || '').toLowerCase().trim();
  return cachedResults.filter((r) => {
    if (r.studentId === studentId || r.studentIdCode === studentId) return true;
    if ((r as any).studentUserId && (r as any).studentUserId === studentId) return true;
    if (normName && r.studentName.toLowerCase().trim() === normName) return true;
    if (normRrn && r.studentIdCode.toLowerCase().trim() === normRrn) return true;
    return false;
  });
};

export const getResultsByStudentId = getResultsByStudent;

export const getResultsByExamId = (examId: string): StudentResult[] => {
  return cachedResults.filter((r) => r.examId === examId);
};

export const recordStudentResult = (data: Partial<StudentResult> & {
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  marksObtained: number;
  maxMarks: number;
}): StudentResult => {
  const count = cachedResults.length + 1;
  const year = new Date().getFullYear();
  const gradeCalc = calculateGrade(data.marksObtained, data.maxMarks);

  const newResult: StudentResult = {
    id: crypto.randomUUID(),
    resultCode: data.resultCode || `RES-${year}-${String(count).padStart(3, '0')}`,
    studentId: data.studentId,
    studentName: data.studentName,
    examId: data.examId,
    examTitle: data.examTitle,
    courseName: data.courseName || '',
    subjectName: data.subjectName || '',
    attemptNumber: data.attemptNumber || 1,
    marksObtained: data.marksObtained,
    maxMarks: data.maxMarks,
    percentage: gradeCalc.percentage,
    grade: gradeCalc.grade,
    resultStatus: gradeCalc.resultStatus,
    publishedDate: new Date().toISOString().split('T')[0],
    ...data,
  };

  cachedResults = [newResult, ...cachedResults];
  notifyChange();

  // Async persist to Supabase
  // Admin-entered marks go straight into the gradebook. student_attempts is
  // written only by the submit_assessment_attempt RPC.
  const isUuid = (v?: string) =>
    Boolean(v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v));
  supabase
    .from('results')
    .insert({
      id: newResult.id,
      assessment_id: isUuid(newResult.examId) ? newResult.examId : null,
      student_id: newResult.studentId,
      assessment_title: newResult.examTitle,
      subject: newResult.subjectName || '',
      subject_name: newResult.subjectName || null,
      course_name: newResult.courseName || null,
      student_name: newResult.studentName,
      score: Math.round(newResult.marksObtained),
      max_score: Math.round(newResult.maxMarks),
      marks_obtained: newResult.marksObtained,
      max_marks: newResult.maxMarks,
      percentage: newResult.percentage,
      grade: newResult.grade,
      // results.status CHECK: Passed | Failed
      status: String(newResult.resultStatus).toLowerCase().startsWith('pass') ? 'Passed' : 'Failed',
      result_status: String(newResult.resultStatus).toLowerCase().startsWith('pass') ? 'Passed' : 'Failed',
      feedback: newResult.feedback || null,
    })
    .then(({ error }: any) => {
      if (error) console.warn('resultService results insert failed:', error.message);
    }, (err: any) => {
      console.warn('resultService results insert failed:', err);
    });

  activityService.log(
    'Result Published',
    'results',
    newResult.studentName,
    `Recorded marks for ${newResult.studentName} in ${newResult.examTitle}`
  );

  return newResult;
};

export const updateStudentResult = (id: string, updates: Partial<StudentResult>): StudentResult | null => {
  const index = cachedResults.findIndex((r) => r.id === id || r.resultCode === id);
  if (index === -1) return null;

  const current = cachedResults[index];
  const marksObtained = updates.marksObtained !== undefined ? updates.marksObtained : current.marksObtained;
  const maxMarks = updates.maxMarks !== undefined ? updates.maxMarks : current.maxMarks;
  const gradeCalc = calculateGrade(marksObtained, maxMarks);

  const updated: StudentResult = {
    ...current,
    ...updates,
    marksObtained,
    maxMarks,
    percentage: gradeCalc.percentage,
    grade: gradeCalc.grade,
    resultStatus: gradeCalc.resultStatus,
  };

  cachedResults[index] = updated;
  notifyChange();

  const passed = String(updated.resultStatus).toLowerCase().startsWith('pass');
  supabase
    .from('results')
    .update({
      score: Math.round(marksObtained),
      max_score: Math.round(maxMarks),
      marks_obtained: marksObtained,
      max_marks: maxMarks,
      percentage: updated.percentage,
      grade: updated.grade,
      status: passed ? 'Passed' : 'Failed',
      result_status: passed ? 'Passed' : 'Failed',
      feedback: updated.feedback || null,
    })
    .eq('id', current.id)
    .then(({ error }: any) => {
      if (error) console.warn('resultService results update failed:', error.message);
    }, () => {});

  return updated;
};

export const deleteStudentResult = (id: string): boolean => {
  const target = cachedResults.find((r) => r.id === id || r.resultCode === id);
  if (!target) return false;

  cachedResults = cachedResults.filter((r) => r.id !== id && r.resultCode !== id);
  notifyChange();

  return true;
};

export const resultService = {
  getResults,
  fetchResults,
  getResultById,
  getResultsByStudent,
  getResultsByStudentId,
  getResultsByExamId,
  recordStudentResult,
  updateStudentResult,
  deleteStudentResult,
  onChange(cb: () => void): () => void {
    listeners.push(cb);
    return () => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
};
