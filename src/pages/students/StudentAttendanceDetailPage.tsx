import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  ChevronDown,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Layers,
  Clock,
  User,
  ShieldCheck,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import {
  studentAttendanceService,
  getStudentAttendance,
  fetchStudentAttendance,
} from '../../services/studentAttendanceService';
import { Student, StudentAttendance } from '../../types';

export const StudentAttendanceDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const student = useMemo<Student | undefined>(() => {
    if (!studentId) return undefined;
    return (
      studentService.getStudentById(studentId) ||
      studentService.getStudents().find((s) => s.id === studentId || s.studentId === studentId)
    );
  }, [studentId]);

  // Attendance records for this student
  const studentRecords = useMemo(() => {
    if (!studentId) return [];
    return getStudentAttendance(studentId);
  }, [studentId]);

  // Faculty Wise Breakdown
  const facultyWise = useMemo(() => {
    if (!studentId) return [];
    return studentAttendanceService.getFacultyWiseAttendance(studentId);
  }, [studentId]);

  // Available faculty for dropdown
  const availableFaculty = useMemo(() => {
    const list = ['All Faculty'];
    facultyWise.forEach((f) => {
      if (!list.includes(f.faculty)) {
        list.push(f.faculty);
      }
    });
    studentRecords.forEach((r) => {
      const fac = r.teacherName || 'Faculty Member';
      if (fac && !list.includes(fac)) {
        list.push(fac);
      }
    });
    return list;
  }, [facultyWise, studentRecords]);

  // Selected faculty in the Attendance Tracker
  const [selectedFaculty, setSelectedFaculty] = useState<string>('All Faculty');
  const [isFacultyDropdownOpen, setIsFacultyDropdownOpen] = useState(false);

  useEffect(() => {
    fetchStudentAttendance();
  }, []);

  useEffect(() => {
    if (selectedFaculty === 'All Faculty' && availableFaculty.length > 1) {
      setSelectedFaculty(availableFaculty[1]);
    }
  }, [availableFaculty, selectedFaculty]);

  // Overall attendance metrics calculation dynamically derived from records
  const overallConducted = studentRecords.length;
  const overallAttended = studentRecords.filter(
    (r) => r.status === 'Present' || r.status === 'present'
  ).length;
  const rawAbsences = studentRecords.filter(
    (r) => r.status === 'Absent' || r.status === 'absent'
  ).length;
  const overallAbsences = rawAbsences < 10 ? `0${rawAbsences}` : `${rawAbsences}`;
  const overallRate = overallConducted > 0
    ? Math.round((overallAttended / overallConducted) * 100)
    : (student?.attendancePercentage ?? 0);

  // Filtered session records for the selected faculty from real records
  const facultySessionRecords = useMemo(() => {
    if (selectedFaculty === 'All Faculty') return studentRecords;

    return studentRecords.filter(
      (r) =>
        (r.teacherName && r.teacherName.toLowerCase() === selectedFaculty.toLowerCase()) ||
        (!r.teacherName && selectedFaculty.toLowerCase() === 'faculty member')
    );
  }, [selectedFaculty, studentRecords]);

  // Format date helper
  const formatDateDisplay = (dateStr: string) => {
    if (dateStr.includes('Sep') || dateStr.includes('Aug') || dateStr.includes('Oct')) {
      return dateStr;
    }
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.subject-tracker-dropdown')) {
        setIsSubjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* Back Button & Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/students/attendance')}
          className="flex items-center gap-2 text-xs font-semibold text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Student Attendance
        </button>

        {student && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#171311] border border-[#3A2922] text-xs text-[#F5F0EA]">
            <User className="w-3.5 h-3.5 text-[#946246]" />
            <span className="font-semibold">{student.fullName}</span>
            <span className="text-[#A89A91]">({student.batchName || student.batch || 'Batch 1'})</span>
          </div>
        )}
      </div>

      {/* Header matching Screenshot 2 */}
      <div>
        <span className="text-[11px] font-bold text-[#946246] uppercase tracking-widest block mb-1">
          ACADEMIC RECORDS
        </span>
        <h1 className="text-3xl font-bold text-[#F5F0EA] tracking-tight">
          Attendance Management
        </h1>
        <p className="text-sm text-[#A89A91] mt-1">
          Real-time automated tracking across online placement classes and campus hybrid sessions.
        </p>
      </div>

      {/* 4 Summary Stat Cards matching Screenshot 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Rate */}
        <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-5 relative shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#A89A91]">Overall Rate</span>
            <div className="w-5 h-5 rounded-full border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#F5F0EA] mb-3">{overallRate}%</div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              overallRate >= 85
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-600/30'
                : overallRate >= 75
                ? 'bg-amber-950/40 text-amber-400 border-amber-600/30'
                : 'bg-rose-950/40 text-rose-400 border-rose-600/30'
            }`}
          >
            {overallRate >= 85 ? 'Safe Attendance' : overallRate >= 75 ? 'Average Attendance' : 'Low Attendance'}
          </span>
        </div>

        {/* Card 2: Conducted */}
        <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-[#A89A91] block mb-2">Conducted</span>
          <div className="text-3xl font-bold text-[#F5F0EA] mb-3">{overallConducted}</div>
          <span className="text-xs text-[#A89A91]">Total academic sessions</span>
        </div>

        {/* Card 3: Attended */}
        <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-[#A89A91] block mb-2">Attended</span>
          <div className="text-3xl font-bold text-[#F5F0EA] mb-3">{overallAttended}</div>
          <span className="text-xs text-[#A89A91]">Present & on time</span>
        </div>

        {/* Card 4: Absences / Late */}
        <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-[#A89A91] block mb-2">Absences / Late</span>
          <div className="text-3xl font-bold text-[#F5F0EA] mb-3">{overallAbsences}</div>
          <span className="text-xs text-[#A89A91]">
            {rawAbsences > 0 ? `${rawAbsences} sessions missed` : 'No absences recorded'}
          </span>
        </div>
      </div>

      {/* Faculty-Wise Attendance Breakdown Card */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-[#2A1E19]">
          <h2 className="text-base font-bold text-[#F5F0EA]">
            Faculty-Wise Attendance Breakdown
          </h2>
          <span className="text-xs font-medium text-[#A89A91]">
            Minimum Requirement: 75%
          </span>
        </div>

        <div className="space-y-5">
          {facultyWise.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#A89A91]">
              No faculty-wise attendance breakdown available yet.
            </div>
          ) : (
            facultyWise.map((fw) => (
              <div key={fw.faculty} className="flex items-center gap-6">
                <div className="w-36 flex-shrink-0">
                  <span className="text-sm font-bold text-[#F5F0EA] block">{fw.faculty}</span>
                  <span className="text-xs text-[#A89A91]">
                    {fw.present} of {fw.conducted} sessions
                  </span>
                </div>
                <div className="flex-1">
                  <div className="h-2 w-full bg-[#2A1E19] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        fw.percentage >= 75 ? 'bg-[#946246]' : 'bg-[#7A4930]'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, fw.percentage))}%` }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-xs font-bold text-[#F5F0EA]">
                  {fw.percentage}%
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Attendance Tracker Card */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-6 shadow-sm space-y-6">
        {/* Card Header & Faculty Dropdown on Top Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-[#F5F0EA]">Attendance Tracker</h2>

          {/* Faculty Dropdown Selector */}
          <div className="flex items-center gap-3 relative faculty-tracker-dropdown">
            <label className="text-xs font-medium text-[#A89A91]">Faculty</label>
            <div className="relative min-w-[200px]">
              <button
                type="button"
                onClick={() => setIsFacultyDropdownOpen(!isFacultyDropdownOpen)}
                className="w-full h-10 px-4 rounded-xl bg-[#140F0D] hover:bg-[#1C1715] border border-[#3A2922] text-[#F5F0EA] text-xs font-medium flex items-center justify-between transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#946246]/40"
              >
                <span>{selectedFaculty}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#A89A91] transition-transform duration-200 ${
                    isFacultyDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isFacultyDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-full bg-[#1C1715] border border-[#3A2922] rounded-xl shadow-2xl py-1 z-30 overflow-hidden animate-in fade-in duration-150">
                  {availableFaculty.map((fac) => {
                    const isSelected = selectedFaculty === fac;
                    return (
                      <button
                        key={fac}
                        type="button"
                        onClick={() => {
                          setSelectedFaculty(fac);
                          setIsFacultyDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#2A1E19] text-[#F5F0EA] font-semibold'
                            : 'text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#231A16]'
                        }`}
                      >
                        <span>{fac}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#946246]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        {facultySessionRecords.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-xs text-[#A89A91]">
              No attendance sessions recorded yet for {selectedFaculty}.
            </p>
          </div>
        ) : (
          /* Session records table */
          <div className="overflow-x-auto rounded-xl border border-[#2A1E19]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#140F0D] text-[#A89A91] uppercase tracking-wider font-semibold border-b border-[#2A1E19]">
                  <th className="px-5 py-3.5">DATE</th>
                  <th className="px-5 py-3.5">SUBJECT</th>
                  <th className="px-5 py-3.5">FACULTY</th>
                  <th className="px-5 py-3.5">MODE</th>
                  <th className="px-5 py-3.5">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A1E19]">
                {facultySessionRecords.map((record: any) => {
                  const isPresent =
                    record.status === 'Present' ||
                    record.status === 'present';
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-[#1E1815] transition-colors"
                    >
                      <td className="px-5 py-4 font-bold text-[#F5F0EA]">
                        {formatDateDisplay(record.date)}
                      </td>
                      <td className="px-5 py-4 text-[#A89A91]">
                        {record.subject || record.subjectName || 'General Academic Session'}
                      </td>
                      <td className="px-5 py-4 text-[#A89A91]">
                        {record.faculty || record.teacherName || selectedFaculty}
                      </td>
                      <td className="px-5 py-4 text-[#A89A91]">
                        {record.mode || (record.session?.includes('Online') ? 'Online' : 'Offline')}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                            isPresent
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-600/30'
                              : 'bg-rose-950/40 text-rose-400 border-rose-600/30'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
