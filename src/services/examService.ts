import { whenSignedIn } from '../lib/supabase';
import { persist, writeResult } from '../lib/persist';
import { supabaseAny as supabase } from '../lib/supabase';
import { StudentExam } from '../types';
import { activityService } from './activityService';
import { teacherService } from './teacherService';

let cachedExams: StudentExam[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_exams_changed'));
  }
}

function rowToStudentExam(row: any): StudentExam {
  // Parsed from assessments row
  const startAt = row.start_date || row.start_at || row.created_at || '';
  const endAt = row.end_date || row.end_at || startAt;
  const startDate = startAt ? startAt.split('T')[0] : '';
  const startTime = startAt && startAt.includes('T') ? startAt.split('T')[1].substring(0, 5) : '10:00';
  const endDate = endAt ? endAt.split('T')[0] : startDate;
  const endTime = endAt && endAt.includes('T') ? endAt.split('T')[1].substring(0, 5) : '13:00';

  const teachers = teacherService.getTeachers();
  const teacher = teachers.find((t) => t.id === row.created_by || t.userId === row.created_by);
  const teacherProfile = row.teacher_profiles?.profiles;
  const teacherName = teacherProfile?.full_name || (row.profiles as any)?.full_name || teacher?.fullName || (teacher as any)?.name || 'Faculty';

  const durationMin = row.duration_minutes || Math.round((row.duration_seconds || 7200) / 60);
  const batchName = (Array.isArray(row.batches) && row.batches[0]) || row.classes?.name || row.batch_name || 'Class Batch';
  const subject = row.subject || row.classes?.name || 'Core Module';

  return {
    id: row.id,
    examCode: `EXM-${row.id.substring(0, 8)}`,
    title: row.title || 'Examination',
    courseId: row.class_id || '',
    courseName: row.classes?.name || 'Academic Course',
    subject,
    subjectName: subject,
    teacherId: row.created_by || '',
    teacherName,
    batchId: row.class_id || '',
    batchName,
    startDate,
    startTime,
    endDate,
    endTime,
    durationMinutes: durationMin,
    totalMarks: row.total_marks || row.max_marks || 100,
    passingMarks: row.passing_marks || row.pass_marks || (row.pass_percentage ? Math.round(((row.max_marks || 100) * row.pass_percentage) / 100) : 40),
    status: (row.status || 'scheduled') as any,
    enrolledStudentsCount: 0,
    attemptsCount: 0,
    resultsPublished: row.status === 'completed' || row.show_result_immediately,
  };
}

