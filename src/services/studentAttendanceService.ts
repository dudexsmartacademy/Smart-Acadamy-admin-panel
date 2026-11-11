import { whenSignedIn } from '../lib/supabase';
import { persist, writeResult } from '../lib/persist';
import { supabaseAny as supabase } from '../lib/supabase';
import { StudentAttendance, StudentAttendanceSummary, AttendanceStatus } from '../types';
import { studentService } from './studentService';
import { teacherService } from './teacherService';
import { activityService } from './activityService';

let cachedStudentAttendance: StudentAttendance[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_student_attendance_changed'));
  }
}

// DDL: attendance_records(id, session_id FK→class_sessions, student_id FK→student_profiles,
//   status attendance_status enum, marked_by FK→teacher_profiles, marked_at, remarks)
// DDL: class_sessions(id, class_id FK→classes, teacher_id FK→teacher_profiles,
//   session_date DATE, start_time, end_time, mode, room, meeting_url)
// Columns that do NOT exist on attendance_records: teacher_id, class_id, date,
//   session_time, subject, mode, student_name
function rowToAttendance(row: any): StudentAttendance {
  const session = row.class_sessions || {};
  const students = studentService.getStudents();
  const matchedStudent = students.find((s) =>
    s.id === row.student_id ||
    s.userId === row.student_id ||
    (Boolean(row.student_name && s.fullName) && s.fullName.toLowerCase().trim() === String(row.student_name).toLowerCase().trim())
  );
  const studentName = row.student_name || row.student_profiles?.profiles?.full_name || matchedStudent?.fullName || 'Enrolled Student';

  const teachers = teacherService.getTeachers();
  const matchedTeacher = teachers.find((t) => t.id === row.teacher_id || t.id === row.marked_by || t.userId === row.teacher_id || t.userId === row.marked_by);
  const markerProfile = row.teacher_profiles?.profiles || row.marker_profiles?.profiles || {};
  const teacherName = row.teacher_name || markerProfile.full_name || matchedTeacher?.fullName || (matchedTeacher as any)?.name || 'vegeta';

  const rawStatus = String(row.status || 'present');
  const capitalizedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

  return {
    id: row.id,
    studentId: matchedStudent?.id || row.student_id || '',
    studentName,
    courseName: matchedStudent?.courseName || 'Academic Course',
    batchName: matchedStudent?.batchName || row.batch_name || '',
    subject: row.subject || 'Core Module',
    subjectName: row.subject || 'Core Module',
    teacherName,
    date: row.date || session.session_date || (row.marked_at ? row.marked_at.split('T')[0] : (row.created_at ? row.created_at.split('T')[0] : '')),
    session: row.session_time || session.mode || row.mode || 'Regular Session',
    status: capitalizedStatus as any,
    remarks: row.remarks || '',
    updatedAt: row.marked_at || row.created_at || new Date().toISOString(),
    ...({ studentUserId: row.student_id || matchedStudent?.userId }),
  } as StudentAttendance;
}

