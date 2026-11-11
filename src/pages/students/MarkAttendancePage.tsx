import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  RotateCcw,
  Save,
  Search,
  CheckSquare,
  Square,
  BookOpen,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { supabaseAny as supabase } from '../../lib/supabase';
import { getStudents } from '../../services/studentService';
import { getAcademicBatches } from '../../services/academicBatchService';
import { academicService } from '../../services/academicService';
import { getAcademicSubjects } from '../../services/academicSubjectService';
import { getTeachers } from '../../services/teacherService';
import {
  fetchStudentAttendance,
  getStudentAttendance,
  saveBulkBatchAttendance,
} from '../../services/studentAttendanceService';
import { useToast } from '../../context/ToastContext';
import { Student } from '../../types';

type AttendanceMarkStatus = 'Not Marked' | 'Present' | 'Absent';
type CodeStatus = 'idle' | 'active' | 'stopped';

export const MarkAttendancePage: React.FC = () => {
  const { showToast } = useToast();

  // Code verification state
  const [codeStatus, setCodeStatus] = useState<CodeStatus>('idle');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [activeCodeId, setActiveCodeId] = useState<string | null>(null);

  // Batches
  const allBatches = useMemo(() => {
    const list = getAcademicBatches();
    const dynamic = academicService.getAllBatches();
    const batchNames = ['All Batches', 'Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'];
    dynamic.forEach((d) => {
      const clean = d.replace(/\s*\([^)]*\)/g, '').trim();
      if (!batchNames.includes(clean)) batchNames.push(clean);
    });
    list.forEach((b) => {
      const clean = b.name.replace(/\s*\([^)]*\)/g, '').trim();
      if (!batchNames.includes(clean)) {
        batchNames.push(clean);
      }
    });
    return Array.from(new Set(batchNames));
  }, []);

  const [selectedBatch, setSelectedBatch] = useState<string>('All Batches');
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState<boolean>(false);

  // Faculty options (Faculty-Wise)
  const availableFaculty = useMemo(() => {
    const list = getTeachers()
      .map((t) => t.fullName || t.teacherId)
      .filter(Boolean);
    const defaults = ['vegeta', 'DudeX Faculty', 'Academic Lead'];
    return Array.from(new Set([...defaults, ...list]));
  }, []);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('vegeta');
  const [isFacultyDropdownOpen, setIsFacultyDropdownOpen] = useState<boolean>(false);

  // Date (defaults to dynamic today)
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Search input
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Students list from student service
  const allStudents = useMemo(() => getStudents(), []);

  // Filtered students by batch and search query
  const displayedStudents = useMemo(() => {
    let list = allStudents;
    if (selectedBatch !== 'All Batches') {
      list = list.filter(
        (s) =>
          s.batch === selectedBatch ||
          s.batchName === selectedBatch ||
          (selectedBatch === 'Batch 1' &&
            ['stu-107', 'stu-108', 'stu-109', 'stu-110', 'stu-111', 'stu-112'].includes(
              s.id
            ))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => s.fullName.toLowerCase().includes(q));
    }

    return list;
  }, [allStudents, selectedBatch, searchQuery]);

  // Attendance status mapping: studentId -> 'Not Marked' | 'Present' | 'Absent'
  const [attendanceState, setAttendanceState] = useState<
    Record<string, AttendanceMarkStatus>
  >({});

  // Selection checkboxes
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Initialize or load attendance for the selected date & batch
  const loadExistingAttendance = () => {
    const records = getStudentAttendance();
    const mapping: Record<string, AttendanceMarkStatus> = {};

    displayedStudents.forEach((student) => {
      const match = records.find(
        (r) => r.studentId === student.id && r.date === selectedDate
      );
      if (match) {
        if (
          match.status === 'Present' ||
          match.status === 'present' ||
          match.status === 'Late' ||
          match.status === 'late'
        ) {
          mapping[student.id] = 'Present';
        } else if (match.status === 'Absent' || match.status === 'absent') {
          mapping[student.id] = 'Absent';
        } else if (match.status === 'Not Marked' || match.status === 'not_marked') {
          mapping[student.id] = 'Not Marked';
        } else {
          mapping[student.id] = 'Present';
        }
      } else {
        // If not yet marked for this date, default to 'Not Marked'
        mapping[student.id] = 'Not Marked';
      }
    });

    setAttendanceState(mapping);
    setSelectedStudentIds([]);
  };

  useEffect(() => {
    fetchStudentAttendance().then(() => {
      loadExistingAttendance();
    });
  }, []);

  useEffect(() => {
    loadExistingAttendance();
  }, [selectedBatch, selectedDate, selectedFaculty, displayedStudents.length]);

  // Live polling while attendance code is active
  useEffect(() => {
    if (codeStatus !== 'active') return;
    const interval = setInterval(async () => {
      await fetchStudentAttendance();
      loadExistingAttendance();
    }, 3000);
    return () => clearInterval(interval);
  }, [codeStatus, selectedDate, selectedBatch, displayedStudents.length]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.batch-dropdown-container')) {
        setIsBatchDropdownOpen(false);
      }
      if (!target.closest('.faculty-dropdown-container')) {
        setIsFacultyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate 6-character random alphanumeric verification code backed by Supabase
  const handleGenerateCode = async () => {
    if (codeStatus === 'active') return;

    const targetBatches =
      selectedBatch === 'All Batches'
        ? allBatches.filter((b) => b !== 'All Batches')
        : [selectedBatch];

    let issuedCode = '';
    let issuedId: string | null = null;

    try {
      const { data, error } = await supabase.rpc('start_batch_attendance_code', {
        p_batches: targetBatches,
        p_subject: selectedFaculty || 'vegeta',
        p_valid_minutes: 15,
      });
      if (!error && data && data.length > 0) {
        issuedCode = data[0].code;
        issuedId = data[0].code_id;
      }
    } catch {}

    if (!issuedCode) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < 6; i++) {
        issuedCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      try {
        const { data: userResp } = await supabase.auth.getUser();
        const { data: inserted } = await supabase
          .from('attendance_codes')
          .insert({
            batches: targetBatches,
            subject: selectedFaculty || 'vegeta',
            teacher_name: selectedFaculty || 'vegeta',
            code: issuedCode,
            created_by: userResp?.user?.id,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          })
          .select();
        if (inserted && inserted[0]) {
          issuedId = inserted[0].id;
        }
      } catch {}
    }

    setVerificationCode(issuedCode);
    setActiveCodeId(issuedId);
    setCodeStatus('active');
    showToast(`Attendance code ${issuedCode} active for 15 minutes.`, 'success');
  };

  // Stop verification code
  const handleStopCode = async () => {
    if (activeCodeId) {
      try {
        await supabase.rpc('stop_attendance_code_session', { p_code_id: activeCodeId });
      } catch {}
      try {
        await supabase.from('attendance_codes').update({ expires_at: new Date().toISOString() }).eq('id', activeCodeId);
      } catch {}
    } else if (verificationCode) {
      try {
        await supabase.from('attendance_codes').update({ expires_at: new Date().toISOString() }).eq('code', verificationCode);
      } catch {}
    }
    setCodeStatus('stopped');
    showToast('Code stopped successfully.', 'info');
  };

  // Toggle single student status cycling: Not Marked -> Present -> Absent -> Not Marked
  const handleToggleStatus = (studentId: string) => {
    setAttendanceState((prev) => {
      const current = prev[studentId] || 'Not Marked';
      let next: AttendanceMarkStatus = 'Present';
      if (current === 'Not Marked') {
        next = 'Present';
      } else if (current === 'Present') {
        next = 'Absent';
      } else {
        next = 'Not Marked';
      }
      return {
        ...prev,
        [studentId]: next,
      };
    });
  };

  // Select / Deselect individual student
  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select all / Deselect all
  const isAllSelected =
    displayedStudents.length > 0 &&
    displayedStudents.every((s) => selectedStudentIds.includes(s.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(displayedStudents.map((s) => s.id));
    }
  };

  // Mark Present: Selected students (or all if none selected) marked Present
  const handleMarkAllPresent = () => {
    setAttendanceState((prev) => {
      const updated = { ...prev };
      if (selectedStudentIds.length === 0) {
        displayedStudents.forEach((s) => {
          updated[s.id] = 'Present';
        });
      } else {
        selectedStudentIds.forEach((id) => {
          updated[id] = 'Present';
        });
      }
      return updated;
    });

    if (selectedStudentIds.length > 0) {
      showToast(
        `Marked ${selectedStudentIds.length} selected students as Present`,
        'success'
      );
    } else {
      showToast('Marked all students as Present', 'success');
    }
  };

  // Mark Absent: Selected students (or all if none selected) marked Absent
  const handleMarkAllAbsent = () => {
    setAttendanceState((prev) => {
      const updated = { ...prev };
      if (selectedStudentIds.length === 0) {
        displayedStudents.forEach((s) => {
          updated[s.id] = 'Absent';
        });
      } else {
        selectedStudentIds.forEach((id) => {
          updated[id] = 'Absent';
        });
      }
      return updated;
    });

    if (selectedStudentIds.length > 0) {
      showToast(
        `Marked ${selectedStudentIds.length} selected students as Absent`,
        'info'
      );
    } else {
      showToast('Marked all students as Absent', 'info');
    }
  };

  // Reset to loaded state for current date
  const handleReset = () => {
    loadExistingAttendance();
    showToast('Attendance draft reset to saved state', 'info');
  };

  // Save attendance
  const [isSaving, setIsSaving] = useState(false);
  const handleSave = () => {
    setIsSaving(true);
    const payload = displayedStudents.map((student) => ({
      studentId: student.id,
      studentName: student.fullName,
      batchName: student.batchName || student.batch || (selectedBatch !== 'All Batches' ? selectedBatch : 'Batch 1'),
      subject: selectedFaculty || 'vegeta',
      teacherName: selectedFaculty || 'vegeta',
      date: selectedDate,
      status: attendanceState[student.id] || 'Not Marked',
    }));

    saveBulkBatchAttendance(payload);

    setTimeout(() => {
      setIsSaving(false);
      showToast(
        `Attendance recorded successfully for ${displayedStudents.length} students on ${selectedDate}`,
        'success'
      );
    }, 250);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* Page Header */}
      <PageHeader
        title="Student Attendance Dashboard"
        description="Mark and manage daily attendance for students in authorized classes"
        breadcrumbs={[
          { label: 'Student Management', path: '/admin/students/attendance' },
          { label: 'Mark Attendance' },
        ]}
      />

      {/* Filter Card: Batch Dropdown, Subject Selector & Date Picker */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Batch Selector */}
          <div className="space-y-1.5 relative batch-dropdown-container">
            <label className="block text-xs font-semibold text-[#A89A91] uppercase tracking-wider">
              Batch
            </label>
            <button
              type="button"
              onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
              className="w-full h-11 px-4 rounded-xl bg-[#140F0D] hover:bg-[#1C1715] border border-[#3A2922] text-[#F5F0EA] flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-[#946246]/40 cursor-pointer"
            >
              <span className="text-sm font-medium">{selectedBatch}</span>
              <ChevronDown
                className={`w-4 h-4 text-[#A89A91] transition-transform duration-200 ${
                  isBatchDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Custom Dropdown Menu */}
            {isBatchDropdownOpen && (
              <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-[#1C1715] border border-[#3A2922] rounded-xl shadow-2xl py-1.5 backdrop-blur-md overflow-hidden animate-in fade-in duration-150">
                {allBatches.map((batchName) => {
                  const isSelected = selectedBatch === batchName;
                  return (
                    <button
                      key={batchName}
                      type="button"
                      onClick={() => {
                        setSelectedBatch(batchName);
                        setIsBatchDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#2A1E19] text-[#F5F0EA] font-semibold'
                          : 'text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#231A16]'
                      }`}
                    >
                      <span>{batchName}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#946246]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Faculty Selector (Faculty-Wise) */}
          <div className="space-y-1.5 relative faculty-dropdown-container">
            <label className="block text-xs font-semibold text-[#A89A91] uppercase tracking-wider">
              Faculty In-Charge
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                onFocus={() => setIsFacultyDropdownOpen(true)}
                placeholder="e.g. vegeta, DudeX Faculty..."
                className="w-full h-11 pl-4 pr-10 rounded-xl bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#946246]/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setIsFacultyDropdownOpen(!isFacultyDropdownOpen)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A89A91] hover:text-[#F5F0EA] cursor-pointer"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isFacultyDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Faculty Dropdown Suggestions */}
            {isFacultyDropdownOpen && (
              <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-[#1C1715] border border-[#3A2922] rounded-xl shadow-2xl py-1.5 backdrop-blur-md overflow-hidden animate-in fade-in duration-150 max-h-56 overflow-y-auto">
                {availableFaculty.map((fac) => {
                  const isSelected = selectedFaculty.toLowerCase() === fac.toLowerCase();
                  return (
                    <button
                      key={fac}
                      type="button"
                      onClick={() => {
                        setSelectedFaculty(fac);
                        setIsFacultyDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#2A1E19] text-[#F5F0EA] font-semibold'
                          : 'text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#231A16]'
                      }`}
                    >
                      <span>{fac}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#946246]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date Picker (supports inspecting and editing previous dates) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#A89A91] uppercase tracking-wider">
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full h-11 px-4 pr-10 rounded-xl bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#946246]/40 transition-all cursor-pointer"
              />
              <CalendarIcon className="w-4 h-4 text-[#A89A91] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

        {/* Active Code Verification Box (matching Screenshot 2) */}
        {codeStatus === 'active' && (
          <div className="space-y-3 pt-3 border-t border-[#2A1E19] animate-fadeIn">
            <label className="block text-xs font-semibold text-[#A89A91]">
              Attendance Verification Code
            </label>

            {/* Code Box */}
            <div className="h-16 rounded-xl bg-[#140F0D] border border-[#3A2922] flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-bold tracking-[0.6em] text-[#F5F0EA] font-mono select-all">
                {verificationCode.split('').join(' ')}
              </span>
            </div>

            {/* Status & Stop Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="px-3 py-1 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-600/30 text-xs font-semibold">
                Code Active
              </span>

              <button
                type="button"
                onClick={handleStopCode}
                className="px-4 py-1.5 rounded-lg border border-[#3A2922] hover:bg-[#231A16] text-[#F5F0EA] text-xs font-medium transition-all cursor-pointer active:scale-95"
              >
                Stop Code
              </button>
            </div>

            <p className="text-xs text-[#A89A91]">
              Students must enter this exact code to verify their attendance.
            </p>

            <p className="text-xs text-emerald-400 font-medium pt-1">
              Attendance code generated successfully.
            </p>
          </div>
        )}
      </div>

      {/* Daily Attendance Verification Card (matching Screenshots 1, 2, 3) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#F5F0EA]">
              Daily Attendance Verification
            </h2>
            <p className="text-xs text-[#A89A91] mt-0.5">
              Generate a six-character code for attendance verification.
            </p>
            {codeStatus === 'stopped' && (
              <p className="text-xs text-[#A89A91] mt-2 font-medium">
                Code stopped successfully.
              </p>
            )}
          </div>

          <div>
            {codeStatus === 'idle' ? (
              <button
                type="button"
                onClick={handleGenerateCode}
                className="px-5 py-2.5 rounded-xl bg-[#0B0B0B] hover:bg-[#1C1715] border border-[#3A2922] text-[#F5F0EA] text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Generate Code
              </button>
            ) : (
              <button
                type="button"
                onClick={codeStatus === 'stopped' ? handleGenerateCode : undefined}
                className={`px-5 py-2.5 rounded-xl border border-[#3A2922] text-xs font-bold transition-all ${
                  codeStatus === 'stopped'
                    ? 'bg-[#140F0D] hover:bg-[#1C1715] text-[#F5F0EA] cursor-pointer'
                    : 'bg-[#0B0B0B] text-[#A89A91] cursor-default opacity-80'
                }`}
              >
                Code Already Generated
              </button>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Search Input & Action Bar (matching Screenshot 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#A89A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#171311] border border-[#3A2922] text-xs text-[#F5F0EA] placeholder-[#A89A91] focus:outline-none focus:ring-2 focus:ring-[#946246]/40"
          />
        </div>

        {/* Quick Mark Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-600/30 text-emerald-400 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            {selectedStudentIds.length > 0 ? "Mark as Present" : "Mark All Present"}
          </button>

          <button
            type="button"
            onClick={handleMarkAllAbsent}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-600/30 text-rose-400 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <span className="text-sm leading-none">✕</span>
            {selectedStudentIds.length > 0 ? "Mark as Absent" : "Mark All Absent"}
          </button>
        </div>
      </div>

      {/* Students Table / List matching Screenshots 1, 2 */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="px-5 py-3.5 bg-[#140F0D] border-b border-[#3A2922] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#946246]" />
              ) : (
                <Square className="w-4 h-4 text-[#7A6F68]" />
              )}
            </button>
            <span className="text-xs font-semibold text-[#A89A91] uppercase tracking-wider">
              Student Name
            </span>
          </div>
          <span className="text-xs font-semibold text-[#A89A91] uppercase tracking-wider pr-4">
            Current Status
          </span>
        </div>

        {/* Student Rows */}
        <div className="divide-y divide-[#2A1E19]">
          {displayedStudents.length === 0 ? (
            <div className="py-12 text-center text-[#A89A91] text-sm">
              No students found in {selectedBatch}.
            </div>
          ) : (
            displayedStudents.map((student) => {
              const isSelected = selectedStudentIds.includes(student.id);
              const status: AttendanceMarkStatus =
                attendanceState[student.id] || 'Not Marked';

              return (
                <div
                  key={student.id}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-[#1E1815] transition-colors"
                >
                  {/* Left: Checkbox, Name, and Batch number below (NO studentId) */}
                  <div className="flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectStudent(student.id)}
                      className="text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#946246]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#7A6F68]" />
                      )}
                    </button>
                    <div>
                      <span className="text-sm font-semibold text-[#F5F0EA] block">
                        {student.fullName}
                      </span>
                      <span className="text-xs text-[#A89A91] block mt-0.5">
                        {student.batchName ||
                          student.batch ||
                          (selectedBatch !== 'All Batches' ? selectedBatch : 'Batch 1')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Current Status Toggle Pill */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(student.id)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                        status === 'Present'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-600/30 hover:bg-emerald-900/50'
                          : status === 'Absent'
                          ? 'bg-rose-950/40 text-rose-400 border-rose-600/30 hover:bg-rose-900/50'
                          : 'bg-[#231A16] text-[#A89A91] border-[#3A2922] hover:border-[#946246]/50 hover:text-[#F5F0EA]'
                      }`}
                      title="Click to toggle status (Not Marked → Present → Absent)"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          status === 'Present'
                            ? 'bg-emerald-400'
                            : status === 'Absent'
                            ? 'bg-rose-400'
                            : 'bg-[#A89A91]'
                        }`}
                      />
                      {status}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Action Footer (Reset & Save) matching Screenshot 1 */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#171311] hover:bg-[#231A16] border border-[#3A2922] text-[#F5F0EA] text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <RotateCcw className="w-4 h-4 text-[#A89A91]" />
          Reset
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0B0B0B] hover:bg-[#171311] border border-[#3A2922] text-[#F5F0EA] text-xs font-bold transition-all cursor-pointer shadow-lg active:scale-95 hover:border-[#946246]/50"
        >
          <Save className="w-4 h-4 text-[#946246]" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};
