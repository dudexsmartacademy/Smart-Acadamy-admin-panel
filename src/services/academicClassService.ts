import { whenSignedIn } from '../lib/supabase';
import { writeResult } from '../lib/persist';
import { supabaseAny as supabase } from '../lib/supabase';
import { AcademicClass } from '../types';
import { logActivity } from './activityService';
import { teacherService } from './teacherService';

let cachedClasses: AcademicClass[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_academic_classes_changed'));
  }
}

// live_classes.status CHECK: Upcoming | Live Now | Ended | Completed | Cancelled
function toDbLiveClassStatus(status?: string): string {
  switch (String(status || 'scheduled').toLowerCase()) {
    case 'ongoing': return 'Live Now';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return 'Upcoming';
  }
}

function rowToAcademicClass(row: any): AcademicClass {
  const teacher = teacherService.getTeacherById(row.teacher_id) || teacherService.getTeachers().find((t) => t.id === row.teacher_id || t.userId === row.teacher_id);
  const teacherName = row.teacher_profiles?.profiles?.full_name || teacher?.fullName || (teacher as any)?.name || row.teacher_name || 'Assigned Faculty';
  const batchName = row.classes?.batches?.name || row.batch_name || '';
  const courseName = row.course_offerings?.name || row.course_name || '';
  const subjectName = row.course_offerings?.subjects?.name || row.subject_name || '';

  return {
    id: row.id,
    title: row.title || 'Lecture Session',
    courseId: row.course_offering_id || '',
    courseName: courseName,
    subjectId: row.course_offerings?.subject_id || '',
    subject: subjectName,
    subjectName: subjectName,
    teacherId: row.teacher_id || '',
    teacherName: teacherName,
    batchId: row.class_id || row.batch_id || '',
    batchName: batchName,
    section: row.classes?.section_id || '',
    classroom: row.meeting_platform || row.classroom || 'Online',
    mode: (row.meeting_platform ? 'online' : 'offline') as any,
    date: row.scheduled_date || row.created_at?.split('T')[0] || '',
    startTime: row.start_time || '09:00',
    endTime: row.end_time || '10:00',
    meetLink: row.meeting_url || '',
    status: (row.status || 'scheduled') as any,
    attendanceTaken: false,
  };
}

export const fetchAcademicClasses = async (): Promise<AcademicClass[]> => {
  try {
    let { data, error } = await supabase
      .from('live_classes')
      .select(`
        id,
        class_id,
        teacher_id,
        title,
        meeting_url,
        scheduled_date,
        start_time,
        end_time,
        status,
        created_at,
        classes (
          name
        )
      `)
      .order('scheduled_date', { ascending: false });

    if (error) {
      const fb = await supabase
        .from('live_classes')
        .select('*')
        .order('scheduled_date', { ascending: false });
      if (!fb.error && fb.data) {
        data = fb.data;
        error = null;
      }
    }

    if (!error && data) {
      cachedClasses = data.map(rowToAcademicClass);
      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch academic classes from Supabase:', err);
  }
  return cachedClasses;
};

// Initial background fetch
whenSignedIn(fetchAcademicClasses);

export const subscribeAcademicClasses = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const getAcademicClasses = (): AcademicClass[] => {
  return cachedClasses;
};

export const getAcademicClassById = (id: string): AcademicClass | undefined => {
  return cachedClasses.find((c) => c.id === id);
};

export const getAcademicClassesByBatch = (batchId: string): AcademicClass[] => {
  return cachedClasses.filter((c) => c.batchId === batchId);
};

export const getAcademicClassesByTeacher = (teacherId: string): AcademicClass[] => {
  return cachedClasses.filter((c) => c.teacherId === teacherId);
};

export const createAcademicClass = (data: Omit<AcademicClass, 'id'>): AcademicClass => {
  const id = crypto.randomUUID();
  const newClass: AcademicClass = {
    ...data,
    id,
  };

  cachedClasses.unshift(newClass);
  notifyChange();

  logActivity({
    action: 'Scheduled Academic Class',
    user: 'Super Admin',
    details: `Scheduled ${newClass.title} for ${newClass.courseName || ''} (${newClass.batchName || ''})`,
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  supabase
    .from('live_classes')
    .insert({
      id: newClass.id,
      // Live schema: teacher_id references profiles.id; subject/topic/teacher
      // name are text columns. batchId is a batch, not a classes.id, so it is
      // not written to class_id.
      title: newClass.title,
      teacher_id: newClass.teacherId || undefined,
      teacher_name: newClass.teacherName || null,
      subject: newClass.subjectName || newClass.subject || newClass.courseName || null,
      topic: newClass.title,
      platform: newClass.mode === 'online' ? 'Google Meet' : 'Classroom',
      meeting_url: newClass.meetLink || '',
      date: newClass.date,
      scheduled_date: newClass.date,
      start_time: newClass.startTime,
      end_time: newClass.endTime,
      status: toDbLiveClassStatus(newClass.status) as any,
    })
    .then(writeResult('Updating the class'), (err: any) => {
      console.warn('Supabase class insertion failed:', err);
    });

  return newClass;
};

export const updateAcademicClass = (id: string, updates: Partial<AcademicClass>): AcademicClass | null => {
  const idx = cachedClasses.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  cachedClasses[idx] = { ...cachedClasses[idx], ...updates };
  const updated = cachedClasses[idx];
  notifyChange();

  logActivity({
    action: 'Updated Academic Class',
    user: 'Super Admin',
    details: `Updated class: ${updated.title}`,
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  supabase
    .from('live_classes')
    .update({
      title: updated.title,
      date: updated.date,
      scheduled_date: updated.date,
      start_time: updated.startTime,
      end_time: updated.endTime,
      meeting_url: updated.meetLink,
      status: toDbLiveClassStatus(updated.status) as any,
    })
    .eq('id', id)
    .then(writeResult('Updating the class'), (err: any) => {
      console.warn('Supabase class update failed:', err);
    });

  return updated;
};

export const deleteAcademicClass = (id: string): boolean => {
  const cls = cachedClasses.find(c => c.id === id);
  if (!cls) return false;

  cachedClasses = cachedClasses.filter((c) => c.id !== id);
  notifyChange();

  logActivity({
    action: 'Deleted Academic Class',
    user: 'Super Admin',
    details: `Deleted class: ${cls.title}`,
    timestamp: new Date().toISOString(),
    status: 'warning'
  });

  supabase
    .from('live_classes')
    .delete()
    .eq('id', id)
    .then(writeResult('Deleting the class'), (err: any) => {
      console.warn('Supabase class deletion failed:', err);
    });

  return true;
};

export const getClasses = getAcademicClasses;
export const getClassById = getAcademicClassById;
export const createClass = createAcademicClass;
export const updateClass = updateAcademicClass;
export const deleteClass = deleteAcademicClass;

export const academicClassService = {
  getClasses: getAcademicClasses,
  getClassById: getAcademicClassById,
  createClass: createAcademicClass,
  updateClass: updateAcademicClass,
  deleteClass: deleteAcademicClass,
  getAcademicClasses,
  getAcademicClassById,
  getAcademicClassesByBatch,
  getAcademicClassesByTeacher,
  createAcademicClass,
  updateAcademicClass,
  deleteAcademicClass,
  subscribe: subscribeAcademicClasses,
};