export const fetchStudentAttendance = async (): Promise<StudentAttendance[]> => {
  try {
    let { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.warn('Direct attendance select failed, attempting fallback with session join:', error.message);
      const fallbackRes = await supabase
        .from('attendance_records')
        .select(`
          id,
          student_id,
          status,
          marked_by,
          marked_at,
          remarks,
          created_at,
          session_id,
          class_sessions (
            session_date,
            mode,
            class_id,
            teacher_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000);
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (!error && data) {
      cachedStudentAttendance = data.map(rowToAttendance);
      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch student attendance from Supabase:', err);
  }
  return cachedStudentAttendance;
};

// Initial background fetch & Realtime subscription
whenSignedIn(() => {
  void fetchStudentAttendance();
  try {
    supabase
      .channel('public:attendance_records')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        () => {
          void fetchStudentAttendance();
        }
      )
      .subscribe();
  } catch (e) {
    console.error('Failed to subscribe to attendance_records realtime channel:', e);
  }
});

// Periodic fallback polling
if (typeof window !== 'undefined') {
  setInterval(() => {
    void fetchStudentAttendance();
  }, 10000);
}

export const subscribeStudentAttendance = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const getStudentAttendance = (studentId?: string): StudentAttendance[] => {
  if (studentId) {
    // attendance_records.student_id references student_profiles.id, but
    // the admin panel often passes student_profiles.id. Try the student's
    // userId as well so cross-panel records are found.
    const student = studentService.getStudentById(studentId);
    const altId = student?.userId;
    return cachedStudentAttendance.filter(
      (a) => a.studentId === studentId || (altId && a.studentId === altId)
    );
  }
  return cachedStudentAttendance;
};

export const getAttendanceRecords = getStudentAttendance;

export const getAttendanceByStudentId = (studentId: string): StudentAttendance[] => {
  return getStudentAttendance(studentId);
};

export const getAttendanceById = (id: string): StudentAttendance | undefined => {
  return cachedStudentAttendance.find((a) => a.id === id);
};

export const recalculateStudentAttendancePercentage = (studentId: string): void => {
  const records = getStudentAttendance(studentId);
  if (records.length === 0) return;

  const presentCount = records.filter(
    (r) => r.status === 'Present' || r.status === 'present' || r.status === 'Late' || r.status === 'late' || r.status === 'Excused'
  ).length;
  const totalConsidered = records.filter(
    (r) =>
      r.status !== 'Not Applicable' &&
      r.status !== 'not_applicable' &&
      r.status !== 'Not Marked' &&
      r.status !== 'not_marked'
  ).length;

  if (totalConsidered === 0) return;

  const rate = Math.round((presentCount / totalConsidered) * 100);
  studentService.updateStudent(studentId, { attendancePercentage: rate });
};

export const recordStudentAttendance = (data: Partial<StudentAttendance> & {
  studentId: string;
  studentName: string;
  courseName: string;
  batchName: string;
  subjectName: string;
  teacherName: string;
  date: string;
  status: StudentAttendance['status'];
}): StudentAttendance => {
  const newRecord: StudentAttendance = {
    id: crypto.randomUUID(),
    studentId: data.studentId,
    studentName: data.studentName,
    courseName: data.courseName,
    batchName: data.batchName,
    subject: data.subject || data.subjectName || 'Core Module',
    subjectName: data.subjectName || data.subject || 'Core Module',
    teacherName: data.teacherName,
    date: data.date,
    session: data.session || 'Regular Session',
    status: data.status,
    remarks: data.remarks || 'Regular attendance',
    updatedAt: new Date().toISOString(),
    ...data,
  };

  cachedStudentAttendance = [newRecord, ...cachedStudentAttendance];
  notifyChange();
  recalculateStudentAttendancePercentage(data.studentId);

  activityService.log(
    'Student Attendance Recorded',
    'attendance',
    data.studentName,
    `Recorded ${String(data.status).toUpperCase()} for ${data.studentName} in ${newRecord.subjectName} on ${data.date}`
  );

  // Live schema: attendance_records(student_id -> profiles.id, batch_name,
  // subject, date, session_time, status 'Present'|'Absent'|'Late'|'Excused').
  const statusLower = String(newRecord.status || 'present').toLowerCase();
  const dbStatus =
    statusLower === 'absent' ? 'Absent' : statusLower === 'late' ? 'Late' : statusLower === 'excused' ? 'Excused' : 'Present';
  const student = studentService.getStudentById(newRecord.studentId);
  persist(
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return supabase.from('attendance_records').insert({
        student_id: student?.userId || newRecord.studentId,
        class_id: null,
        batch_name: newRecord.batchName || null,
        teacher_id: session?.user?.id || null,
        subject: newRecord.subjectName || 'General',
        date: newRecord.date,
        session_time: newRecord.session || 'Regular Session',
        status: dbStatus,
        mode: 'offline',
      });
    })(),
    'Recording student attendance',
    fetchStudentAttendance,
  );

  return newRecord;
};

export const updateStudentAttendanceRecord = (
  id: string,
  updates: Partial<StudentAttendance>
): StudentAttendance | null => {
  const index = cachedStudentAttendance.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const updatedRecord = {
    ...cachedStudentAttendance[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  cachedStudentAttendance[index] = updatedRecord;
  notifyChange();
  recalculateStudentAttendancePercentage(updatedRecord.studentId);

  activityService.log(
    'Student Attendance Corrected',
    'attendance',
    updatedRecord.studentName,
    `Updated attendance status to ${updatedRecord.status} for ${updatedRecord.studentName} on ${updatedRecord.date}`
  );

  // Only update status and remarks (valid DDL columns on attendance_records)
  const statusLower = String(updatedRecord.status || 'present').toLowerCase();
  const validStatus = ['present', 'absent', 'late', 'excused'].includes(statusLower) ? statusLower : 'present';

  supabase
    .from('attendance_records')
    .update({
      status: validStatus,
      remarks: updatedRecord.remarks || null,
    })
    .eq('id', id)
    .then(writeResult('Updating the student attendance'), (err: any) => {
      console.warn('Supabase attendance update failed:', err);
    });

  return updatedRecord;
};

export const getStudentAttendanceSummary = (studentId: string): StudentAttendanceSummary | null => {
  const student = studentService.getStudentById(studentId);
  if (!student) return null;

  const records = getStudentAttendance(studentId);
  const totalConducted = records.filter(
    (r) => r.status !== 'Not Marked' && r.status !== 'not_marked'
  ).length;
  const present = records.filter((r) => r.status === 'Present' || r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'Absent' || r.status === 'absent').length;
  const late = records.filter((r) => r.status === 'Late' || r.status === 'late').length;
  const excused = records.filter((r) => r.status === 'Excused' || r.status === 'excused').length;
  const pct = student.attendancePercentage || (totalConducted ? Math.round(((present + late + excused) / totalConducted) * 100) : 100);

  let riskStatus: 'safe' | 'warning' | 'critical' = 'safe';
  if (pct < 75) riskStatus = 'critical';
  else if (pct < 85) riskStatus = 'warning';

  return {
    studentId: student.id,
    studentName: student.fullName,
    studentIdCode: student.studentId,
    courseName: student.course || student.courseName || '',
    batchName: student.batch || student.batchName || '',
    totalConducted,
    present,
    absent,
    late,
    excused,
    percentage: pct,
    riskStatus,
  };
};

export const saveBulkBatchAttendance = (
  items: {
    studentId: string;
    studentName: string;
    batchName: string;
    subject?: string;
    date: string;
    status: AttendanceStatus;
  }[]
): StudentAttendance[] => {
  const updatedList = [...cachedStudentAttendance];

  items.forEach((item) => {
    const itemSubj = item.subject || 'General Academic Session';
    const existingIndex = updatedList.findIndex(
      (r) => r.studentId === item.studentId && r.date === item.date
    );
    if (existingIndex >= 0) {
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        subject: itemSubj,
        subjectName: itemSubj,
        status: item.status,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updatedList.unshift({
        id: crypto.randomUUID(),
        studentId: item.studentId,
        studentName: item.studentName,
        courseName: 'Core Engineering Program',
        batchName: item.batchName,
        subject: itemSubj,
        subjectName: itemSubj,
        teacherName: 'Faculty In-Charge',
        date: item.date,
        session: 'Regular Class',
        status: item.status,
        remarks: `Marked ${item.status}`,
        updatedAt: new Date().toISOString(),
      });
    }
  });

  cachedStudentAttendance = updatedList;
  notifyChange();

  items.forEach((item) => {
    recalculateStudentAttendancePercentage(item.studentId);
  });

  if (items.length > 0) {
    activityService.log(
      'Batch Attendance Saved',
      'attendance',
      items[0].batchName || 'Batch',
      `Saved daily attendance for ${items.length} students on ${items[0].date}`
    );

    persist(
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const activeItems = items.filter((item) => item.status !== 'Not Marked' && item.status !== 'not_marked');
        if (activeItems.length === 0) return { error: null } as any;

        const dateStr = activeItems[0].date;
        const studentIds = activeItems.map((item) => {
          const s = studentService.getStudentById(item.studentId);
          return s?.userId || item.studentId;
        });

        // Find existing records on this date
        const { data: existingRows } = await supabase
          .from('attendance_records')
          .select('id, student_id')
          .eq('date', dateStr)
          .in('student_id', studentIds);

        const existingMap = new Map((existingRows || []).map((r: any) => [r.student_id, r.id]));

        for (const item of activeItems) {
          const student = studentService.getStudentById(item.studentId);
          const studentUid = student?.userId || item.studentId;
          const statusLower = String(item.status || 'present').toLowerCase();
          const dbStatus =
            statusLower === 'absent' ? 'Absent' : statusLower === 'late' ? 'Late' : statusLower === 'excused' ? 'Excused' : 'Present';
          const subj = item.subject || 'General Academic Session';

          if (existingMap.has(studentUid)) {
            await supabase
              .from('attendance_records')
              .update({
                status: dbStatus,
                subject: subj,
                batch_name: item.batchName || null,
                session_time: 'Regular Class',
              })
              .eq('id', existingMap.get(studentUid));
          } else {
            await supabase
              .from('attendance_records')
              .insert({
                student_id: studentUid,
                class_id: null,
                batch_name: item.batchName || null,
                teacher_id: session?.user?.id || null,
                subject: subj,
                date: item.date,
                session_time: 'Regular Class',
                status: dbStatus,
                mode: 'offline',
              });
          }
        }

        return { error: null } as any;
      })(),
      'Saving batch attendance',
      fetchStudentAttendance,
    );
  }
  return updatedList;
};

export const studentAttendanceService = {
  getAttendanceRecords: getStudentAttendance,
  getAttendanceByStudentId: getStudentAttendance,
  getAttendanceById,
  recordAttendance: recordStudentAttendance,
  updateAttendance: updateStudentAttendanceRecord,
  saveBulkBatchAttendance,
  recalculateStudentAttendancePercentage,
  getStudentSummary: getStudentAttendanceSummary,
  subscribe: subscribeStudentAttendance,
  getSubjectWiseAttendance: (studentId: string) => {
    const records = getStudentAttendance(studentId);
    const map = new Map<string, { conducted: number; present: number; absent: number }>();

    records.forEach((r) => {
      const subj = r.subjectName || r.subject || 'General';
      const current = map.get(subj) || { conducted: 0, present: 0, absent: 0 };
      current.conducted += 1;
      if (r.status === 'Present' || r.status === 'present' || r.status === 'Late' || r.status === 'late') {
        current.present += 1;
      } else {
        current.absent += 1;
      }
      map.set(subj, current);
    });

    if (map.size === 0) {
      return [];
    }

    return Array.from(map.entries()).map(([subject, data]) => ({
      subject,
      conducted: data.conducted,
      present: data.present,
      absent: data.absent,
      percentage: data.conducted ? Math.round((data.present / data.conducted) * 100) : 100,
    }));
  },
  getFacultyWiseAttendance: (studentId: string) => {
    const records = getStudentAttendance(studentId);
    const map = new Map<string, { conducted: number; present: number; absent: number }>();

    records.forEach((r) => {
      const faculty = r.teacherName || 'vegeta';
      const current = map.get(faculty) || { conducted: 0, present: 0, absent: 0 };
      current.conducted += 1;
      if (r.status === 'Present' || r.status === 'present' || r.status === 'Late' || r.status === 'late') {
        current.present += 1;
      } else {
        current.absent += 1;
      }
      map.set(faculty, current);
    });

    if (map.size === 0) {
      return [];
    }

    return Array.from(map.entries()).map(([faculty, data]) => ({
      faculty,
      conducted: data.conducted,
      present: data.present,
      absent: data.absent,
      percentage: data.conducted ? Math.round((data.present / data.conducted) * 100) : 100,
    }));
  },
};