export const fetchExams = async (): Promise<StudentExam[]> => {
  try {
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        classes (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      cachedExams = data.map(rowToStudentExam);
      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch exams from Supabase:', err);
  }
  return cachedExams;
};

// Initial background fetch
whenSignedIn(fetchExams);

export const subscribeExams = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const getExams = (): StudentExam[] => {
  return cachedExams;
};

export const getExamById = (id: string): StudentExam | undefined => {
  return cachedExams.find((e) => e.id === id || e.examCode === id);
};

export const createExam = (data: Partial<StudentExam>): StudentExam => {
  const id = crypto.randomUUID();
  const year = new Date().getFullYear();
  const count = cachedExams.length + 1;
  const newExam: StudentExam = {
    id,
    examCode: data.examCode || `EXM-${year}-E${count}`,
    title: data.title || 'Examination',
    courseId: data.courseId,
    courseName: data.courseName || '',
    subject: data.subject,
    subjectName: data.subjectName || '',
    teacherId: data.teacherId,
    teacherName: data.teacherName || '',
    batchId: data.batchId,
    batchName: data.batchName || '',
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    startTime: data.startTime || '10:00 AM',
    endDate: data.endDate || data.startDate || new Date().toISOString().split('T')[0],
    endTime: data.endTime || '01:00 PM',
    durationMinutes: data.durationMinutes || 180,
    totalMarks: data.totalMarks || 100,
    passingMarks: data.passingMarks || 50,
    status: data.status || 'scheduled',
    enrolledStudentsCount: data.enrolledStudentsCount || 0,
    attemptsCount: 0,
    resultsPublished: false,
    ...data,
  };

  cachedExams = [newExam, ...cachedExams];
  notifyChange();

  activityService.log(
    'Exam Scheduled',
    'exams',
    newExam.title,
    `Scheduled examination ${newExam.title} (${newExam.examCode}) for ${newExam.courseName}`
  );

  // Saved to the live assessments table for the exam's global batch; a
  // failure is reported and the list reloaded.
  const toIso = (date: string, time?: string) => {
    const t = (time || '10:00').trim();
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(t);
    let h = m ? Number(m[1]) : 10;
    const min = m ? m[2] : '00';
    if (m?.[3]) h = (h % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
    return new Date(`${date}T${String(h).padStart(2, '0')}:${min}:00`).toISOString();
  };
  persist(
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return supabase.from('assessments').insert({
        title: newExam.title,
        class_id: null,
        batches: newExam.batchName ? [newExam.batchName] : [],
        type: 'MCQ',
        subject: newExam.subjectName || 'General',
        duration_minutes: newExam.durationMinutes || 120,
        max_marks: newExam.totalMarks,
        total_marks: newExam.totalMarks,
        passing_marks: newExam.passingMarks,
        pass_percentage: Math.round(((newExam.passingMarks || 40) / (newExam.totalMarks || 100)) * 100),
        start_date: toIso(newExam.startDate, newExam.startTime),
        end_date: toIso(newExam.endDate, newExam.endTime),
        status: (newExam.status || 'scheduled').toLowerCase(),
        published: true,
        created_by: session?.user?.id || null,
      });
    })(),
    'Scheduling the exam',
    fetchExams,
  );

  return newExam;
};

export const updateExam = (id: string, updates: Partial<StudentExam>): StudentExam | null => {
  const index = cachedExams.findIndex((e) => e.id === id);
  if (index === -1) return null;

  cachedExams[index] = { ...cachedExams[index], ...updates };
  const updated = cachedExams[index];
  notifyChange();

  activityService.log(
    'Exam Details Updated',
    'exams',
    updated.title,
    `Updated parameters for exam ${updated.title}`
  );

  supabase
    .from('assessments')
    .update({
      title: updated.title,
      max_marks: updated.totalMarks,
      total_marks: updated.totalMarks,
      passing_marks: updated.passingMarks,
      pass_percentage: Math.round(((updated.passingMarks || 40) / (updated.totalMarks || 100)) * 100),
      duration_minutes: updated.durationMinutes || 120,
      duration_seconds: (updated.durationMinutes || 120) * 60,
      status: (updated.status || 'scheduled').toLowerCase() as any,
    })
    .eq('id', id)
    .then(writeResult('Updating the exam details'), (err: any) => {
      console.warn('Supabase assessment update failed:', err);
    });

  return updated;
};

export const updateExamStatus = (id: string, status: StudentExam['status']): StudentExam | null => {
  return updateExam(id, { status });
};

export const deleteExam = (id: string): boolean => {
  const target = cachedExams.find((e) => e.id === id);
  if (!target) return false;

  cachedExams = cachedExams.filter((e) => e.id !== id);
  notifyChange();

  activityService.log(
    'Exam Removed',
    'exams',
    target.title,
    `Cancelled/Removed exam ${target.title}`
  );

  supabase
    .from('assessments')
    .delete()
    .eq('id', id)
    .then(writeResult('Deleting the exam'), (err: any) => {
      console.warn('Supabase assessment deletion failed:', err);
    });

  return true;
};

export const examService = {
  getExams,
  getExamById,
  createExam,
  updateExam,
  updateExamStatus,
  deleteExam,
  subscribe: subscribeExams,
};
