import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, CalendarCheck, Check, Download, Edit2, Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { supabase } from '../../lib/supabase';
import { teacherService } from '../../services/teacherService';
import { teacherAttendanceService } from '../../services/teacherAttendanceService';
import { teacherLeaveService } from '../../services/teacherLeaveService';
import { Teacher, TeacherAttendance } from '../../types';

type DbStatus = TeacherAttendance['status'];
type DayStatus = DbStatus | 'pending';

/** One course day: a working day (Mon–Sat) in the teacher's 90-day course window. */
interface AttendanceDay {
  day: number;
  date: string;
  status: DayStatus;
  recordId?: string;
  checkIn: string;
  checkOut: string;
  classes: number;
  subject: string;
  remarks: string;
}

const COURSE_DAYS = 90;
const CASUAL_LEAVE_ALLOWANCE = 6;
const MEDICAL_LEAVE_ALLOWANCE = 4;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STATUS_NAMES: Partial<Record<DayStatus, string>> = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half Day',
  on_leave: 'Leave',
  absent: 'Absent',
  pending: 'Pending',
};

const STATUS_LABELS = new Proxy(STATUS_NAMES, {
  get: (target, key: string) => target[key as DayStatus] ?? key.replace(/_/g, " "),
}) as Record<DayStatus, string>;

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const parseDate = (value: string) => new Date(`${value}T00:00:00`);
const getDayName = (date: string) => DAY_NAMES[parseDate(date).getDay()];

