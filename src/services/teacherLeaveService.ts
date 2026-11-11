import { whenSignedIn } from '../lib/supabase';
import { supabaseAny } from '../lib/supabase';
import { TeacherLeave, LeaveStatus } from '../types';
import { activityService } from './activityService';
import { teacherAttendanceService } from './teacherAttendanceService';
import { teacherService } from './teacherService';

const STORAGE_KEY = 'dudex_teacher_leave_cache';

// Data comes only from Supabase; an older browser copy is discarded so stale
// or demo records never show before the live data loads.
function loadCachedLeave(): TeacherLeave[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  return [];
}

let cachedLeave: TeacherLeave[] = loadCachedLeave();
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_teacher_leave_changed'));
  }
}

function rowToLeave(row: any): TeacherLeave {
  const teacher = teacherService.getTeacherById(row.teacher_id);
  const teacherName = row.teacher_name || teacher?.fullName || 'Faculty Member';
  const department = teacher?.department || 'Academics';

  return {
    id: row.id,
    teacherId: teacher?.id || row.teacher_id || '',
    teacherName,
    department,
    leaveType: (row.leave_type as any) || 'casual',
    fromDate: row.from_date || row.start_date || row.created_at?.split('T')[0] || '',
    toDate: row.to_date || row.end_date || row.created_at?.split('T')[0] || '',
    totalDays: Number(row.total_days || row.days_count || 1),
    reason: row.reason || '',
    submittedDate: row.submitted_at || row.created_at || new Date().toISOString(),
    status: ((row.status || 'pending').toLowerCase() as LeaveStatus),
    reviewedBy: row.reviewed_by || undefined,
    reviewedDate: row.reviewed_at || undefined,
    reviewRemarks: row.review_remarks || undefined,
  };
}

export const fetchTeacherLeave = async (): Promise<TeacherLeave[]> => {
  try {
    const { data, error } = await supabaseAny
      .from('teacher_leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      cachedLeave = data.map(rowToLeave);
      notifyChange();
    }
  } catch {
    // If table doesn't exist on schema cache, keep in-memory cache
  }
  return cachedLeave;
};

// Initial background fetch
whenSignedIn(fetchTeacherLeave);

try {
  supabaseAny
    .channel('admin-teacher-leave-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'teacher_leave_requests' },
      () => {
        void fetchTeacherLeave();
      }
    )
    .subscribe();
} catch (err) {
  console.warn('Could not subscribe to teacher_leave_requests realtime:', err);
}


export const subscribeTeacherLeave = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const teacherLeaveService = {
  getLeaveRequests(): TeacherLeave[] {
    return cachedLeave;
  },

  fetchLeaveRequests: fetchTeacherLeave,

  getLeaveById(id: string): TeacherLeave | undefined {
    return cachedLeave.find((l) => l.id === id);
  },

  getLeaveByTeacherId(teacherId: string): TeacherLeave[] {
    if (!teacherId) return [];
    const teacher = teacherService.getTeacherById(teacherId);
    const possible = new Set<string>();
    possible.add(teacherId.toLowerCase());
    if (teacher?.id) possible.add(teacher.id.toLowerCase());
    if (teacher?.teacherId) possible.add(teacher.teacherId.toLowerCase());
    if (teacher?.userId) possible.add(teacher.userId.toLowerCase());
    if ((teacher as any)?.tempId) possible.add((teacher as any).tempId.toLowerCase());

    return cachedLeave.filter((l) => possible.has((l.teacherId || '').toLowerCase()));
  },

  /** Records a leave request for a teacher (by the administration). */
  async submitLeaveRequest(data: Omit<TeacherLeave, 'id' | 'submittedDate' | 'status'>): Promise<TeacherLeave> {
    const teacher = teacherService.getTeacherById(data.teacherId);
    // teacher_leave_requests.teacher_id is the teacher's auth user id.
    const teacherUserId = teacher?.userId || '';
    if (!teacherUserId) throw new Error('This teacher has no linked login account, so leave cannot be recorded.');

    const { data: row, error } = await supabaseAny
      .from('teacher_leave_requests')
      .insert({
        teacher_id: teacherUserId,
        teacher_name: data.teacherName,
        department: teacher?.department || null,
        total_days: data.totalDays,
        leave_type: data.leaveType,
        from_date: data.fromDate,
        to_date: data.toDate,
        reason: data.reason,
        status: 'pending',
      })
      .select('*')
      .single();
    if (error || !row) throw new Error(`Could not submit the leave request: ${error?.message || 'no row saved'}`);

    activityService.log(
      'Leave Request Submitted',
      'leave',
      data.teacherName,
      `Submitted ${data.leaveType} leave request for ${data.totalDays} day(s) (${data.fromDate} to ${data.toDate})`
    );
    await fetchTeacherLeave();
    return rowToLeave(row);
  },

  /** Approves or rejects a request; approved leave is recorded in attendance. */
  async updateLeaveStatus(
    id: string,
    status: LeaveStatus,
    reviewerNotes?: string,
    adminName = 'Administrator'
  ): Promise<TeacherLeave> {
    const current = cachedLeave.find((l) => l.id === id);
    if (!current) throw new Error('The leave request was not found.');

    const reviewedAt = new Date().toISOString();
    const { data, error } = await supabaseAny
      .from('teacher_leave_requests')
      .update({
        status,
        reviewed_by: adminName,
        reviewed_at: reviewedAt,
        review_remarks: reviewerNotes || null,
      })
      .eq('id', id)
      .select('id');
    if (error) throw new Error(`Could not update the leave request: ${error.message}`);
    if (!data || data.length === 0) throw new Error('The leave request was not found.');

    if (status === 'approved') {
      // Every day of the approved leave appears in the teacher's attendance.
      await teacherAttendanceService.markLeaveRange(
        current.teacherId,
        current.fromDate,
        current.toDate || current.fromDate,
        `Approved ${current.leaveType} leave: ${current.reason}`,
      );
    } else if (status === 'rejected') {
      // Revert any leave attendance record so it does NOT appear as leave in the teacher portal
      await teacherAttendanceService.revertLeaveRange(
        current.teacherId,
        current.fromDate,
        current.toDate || current.fromDate,
        `Leave rejected: ${reviewerNotes || current.reason}`
      );
    }

    try {
      localStorage.setItem('dudex_teacher_leave_updated_at', Date.now().toString());
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dudex_teacher_leave_changed'));
      window.dispatchEvent(new CustomEvent('dudex_teacher_attendance_changed'));
    }

    activityService.log(
      `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      'leave',
      current.teacherName,
      `${status === 'approved' ? 'Approved' : 'Rejected'} leave request for ${current.teacherName} (${current.totalDays} days)`
    );
    await fetchTeacherLeave();
    return { ...current, status, reviewedBy: adminName, reviewedDate: reviewedAt, reviewRemarks: reviewerNotes };
  },

  async deleteLeave(id: string): Promise<void> {
    const { error } = await supabaseAny.from('teacher_leave_requests').delete().eq('id', id);
    if (error) throw new Error(`Could not delete the leave request: ${error.message}`);
    await fetchTeacherLeave();
  },

  subscribe: subscribeTeacherLeave,
};
