import { whenSignedIn } from '../lib/supabase';
import { supabaseAny } from '../lib/supabase';
import type { TeacherClass } from '../types';
import { teacherService } from './teacherService';

let cachedClasses: TeacherClass[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (error) {
      console.error('Teacher class listener failed:', error);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_teacher_classes_changed'));
  }
}

function timeValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  const time = value.includes('T') ? value.split('T')[1] || '' : value;
  return time.slice(0, 5);
}

function mapStatus(value: unknown, date?: string): TeacherClass['status'] {
  if (typeof value !== 'string') return 'unknown';
  // Sessions stay "Upcoming" in the database; derive the status from the date.
  if (date && ['upcoming', 'scheduled'].includes(value.toLowerCase())) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (date < today) return 'completed';
    if (date === today) return 'live';
  }
  switch (value.toLowerCase()) {
    case 'live':
    case 'live now':
    case 'active':
      return 'live';
    case 'completed':
    case 'ended':
    case 'closed':
      return 'completed';
    case 'scheduled':
    case 'upcoming':
      return 'upcoming';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

export const fetchTeacherClasses = async (): Promise<TeacherClass[]> => {
  try {
    const { data, error } = await supabaseAny
      .from('live_classes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    cachedClasses = (data || []).map((row: Record<string, unknown>) => {
      const teacherId = typeof row.teacher_id === 'string' ? row.teacher_id : '';
      const teacher = teacherService.getTeacherById(teacherId);
      const title = (row.title as string) || (row.topic as string) || 'Untitled Class';
      const subject = (row.subject as string) || (row.description as string) || (row.topic as string) || 'General';
      const teacherName = (row.teacher_name as string) || teacher?.fullName || '';
      const meetingPlatform = (row.platform as string) || (row.meeting_platform as string) || 'Google Meet';

      return {
        id: typeof row.id === 'string' ? row.id : '',
        title,
        courseId: '',
        courseName: subject,
        subject,
        teacherId,
        teacherName,
        batch: (row.batch as string) || '',
        section: '',
        room: meetingPlatform,
        mode: 'online',
        date: typeof row.scheduled_date === 'string'
          ? row.scheduled_date.split('T')[0]
          : typeof row.date === 'string'
          ? row.date.split('T')[0]
          : '',
        startTime: timeValue(row.start_time),
        endTime: timeValue(row.end_time),
        studentCount: typeof row.student_count === 'number' ? row.student_count : null,
        status: mapStatus(
          row.status,
          typeof row.scheduled_date === 'string'
            ? row.scheduled_date.split('T')[0]
            : typeof row.date === 'string'
            ? row.date.split('T')[0]
            : undefined,
        ),
        meetLink: typeof row.meeting_url === 'string' ? row.meeting_url : '',
        classId: typeof row.class_id === 'string' ? row.class_id : undefined,
        batches: Array.isArray(row.batches) ? (row.batches as string[]) : [],
        topic: typeof row.topic === 'string' ? row.topic : '',
      };
    });
    notifyChange();
  } catch (error) {
    console.error('Failed to fetch live classes from Supabase:', error);
    cachedClasses = [];
    notifyChange();
  }
  return cachedClasses;
};

whenSignedIn(fetchTeacherClasses);

export const subscribeTeacherClasses = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

/** What the admin enters when scheduling or editing a teacher's live session. */
export interface LiveSessionInput {
  /** Global batch names ("Batch 1", ...) whose students see the session. */
  batches: string[];
  teacherUserId: string;
  teacherName: string;
  title: string;
  subject: string;
  topic: string;
  date: string;
  startTime: string;
  endTime: string;
  meetLink: string;
  platform: string;
}

// Matches the live_classes columns written by the teacher portal (liveClassService).
function toLiveClassRow(input: LiveSessionInput) {
  return {
    ...toLiveClassUpdate(input),
    status: 'Upcoming',
    mode: 'Online',
  };
}

// Editing keeps the session's current status (e.g. Completed).
function toLiveClassUpdate(input: LiveSessionInput) {
  return {
    class_id: null,
    batches: input.batches,
    teacher_id: input.teacherUserId,
    teacher_name: input.teacherName,
    teacher_title: 'Faculty',
    title: input.title.trim(),
    subject: input.subject.trim(),
    topic: input.topic.trim() || input.subject.trim(),
    date: input.date,
    scheduled_date: input.date,
    start_time: input.startTime,
    end_time: input.endTime,
    platform: input.platform || 'Google Meet',
    meeting_url: input.meetLink.trim(),
  };
}

export const teacherClassService = {
  fetchClasses: fetchTeacherClasses,

  getClasses(): TeacherClass[] {
    return cachedClasses;
  },

  getClassesByTeacherId(teacherId: string): TeacherClass[] {
    const teacher = teacherService.getTeacherById(teacherId);
    const candidateIds = [teacherId, teacher?.id, teacher?.userId, teacher?.teacherId]
      .filter(Boolean)
      .map((s) => s?.toLowerCase());
    return cachedClasses.filter((item) => {
      if (item.teacherId && candidateIds.includes(item.teacherId.toLowerCase())) return true;
      if (
        teacher?.fullName &&
        item.teacherName &&
        item.teacherName.trim().toLowerCase() === teacher.fullName.trim().toLowerCase()
      )
        return true;
      return false;
    });
  },

  getClassById(id: string): TeacherClass | undefined {
    return cachedClasses.find((item) => item.id === id);
  },

  /**
   * Schedules one live session for the selected batches.
   * live_classes.teacher_id is the teacher's auth user id (profiles.id), which
   * is also what the teacher portal and RLS use.
   */
  async createClass(input: LiveSessionInput): Promise<TeacherClass> {
    const { data, error } = await supabaseAny
      .from('live_classes')
      .insert(toLiveClassRow(input))
      .select('id')
      .single();
    if (error || !data) {
      throw new Error(`Could not schedule the live class: ${error?.message || 'no row returned'}`);
    }
    await fetchTeacherClasses();
    const created = cachedClasses.find((item) => item.id === data.id);
    if (!created) throw new Error('The live class was saved but could not be reloaded.');
    return created;
  },

  async updateClass(id: string, input: LiveSessionInput): Promise<TeacherClass> {
    const { data, error } = await supabaseAny
      .from('live_classes')
      .update(toLiveClassUpdate(input))
      .eq('id', id)
      .select('id');
    if (error) throw new Error(`Could not update the live class: ${error.message}`);
    if (!data || data.length === 0) throw new Error('The live class was not found or you cannot edit it.');
    await fetchTeacherClasses();
    return cachedClasses.find((item) => item.id === id) as TeacherClass;
  },

  async deleteClass(id: string): Promise<void> {
    const { data, error } = await supabaseAny
      .from('live_classes')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw new Error(`Could not delete the live class: ${error.message}`);
    if (!data || data.length === 0) throw new Error('The live class was not found or you cannot delete it.');
    await fetchTeacherClasses();
  },

  subscribe: subscribeTeacherClasses,
};