/** 90 working days from the teacher's first record; rolls over once a window has passed. */
function courseWindow(firstDate: string | null): string[] {
  const today = toDateStr(new Date());
  let start = parseDate(firstDate && firstDate <= today ? firstDate : today);
  for (let guard = 0; guard < 50; guard += 1) {
    const days: string[] = [];
    const cursor = new Date(start);
    while (days.length < COURSE_DAYS) {
      if (cursor.getDay() !== 0) days.push(toDateStr(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    if (days[days.length - 1] >= today) return days;
    start = parseDate(days[days.length - 1]);
    start.setDate(start.getDate() + 1);
  }
  return [];
}

// Times are stored like the teacher portal's check-in: "09:05 AM".
function toDisplayTime(value: string): string {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${String(((h + 11) % 12) + 1).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

function toInputTime(value: string): string {
  const match = value?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return '';
  let h = Number(match[1]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem) h = (h % 12) + (meridiem === 'PM' ? 12 : 0);
  return `${String(h).padStart(2, '0')}:${match[2]}`;
}

const isAttended = (s: DayStatus) => s === 'present' || s === 'late' || s === 'half_day';

export const TeacherAttendanceDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { teacherId } = useParams<{ teacherId: string }>();

  const [teacher, setTeacher] = useState<Teacher | undefined>(teacherId ? teacherService.getTeacherById(teacherId) : undefined);
  const [records, setRecords] = useState<TeacherAttendance[]>([]);
  const [classesByDate, setClassesByDate] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [editingDay, setEditingDay] = useState<AttendanceDay | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveFrom, setLeaveFrom] = useState(toDateStr(new Date()));
  const [leaveTo, setLeaveTo] = useState(toDateStr(new Date()));
  const [leaveReason, setLeaveReason] = useState('');

  const today = toDateStr(new Date());

  const loadData = useCallback(() => {
    if (!teacherId) return;
    setTeacher(teacherService.getTeacherById(teacherId));
    setRecords(teacherAttendanceService.getAttendanceByTeacherId(teacherId));
  }, [teacherId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([teacherService.fetchTeachers(), teacherAttendanceService.fetchTeacherAttendance(), teacherLeaveService.fetchLeaveRequests()])
      .finally(() => {
        loadData();
        setLoading(false);
      });
    const unsubT = teacherService.onChange(loadData);
    const unsubA = teacherAttendanceService.onChange(loadData);
    return () => {
      unsubT();
      unsubA();
    };
  }, [loadData]);

  const window90 = useMemo(() => {
    const first = [...records].map((r) => r.date).sort()[0] || null;
    return courseWindow(first);
  }, [records]);

  // Live classes the teacher held on each course day.
  useEffect(() => {
    const userId = teacher?.userId;
    if (!userId || window90.length === 0) return;
    void supabase
      .from('live_classes')
      .select('date, scheduled_date, subject, status')
      .eq('teacher_id', userId)
      .gte('date', window90[0])
      .lte('date', window90[window90.length - 1])
      .then(({ data }) => {
        const map = new Map<string, string[]>();
        ((data || []) as Array<{ date: string | null; scheduled_date: string | null; subject: string | null; status: string | null }>)
          .filter((c) => (c.status || '').toLowerCase() !== 'cancelled')
          .forEach((c) => {
            const d = c.scheduled_date || c.date;
            if (!d) return;
            map.set(d, [...(map.get(d) || []), c.subject || 'Class']);
          });
        setClassesByDate(map);
      });
  }, [teacher?.userId, window90]);

  const days: AttendanceDay[] = useMemo(() => {
    const byDate = new Map(records.map((r) => [r.date, r]));
    return window90.map((date, index) => {
      const r = byDate.get(date);
      const classes = classesByDate.get(date) || [];
      const status: DayStatus = r ? r.status : 'pending';
      return {
        day: index + 1,
        date,
        status,
        recordId: r?.id,
        checkIn: r?.checkInTime || '-- : --',
        checkOut: r?.checkOutTime || '-- : --',
        classes: r && !isAttended(status) ? 0 : classes.length,
        subject: classes.length ? Array.from(new Set(classes)).join(', ') : '—',
        remarks: r?.remarks || (r ? `Recorded by ${r.recordedBy}` : 'Not marked'),
      };
    });
  }, [window90, records, classesByDate]);

  const currentDay = days.find((d) => d.date >= today) || days[days.length - 1];
  const todayRecord = days.find((d) => d.date === today);

  const summary = useMemo(() => {
    const recorded = days.filter((d) => d.status !== 'pending');
    const present = recorded.filter((d) => isAttended(d.status)).length;
    const leave = recorded.filter((d) => d.status === 'on_leave').length;
    const absent = recorded.filter((d) => d.status === 'absent').length;
    const leaves = teacherId ? teacherLeaveService.getLeaveByTeacherId(teacherId) : [];
    const usedOf = (types: string[]) =>
      leaves.filter((l) => l.status === 'approved' && types.includes(l.leaveType)).reduce((s, l) => s + (l.totalDays || 0), 0);
    return {
      present,
      leave,
      absent,
      pending: days.length - recorded.length,
      attendanceRate: recorded.length ? Number(((present / recorded.length) * 100).toFixed(1)) : 0,
      completed: currentDay?.day || 0,
      clRemaining: Math.max(CASUAL_LEAVE_ALLOWANCE - usedOf(['casual']), 0),
      mlRemaining: Math.max(MEDICAL_LEAVE_ALLOWANCE - usedOf(['medical', 'sick']), 0),
    };
  }, [days, currentDay, teacherId]);

  const courseMonths = useMemo(() => Array.from(new Set(days.map((d) => MONTH_NAMES[parseDate(d.date).getMonth()]))), [days]);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return days.filter((record) => {
      const matchesSearch =
        !query ||
        record.date.includes(query) ||
        record.subject.toLowerCase().includes(query) ||
        record.remarks.toLowerCase().includes(query) ||
        `day ${record.day}`.includes(query);
      const matchesStatus =
        !statusFilter || record.status === statusFilter || (statusFilter === 'present' && isAttended(record.status));
      const matchesMonth = monthFilter === 'all' || MONTH_NAMES[parseDate(record.date).getMonth()] === monthFilter;
      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [days, searchQuery, statusFilter, monthFilter]);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage(null);
    try {
      setMessage({ kind: 'ok', text: await action() });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'The action failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPresent = () =>
    run(async () => {
      if (!teacherId) throw new Error('No teacher selected.');
      await teacherAttendanceService.markDay({
        teacherId,
        teacherName: teacher?.fullName,
        date: today,
        status: 'present',
        checkInTime: todayRecord?.checkIn && todayRecord.checkIn !== '-- : --' ? todayRecord.checkIn : toDisplayTime(new Date().toTimeString().slice(0, 5)),
        remarks: 'Marked present by administrator',
      });
      return `Marked ${teacher?.fullName || 'teacher'} Present for today (${today}).`;
    });

  const handleApplyLeave = () =>
    run(async () => {
      if (!teacherId) throw new Error('No teacher selected.');
      if (!leaveReason.trim()) throw new Error('Enter a reason for the leave.');
      const count = await teacherAttendanceService.markLeaveRange(teacherId, leaveFrom, leaveTo, `Leave applied by administrator: ${leaveReason.trim()}`);
      setLeaveOpen(false);
      setLeaveReason('');
      return `Recorded ${count} leave day${count === 1 ? '' : 's'} (${leaveFrom} to ${leaveTo}, Sundays excluded).`;
    });

  const handleSaveEdit = () =>
    run(async () => {
      if (!editingDay || !teacherId) throw new Error('Nothing to save.');
      if (editingDay.status === 'pending') throw new Error('Choose an attendance status to record.');
      const status = editingDay.status as DbStatus;
      const checkIn = isAttended(status) ? toDisplayTime(toInputTime(editingDay.checkIn)) : '';
      const checkOut = isAttended(status) ? toDisplayTime(toInputTime(editingDay.checkOut)) : '';
      if (editingDay.recordId) {
        await teacherAttendanceService.updateRecord(editingDay.recordId, { status, checkInTime: checkIn, checkOutTime: checkOut, remarks: editingDay.remarks });
      } else {
        await teacherAttendanceService.markDay({
          teacherId,
          teacherName: teacher?.fullName,
          date: editingDay.date,
          status,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          remarks: editingDay.remarks === 'Not marked' ? '' : editingDay.remarks,
        });
      }
      const saved = editingDay;
      setEditingDay(null);
      return `Updated Day ${saved.day} (${saved.date}) to ${STATUS_LABELS[saved.status]}.`;
    });

  const handleExport = () => {
    if (!teacher) return;
    const headers = ['Course Day', 'Date', 'Status', 'Check In', 'Check Out', 'Classes Held', 'Subject', 'Remarks'];
    const rows = days.map((r) => [`Day ${r.day}`, r.date, STATUS_LABELS[r.status], r.checkIn, r.checkOut, String(r.classes), r.subject, r.remarks]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${teacher.fullName.replace(/\s+/g, '-')}-attendance-90-days.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!teacher) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <Card className="p-8 text-center !bg-[#1C1A19] !border-[#4A3024]">
          <CalendarCheck className="w-10 h-10 mx-auto text-[#D78B55]" />
          <h2 className="mt-4 font-bold text-[#F5F5F5]">{loading ? 'Loading attendance…' : 'Teacher Not Found'}</h2>
          {!loading && <p className="mt-2 text-sm text-[#A1A1AA]">The requested teacher attendance profile does not exist.</p>}
          <div className="mt-5">
            <Button variant="outline" onClick={() => navigate('/admin/teachers/attendance')}>
              Back to Teachers
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const todayStatus = todayRecord?.status || 'pending';
  const sunday = new Date().getDay() === 0;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/teachers/attendance')}
            className="flex items-center gap-2 text-xs font-semibold text-[#A1A1AA] hover:text-[#E7A66D] mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> BACK TO TEACHERS
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2A1A14] border border-[#4A2C1F] flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-[#D78B55]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F5F5F5]">My Attendance &amp; 90-Day Course Tracker</h1>
              <p className="text-sm text-[#A1A1AA] mt-1">Comprehensive faculty attendance record for the 3-Month (90 Days) semester curriculum</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-[#3A2418] text-[#E7A66D] text-xs font-semibold border border-[#5A321F]">{teacher.fullName}</span>
            <span className="px-3 py-1.5 rounded-full bg-[#242424] text-[#D4D4D8] text-xs border border-[#3A3A3A]">{teacher.department}</span>
            <span className="px-3 py-1.5 rounded-full bg-[#242424] text-[#D4D4D8] text-xs border border-[#3A3A3A]">{teacher.teacherId}</span>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={days.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#3A3A3A] bg-[#242424] text-[#E5E5E7] text-sm font-semibold hover:bg-[#2E2E2E] hover:border-[#8B4A2B] transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Export Report (CSV)
        </button>
      </div>

      {message && (
        <div
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.kind === 'error' ? 'border-red-800/60 bg-red-950/30 text-red-200' : 'border-emerald-800/60 bg-emerald-950/30 text-emerald-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* TODAY */}
      <Card className="!bg-[#FFF8E9] !border-[#E5D6B9] p-5 md:p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1D1D1D] flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold tracking-wide text-[#9B681A]">
                  TODAY · {sunday ? 'SUNDAY (WEEKEND)' : `DAY ${currentDay?.day || 1} OF ${COURSE_DAYS}`}
                </span>
                <span className="text-xs text-[#756F69]">
                  {getDayName(today)}, {today}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#22201E] mt-1">Mark Today’s Attendance</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                <span className="font-semibold text-[#4E4944]">Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${
                    isAttended(todayStatus)
                      ? 'bg-[#DDF5E8] text-[#26734D]'
                      : todayStatus === 'on_leave'
                        ? 'bg-[#FFF0C8] text-[#956D14]'
                        : 'bg-[#F7DDE3] text-[#A83D54]'
                  }`}
                >
                  {loading ? 'Loading…' : sunday ? 'Sunday (No Class)' : STATUS_LABELS[todayStatus]}
                </span>
                <span className="text-[#B4AAA2]">•</span>
                <span className="text-[#5E5751]">
                  Scheduled Sessions: {todayRecord?.classes ?? 0} Classes
                  {todayRecord && todayRecord.subject !== '—' ? ` (${todayRecord.subject})` : ''}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkPresent}
              disabled={busy || loading || sunday}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#42966D] text-white text-sm font-semibold hover:bg-[#37855F] transition-colors disabled:opacity-60"
            >
              <Check className="w-4 h-4" /> Mark Present
            </button>
            <button
              onClick={() => setLeaveOpen(true)}
              disabled={busy || loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#DDD8D0] bg-white text-[#5B5550] text-sm font-semibold hover:bg-[#F7F4EF] transition-colors"
            >
              Apply Leave
            </button>
          </div>
        </div>
      </Card>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="TOTAL COURSE DAYS"
          value={String(COURSE_DAYS)}
          suffix="Days (3 Months)"
          footerLeft={`Completed: ${summary.completed} Days`}
          footerRight={`Left: ${COURSE_DAYS - summary.completed} Days`}
          progress={(summary.completed / COURSE_DAYS) * 100}
          icon={<Calendar className="w-4 h-4" />}
          progressType="orange"
        />
        <MetricCard
          title="CLASSES ATTENDED"
          value={String(summary.present)}
          suffix={`/ ${summary.completed} Working Days`}
          footerLeft={`${summary.present} Days Present`}
          footerRight=""
          progress={summary.completed ? (summary.present / summary.completed) * 100 : 0}
          icon={<CalendarCheck className="w-4 h-4" />}
          progressType="green"
        />
        <MetricCard
          title="LEAVES & ABSENT"
          value={String(summary.leave + summary.absent)}
          suffix="Days Total"
          footerLeft={`Leaves: ${summary.leave}`}
          footerRight={`Absent: ${summary.absent}`}
          progress={summary.completed ? ((summary.leave + summary.absent) / summary.completed) * 100 : 0}
          icon={<span className="text-lg">△</span>}
          progressType="yellow"
        />
        <MetricCard
          title="ATTENDANCE RATE"
          value={`${summary.attendanceRate}%`}
          suffix="Benchmark: 85%"
          footerLeft={`CL: ${summary.clRemaining} left`}
          footerRight={`ML: ${summary.mlRemaining} left`}
          progress={summary.attendanceRate}
          icon={<span className="text-lg">↗</span>}
          progressType="blue"
        />
      </div>

      {/* HEATMAP */}
      <Card className="!bg-white !border-[#E2DED7] p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#24211F]">90-Day Semester Curriculum Heatmap</h2>
            <p className="text-xs text-[#96908A] mt-1">
              Interactive timeline of all 90 days across {courseMonths.map((m, i) => `Month ${i + 1} (${m})`).join(', ') || 'the current course'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#706A65]">
            <LegendItem className="bg-[#57B88B]" label={`Present (${summary.present})`} />
            <LegendItem className="bg-[#EBA314]" label={`Leave (${summary.leave})`} />
            <LegendItem className="bg-[#D9455E]" label={`Absent (${summary.absent})`} />
            <LegendItem className="bg-[#E7E2D9]" label={`Pending (${summary.pending})`} />
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-[#ECE8E2]">
          {loading && days.length === 0 ? (
            <p className="text-sm text-[#96908A]">Loading attendance…</p>
          ) : (
            <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1.5">
              {days.map((record) => (
                <button
                  key={record.day}
                  onClick={() => setEditingDay(record)}
                  title={`${record.date} - ${STATUS_LABELS[record.status]}`}
                  className={`h-7 rounded-md text-[10px] font-semibold transition-transform hover:scale-105 border ${
                    isAttended(record.status)
                      ? 'bg-[#57B88B] border-[#57B88B] text-white'
                      : record.status === 'on_leave'
                        ? 'bg-[#EBA314] border-[#EBA314] text-white'
                        : record.status === 'absent'
                          ? 'bg-[#D9455E] border-[#D9455E] text-white'
                          : 'bg-[#E7E2D9] border-[#DDD8CE] text-[#817A72]'
                  } ${record.date === today ? 'ring-2 ring-[#2C2927] ring-offset-1' : ''}`}
                >
                  {record.day}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* TABLE */}
      <Card className="!bg-white !border-[#E2DED7] overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A49D96]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by day, date, remarks..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#DDD8D0] bg-white text-sm text-[#332F2C] outline-none focus:ring-2 focus:ring-[#C9A88D]"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 px-3 rounded-xl border border-[#DDD8D0] bg-white text-sm text-[#403B37] outline-none"
            >
              <option value="">All Status ({days.length})</option>
              <option value="present">Present</option>
              <option value="on_leave">Leave</option>
              <option value="absent">Absent</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="h-10 px-3 rounded-xl border border-[#DDD8D0] bg-white text-sm text-[#403B37] outline-none"
            >
              <option value="all">All Months ({courseMonths.length} Mo)</option>
              {courseMonths.map((m, i) => (
                <option key={m} value={m}>
                  Month {i + 1} ({m})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse">
            <thead>
              <tr className="bg-[#FBFAF8] border-y border-[#ECE8E2]">
                <TableHeader>Course Day #</TableHeader>
                <TableHeader>Date &amp; Day</TableHeader>
                <TableHeader>Attendance Status</TableHeader>
                <TableHeader>Check-In / Out</TableHeader>
                <TableHeader>Classes Held</TableHeader>
                <TableHeader>Subject / Remarks</TableHeader>
                <TableHeader align="right">Actions</TableHeader>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.day} className="border-b border-[#EEEAE4] hover:bg-[#FCFBF9]">
                  <td className="px-5 py-3">
                    <span className="text-sm font-semibold text-[#38332F]">Day {record.day}</span>
                    <span className="text-[10px] text-[#A19A93] ml-1">/ 90</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-[#403B37]">{record.date}</div>
                    <div className="text-[11px] text-[#9A938C]">{getDayName(record.date)}</div>
                  </td>
                  <td className="px-5 py-3">
                    <AttendanceStatusBadge status={record.status} />
                  </td>
                  <td className="px-5 py-3 text-xs text-[#77716B]">
                    {record.checkIn} — {record.checkOut}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-semibold text-[#403B37]">
                      {record.classes} {record.classes === 1 ? 'Class' : 'Classes'}
                    </span>
                  </td>
                  <td className="px-5 py-3 max-w-[330px]">
                    <div className="text-sm font-medium text-[#403B37] truncate">{record.subject}</div>
                    <div className="text-[11px] text-[#9A938C] truncate">{record.remarks}</div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setEditingDay(record)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DDD8D0] text-xs font-semibold text-[#635D57] hover:bg-[#F7F4EF] hover:border-[#C8A88F] transition-colors"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredRecords.length === 0 && (
          <div className="p-12 text-center">
            <CalendarCheck className="w-8 h-8 mx-auto text-[#B0A9A2]" />
            <p className="mt-3 text-sm font-semibold text-[#615A54]">No attendance records found</p>
            <p className="mt-1 text-xs text-[#99928B]">Try changing the search or filters.</p>
          </div>
        )}
      </Card>

      {/* EDIT MODAL */}
      {editingDay && (
        <Modal
          isOpen={true}
          onClose={() => setEditingDay(null)}
          title={`Edit Attendance — Day ${editingDay.day}`}
          description={`${editingDay.date} • ${teacher.fullName}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <Select
              label="Attendance Status"
              value={editingDay.status}
              onChange={(event) => setEditingDay({ ...editingDay, status: event.target.value as DayStatus })}
              options={[
                { value: 'pending', label: 'Pending (Not Marked)' },
                { value: 'present', label: 'Present' },
                { value: 'late', label: 'Late' },
                { value: 'half_day', label: 'Half Day' },
                { value: 'on_leave', label: 'Leave' },
                { value: 'absent', label: 'Absent' },
              ]}
            />
            {isAttended(editingDay.status) && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Check In"
                  type="time"
                  value={toInputTime(editingDay.checkIn)}
                  onChange={(event) => setEditingDay({ ...editingDay, checkIn: toDisplayTime(event.target.value) })}
                />
                <Input
                  label="Check Out"
                  type="time"
                  value={toInputTime(editingDay.checkOut)}
                  onChange={(event) => setEditingDay({ ...editingDay, checkOut: toDisplayTime(event.target.value) })}
                />
              </div>
            )}
            <Input label="Classes Held" value={`${editingDay.classes} (from scheduled live classes)`} disabled />
            <Input label="Subject" value={editingDay.subject} disabled />
            <Input
              label="Remarks"
              value={editingDay.remarks === 'Not marked' ? '' : editingDay.remarks}
              onChange={(event) => setEditingDay({ ...editingDay, remarks: event.target.value })}
            />
            <div className="flex justify-end gap-2 pt-4 border-t border-[#E7E2DA]">
              <Button variant="outline" onClick={() => setEditingDay(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit} disabled={busy}>
                {busy ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* APPLY LEAVE MODAL */}
      {leaveOpen && (
        <Modal
          isOpen={true}
          onClose={() => setLeaveOpen(false)}
          title="Apply Leave"
          description={`Record leave days for ${teacher.fullName} (Sundays are skipped)`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="From Date" type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} />
              <Input label="To Date" type="date" min={leaveFrom} value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} />
            </div>
            <Input label="Reason" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Reason for the leave" />
            <div className="flex justify-end gap-2 pt-4 border-t border-[#E7E2DA]">
              <Button variant="outline" onClick={() => setLeaveOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleApplyLeave} disabled={busy}>
                {busy ? 'Saving…' : 'Apply Leave'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  suffix: string;
  footerLeft: string;
  footerRight: string;
  progress: number;
  icon: React.ReactNode;
  progressType: 'orange' | 'green' | 'yellow' | 'blue';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, suffix, footerLeft, footerRight, progress, icon, progressType }) => {
  const progressClass = {
    orange: 'bg-[#C9790B]',
    green: 'bg-[#4CA878]',
    yellow: 'bg-[#D79A0A]',
    blue: 'bg-[#4A4FA3]',
  }[progressType];
  return (
    <Card className="!bg-white !border-[#E2DED7] p-5">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold tracking-wide text-[#817A73]">{title}</span>
        <span className="text-[#8B4A2B]">{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-[#1D1B1A]">{value}</span>
        <span className="text-[11px] font-semibold text-[#9A938B]">{suffix}</span>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-[#EEEAE4] overflow-hidden">
        <div className={`h-full rounded-full ${progressClass}`} style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#837B74]">
        <span>{footerLeft}</span>
        <span>{footerRight}</span>
      </div>
    </Card>
  );
};

const TableHeader: React.FC<{ children: React.ReactNode; align?: 'left' | 'right' }> = ({ children, align = 'left' }) => (
  <th className={`px-5 py-3 ${align === 'right' ? 'text-right' : 'text-left'} text-[10px] font-bold uppercase tracking-wide text-[#77716B]`}>{children}</th>
);

const LegendItem: React.FC<{ className: string; label: string }> = ({ className, label }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`w-2.5 h-2.5 rounded-full ${className}`} />
    {label}
  </span>
);

const AttendanceStatusBadge: React.FC<{ status: DayStatus }> = ({ status }) => {
  const styles: Partial<Record<DayStatus, string>> = {
    present: 'bg-[#DDF5E8] text-[#26734D]',
    late: 'bg-[#DDF5E8] text-[#26734D]',
    half_day: 'bg-[#EDE3FA] text-[#6B3FA0]',
    on_leave: 'bg-[#FFF0C8] text-[#956D14]',
    absent: 'bg-[#F7DDE3] text-[#A83D54]',
    pending: 'bg-[#E9E5DE] text-[#77716A]',
  };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${styles[status] || 'bg-[#E9E5DE] text-[#77716A]'}`}>{STATUS_LABELS[status]}</span>;
};

export default TeacherAttendanceDetailPage;
