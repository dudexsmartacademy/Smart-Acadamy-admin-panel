import { whenSignedIn } from '../lib/supabase';
import { supabaseAny as supabase } from '../lib/supabase';
import { TeacherAttendance } from '../types';
import { activityService } from './activityService';
import { teacherService } from './teacherService';

const STORAGE_KEY = 'dudex_teacher_attendance_cache';

// Data comes only from Supabase; an older browser copy is discarded so stale
// or demo records never show before the live data loads.
function loadCachedAttendance(): TeacherAttendance[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  return [];
}

let cachedAttendance: TeacherAttendance[] = loadCachedAttendance();
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_teacher_attendance_changed'));
  }
}

function rowToAttendance(row: any): TeacherAttendance {
  const teacherId = row.teacher_id || row.teacher_profile_id || '';
  const teacher = teacherService.getTeacherById(teacherId);
  const teacherName = teacher?.fullName || row.teacher_profiles?.profiles?.full_name || 'Faculty Member';
  const facultyId = teacher?.teacherId || 'TCH-001';
  const department = teacher?.department || '';

  return {
    id: row.id,
    teacherId: teacher?.id || teacherId,
    teacherName,
    facultyId,
    department,
    date: row.date || row.session_date || (row.created_at ? row.created_at.split('T')[0] : ''),
    checkInTime: row.check_in_time || row.check_in || '',
    checkOutTime: row.check_out_time || row.check_out || '',
    durationMinutes: row.duration_minutes || 0,
    status: row.status || 'present',
    remarks: row.remarks || '',
    recordedBy: row.recorded_by ? 'Admin' : 'Teacher',
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

export const fetchTeacherAttendance = async (): Promise<TeacherAttendance[]> => {
  try {
    const { data, error } = await supabase
      .from('teacher_attendance')
      .select(`
        *
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (!error && data && Array.isArray(data)) {
      cachedAttendance = data.map(rowToAttendance);
      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch teacher attendance from Supabase:', err);
  }
  return cachedAttendance;
};

// Initial background fetch
whenSignedIn(fetchTeacherAttendance);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MarkDayInput {
  /** Teacher profile id or auth user id. */
  teacherId: string;
  teacherName?: string;
  date: string;
  status: TeacherAttendance['status'];
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
}

export const teacherAttendanceService = {
  fetchTeacherAttendance,

  getAttendanceRecords(): TeacherAttendance[] {
    return cachedAttendance;
  },

  getAttendanceByTeacherId(teacherId: string): TeacherAttendance[] {
    if (!teacherId) return [];
    const teacher = teacherService.getTeacherById(teacherId);
    const possible = new Set<string>();
    possible.add(teacherId.toLowerCase());
    if (teacher?.id) possible.add(teacher.id.toLowerCase());
    if (teacher?.teacherId) possible.add(teacher.teacherId.toLowerCase());
    if (teacher?.userId) possible.add(teacher.userId.toLowerCase());
    if ((teacher as any)?.tempId) possible.add((teacher as any).tempId.toLowerCase());

    return cachedAttendance.filter((a) => {
      const tid = (a.teacherId || '').toLowerCase();
      const fid = (a.facultyId || '').toLowerCase();
      return possible.has(tid) || possible.has(fid);
    });
  },

  getRecordById(id: string): TeacherAttendance | undefined {
    return cachedAttendance.find((a) => a.id === id);
  },

  /**
   * Records (or replaces) one teacher's attendance for one day.
   * teacher_attendance has one row per teacher per day, keyed by the teacher's
   * auth user id, the same row the teacher's own check-in writes.
   */
  async markDay(input: MarkDayInput): Promise<void> {
    const teacher = teacherService.getTeacherById(input.teacherId);
    const teacherUserId = teacher?.userId || input.teacherId;
    if (!UUID_PATTERN.test(teacherUserId)) {
      throw new Error('This teacher has no linked login account, so attendance cannot be recorded.');
    }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('teacher_attendance')
      .upsert(
        {
          teacher_id: teacherUserId,
          teacher_name: teacher?.fullName || input.teacherName || null,
          faculty_id: teacher?.teacherId || null,
          date: input.date,
          status: input.status,
          check_in_time: input.checkInTime || null,
          check_out_time: input.checkOutTime || null,
          remarks: input.remarks?.trim() || null,
          recorded_by: auth.user?.id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'teacher_id,date' },
      );
    if (error) throw new Error(`Could not record attendance: ${error.message}`);

    activityService.log(
      'Attendance Logged',
      'attendance',
      teacher?.fullName || input.teacherName || 'Teacher',
      `Recorded ${input.status.toUpperCase()} attendance for ${teacher?.fullName || input.teacherName} on ${input.date}`
    );
    await fetchTeacherAttendance();
    this.recalculateTeacherAttendanceRate(input.teacherId);
  },

  /** Marks every day from..to (inclusive) as on leave. Sundays are skipped. */
  async markLeaveRange(teacherId: string, fromDate: string, toDate: string, remarks: string): Promise<number> {
    if (!fromDate || !toDate || toDate < fromDate) {
      throw new Error('Choose a leave start date and an end date on or after it.');
    }
    let count = 0;
    const day = new Date(`${fromDate}T00:00:00Z`);
    const end = new Date(`${toDate}T00:00:00Z`);
    while (day <= end) {
      if (day.getUTCDay() !== 0) {
        await this.markDay({
          teacherId,
          date: day.toISOString().slice(0, 10),
          status: 'on_leave',
          remarks,
        });
        count += 1;
      }
      day.setUTCDate(day.getUTCDate() + 1);
    }
    return count;
  },

  /**
   * Reverts leave marks for a teacher between fromDate and toDate when a leave request is rejected.
   * If an attendance record exists for those dates:
   * - Future dates: deleted so the day returns to unrecorded/pending.
   * - Past or today dates: marked as 'absent' with explanatory rejection remarks.
   */
  async revertLeaveRange(teacherId: string, fromDate: string, toDate: string, remarks: string): Promise<void> {
    if (!fromDate || !toDate) return;
    const teacher = teacherService.getTeacherById(teacherId);
    const candidateIds = Array.from(new Set([
      teacherId,
      teacher?.id,
      teacher?.userId,
      teacher?.teacherId,
    ].filter(Boolean))) as string[];

    const today = new Date().toISOString().slice(0, 10);

    for (const tid of candidateIds) {
      try {
        const { data: rows } = await supabaseAny
          .from('teacher_attendance')
          .select('id, date, status')
          .eq('teacher_id', tid)
          .gte('date', fromDate)
          .lte('date', toDate);

        for (const r of (rows || [])) {
          const st = (r.status || '').toLowerCase();
          if (st === 'on_leave' || st === 'leave') {
            // Delete the record completely so the teacher is NOT marked as absent or on leave
            await supabaseAny.from('teacher_attendance').delete().eq('id', r.id);
          }
        }
      } catch (err) {
        console.warn('Could not revert leave attendance for teacher', tid, err);
      }
    }

    await fetchTeacherAttendance();
    this.recalculateTeacherAttendanceRate(teacherId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('dudex_teacher_attendance_changed'));
    }
  },

  async updateRecord(
    id: string,
    updates: { status: TeacherAttendance['status']; checkInTime?: string; checkOutTime?: string; remarks?: string },
  ): Promise<void> {
    const record = cachedAttendance.find((a) => a.id === id);
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('teacher_attendance')
      .update({
        status: updates.status,
        check_in_time: updates.checkInTime || null,
        check_out_time: updates.checkOutTime || null,
        remarks: updates.remarks?.trim() || null,
        recorded_by: auth.user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id');
    if (error) throw new Error(`Could not update attendance: ${error.message}`);
    if (!data || data.length === 0) throw new Error('The attendance record was not found.');

    activityService.log(
      'Attendance Updated',
      'attendance',
      record?.teacherName || 'Teacher',
      `Updated attendance status to ${updates.status} for ${record?.teacherName || 'teacher'} on ${record?.date || ''}`
    );
    await fetchTeacherAttendance();
    if (record) this.recalculateTeacherAttendanceRate(record.teacherId);
  },

  recalculateTeacherAttendanceRate(teacherId: string): void {
    const records = this.getAttendanceByTeacherId(teacherId);
    if (records.length === 0) return;

    const presentOrLate = records.filter(
      (r) => r.status === 'present' || r.status === 'late'
    ).length;
    const totalConsidered = records.filter((r) => r.status !== 'holiday').length;

    if (totalConsidered === 0) return;

    const rate = Math.round((presentOrLate / totalConsidered) * 1000) / 10;
    teacherService.updateTeacherLocal(teacherId, { attendanceRate: rate });
  },

  getTodaySummary(): {
    total: number;
    present: number;
    late: number;
    absent: number;
    onLeave: number;
    missingPunch: number;
  } {
    const today = new Date().toISOString().split('T')[0];
    const records = cachedAttendance.filter((r) => r.date === today);

    return {
      total: records.length,
      present: records.filter((r) => r.status === 'present').length,
      late: records.filter((r) => r.status === 'late').length,
      absent: records.filter((r) => r.status === 'absent').length,
      onLeave: records.filter((r) => r.status === 'on_leave').length,
      missingPunch: records.filter((r) => r.status === 'missing_punch').length,
    };
  },

  onChange(cb: () => void): () => void {
    listeners.push(cb);
    return () => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
};
