import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Search,
  CalendarCheck,
  Eye,
  X,
  ArrowRight,
  Download,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { getStudents } from '../../services/studentService';
import { getStudentAttendance, fetchStudentAttendance } from '../../services/studentAttendanceService';
import { academicService } from '../../services/academicService';
import {
  getStudentCollege,
  getStudentDegree,
  getStudentSpecialization,
  getStudentBatch,
} from './StudentListPage';
import { Student, StudentAttendance } from '../../types';

export const StudentAttendancePage: React.FC = () => {
  const navigate = useNavigate();

  // Filters
  const [collegeFilter, setCollegeFilter] = useState<string>('');
  const [degreeFilter, setDegreeFilter] = useState<string>('');
  const [specializationFilter, setSpecializationFilter] = useState<string>('');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collegesVersion, setCollegesVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = academicService.onAcademicChange(() => {
      setCollegesVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Data
  const allStudents = useMemo(() => getStudents(), []);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<StudentAttendance[]>(() => getStudentAttendance());

  useEffect(() => {
    const load = () => {
      setAllAttendanceRecords([...getStudentAttendance()]);
    };
    load();
    void fetchStudentAttendance().then(load);

    window.addEventListener('dudex_student_attendance_changed', load);
    window.addEventListener('dudex_students_changed', load);
    return () => {
      window.removeEventListener('dudex_student_attendance_changed', load);
      window.removeEventListener('dudex_students_changed', load);
    };
  }, [selectedDate]);

  // Available options
  const availableColleges = useMemo(() => {
    const list = academicService.getAllColleges();
    const set = new Set<string>(list);
    allStudents.forEach((s) => {
      if (s.collegeName) set.add(s.collegeName);
    });
    return Array.from(set);
  }, [allStudents, collegesVersion]);

  const availableDegrees = useMemo(() => {
    const list = academicService.getDegreesForCollege(collegeFilter);
    const set = new Set<string>(list);
    allStudents.forEach((s) => {
      if (!collegeFilter || getStudentCollege(s) === collegeFilter) {
        set.add(getStudentDegree(s));
      }
    });
    return Array.from(set);
  }, [allStudents, collegeFilter, collegesVersion]);

  const availableSpecializations = useMemo(() => {
    const list = academicService.getSpecializationsForCollege(collegeFilter);
    const set = new Set<string>(list);
    allStudents.forEach((s) => {
      if (!collegeFilter || getStudentCollege(s) === collegeFilter) {
        set.add(getStudentSpecialization(s));
      }
    });
    return Array.from(set);
  }, [allStudents, collegeFilter, collegesVersion]);

  const availableBatches = useMemo(() => {
    const list = academicService.getBatchesForCollege(collegeFilter);
    const set = new Set<string>(list);
    allStudents.forEach((s) => {
      if (!collegeFilter || getStudentCollege(s) === collegeFilter) {
        set.add(getStudentBatch(s));
      }
    });
    return Array.from(set);
  }, [allStudents, collegeFilter, collegesVersion]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      if (collegeFilter && getStudentCollege(s) !== collegeFilter) {
        return false;
      }
      if (degreeFilter && getStudentDegree(s) !== degreeFilter) {
        return false;
      }
      if (specializationFilter && getStudentSpecialization(s) !== specializationFilter) {
        return false;
      }
      if (batchFilter && getStudentBatch(s) !== batchFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const spec = getStudentSpecialization(s).toLowerCase();
        const deg = getStudentDegree(s).toLowerCase();
        const b = getStudentBatch(s).toLowerCase();
        const col = getStudentCollege(s).toLowerCase();
        const matches =
          s.fullName.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          spec.includes(q) ||
          deg.includes(q) ||
          b.includes(q) ||
          col.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [
    allStudents,
    collegeFilter,
    degreeFilter,
    specializationFilter,
    batchFilter,
    searchQuery,
  ]);

  // Paginated Students
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const clearAllFilters = () => {
    setCollegeFilter('');
    setDegreeFilter('');
    setSpecializationFilter('');
    setBatchFilter('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn font-sans">
      {/* Page Header */}
      <PageHeader
        title="Student Attendance Records"
        description="Select college, degree, specialization, batch, and date to inspect detailed faculty-wise attendance analytics."
        breadcrumbs={[
          { label: 'Student Management', path: '/admin/students/attendance' },
          { label: 'Student Attendance' },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/admin/students/mark-attendance')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#946246] hover:bg-[#7A4930] text-[#F5F0EA] text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              Mark Attendance
            </button>
          </div>
        }
      />

      {/* Filter and Search Controls (matching the All Students directory layout) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-4 shadow-sm space-y-3.5">
        {/* Row 1: Search + Date + Reset */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A89A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student name, ID, college, degree, or specialization..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-[#140F0D] border border-[#3A2922] rounded-xl text-xs sm:text-sm text-[#F5F0EA] placeholder-[#A89A91]/60 focus:outline-none focus:border-[#946246] transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Date Picker */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 pl-3.5 pr-9 bg-[#140F0D] border border-[#3A2922] rounded-xl text-xs text-[#F5F0EA] font-medium focus:outline-none focus:border-[#946246] cursor-pointer"
              />
              <CalendarIcon className="w-3.5 h-3.5 text-[#A89A91] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {(collegeFilter || degreeFilter || specializationFilter || batchFilter || searchQuery) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#231A16] hover:bg-[#2F211B] border border-[#3A2922] text-xs font-semibold text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Selectors: 1. College, 2. Degree, 3. Specialization, 4. Batch */}
        <div className="pt-2 border-t border-[#2A1E19] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. College */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A89A91]">
              1. College
            </label>
            <select
              value={collegeFilter}
              onChange={(e) => {
                setCollegeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#946246] cursor-pointer"
            >
              <option value="">All Colleges</option>
              {availableColleges.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Degree */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A89A91]">
              2. Degree
            </label>
            <select
              value={degreeFilter}
              onChange={(e) => {
                setDegreeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#946246] cursor-pointer"
            >
              <option value="">All Degrees</option>
              {availableDegrees.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Specialization */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A89A91]">
              3. Specialization
            </label>
            <select
              value={specializationFilter}
              onChange={(e) => {
                setSpecializationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#946246] cursor-pointer"
            >
              <option value="">All Specializations</option>
              {availableSpecializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Batch */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A89A91]">
              4. Batch
            </label>
            <select
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#946246] cursor-pointer"
            >
              <option value="">All Batches</option>
              {availableBatches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Student Attendance Table (Columns: Name, College, Degree, Specialization, Batch, Status, Percentage, Action) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#140F0D] text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <th className="py-3.5 px-5">Name</th>
                <th className="py-3.5 px-4">College</th>
                <th className="py-3.5 px-4">Degree</th>
                <th className="py-3.5 px-4">Specialization</th>
                <th className="py-3.5 px-4">Batch</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Percentage</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1E19]/80">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#A89A91]">
                    No student attendance records found matching your selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const college = getStudentCollege(student);
                  const degree = getStudentDegree(student);
                  const specialization = getStudentSpecialization(student);
                  const batch = getStudentBatch(student);
                  const hasAtt = student.attendancePercentage !== undefined && student.attendancePercentage !== null;
                  const attendanceRate = hasAtt ? student.attendancePercentage : 0;

                  // Find attendance on selected date with multi-key cross-portal matching
                  const dateMatch = allAttendanceRecords.find((r) => {
                    if (r.date !== selectedDate) return false;
                    if (r.studentId === student.id) return true;
                    if (student.userId && r.studentId === student.userId) return true;
                    if ((r as any).studentUserId && (r as any).studentUserId === student.userId) return true;
                    if ((r as any).studentUserId && (r as any).studentUserId === student.id) return true;
                    if (r.studentName && student.fullName && r.studentName.toLowerCase().trim() === student.fullName.toLowerCase().trim()) return true;
                    return false;
                  });
                  const dateStatus = dateMatch ? dateMatch.status : 'Not Marked';
                  const isPresent = dateStatus === 'Present' || dateStatus === 'present';
                  const isAbsent = dateStatus === 'Absent' || dateStatus === 'absent';

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-[#1E1815]/70 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/admin/students/attendance/${student.id}`)}
                    >
                      {/* Name Column (Profile Image + Name; No year or batch subtitle) */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {student.avatar ? (
                            <img
                              src={student.avatar}
                              alt={student.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-[#3A2922]"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#2A1E19] border border-[#5A321F] flex items-center justify-center text-xs font-bold text-[#F5F0EA]">
                              {student.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-[#F5F0EA] group-hover:text-[#C49B7B] transition-colors block text-sm">
                              {student.fullName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* College Column */}
                      <td className="py-3.5 px-4 text-[#F5F0EA] font-medium max-w-[170px] truncate">
                        {college}
                      </td>

                      {/* Degree Column */}
                      <td className="py-3.5 px-4 font-semibold text-[#A89A91]">
                        {degree}
                      </td>

                      {/* Specialization Column */}
                      <td className="py-3.5 px-4 font-semibold text-[#F5F0EA]">
                        {specialization}
                      </td>

                      {/* Batch Column */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA]">
                          {batch}
                        </span>
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            isPresent
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-600/30'
                              : isAbsent
                              ? 'bg-rose-950/40 text-rose-400 border-rose-600/30'
                              : 'bg-[#231A16] text-[#A89A91] border-[#3A2922]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              isPresent
                                ? 'bg-emerald-400'
                                : isAbsent
                                ? 'bg-rose-400'
                                : 'bg-[#A89A91]'
                            }`}
                          />
                          {dateStatus}
                        </span>
                      </td>

                      {/* Percentage Column */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-[#231A16] rounded-full overflow-hidden border border-[#3A2922]">
                            <div
                              className={`h-full rounded-full ${
                                !hasAtt
                                  ? 'bg-neutral-600'
                                  : attendanceRate >= 75
                                  ? 'bg-emerald-400'
                                  : attendanceRate >= 60
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                              style={{ width: `${hasAtt ? Math.min(attendanceRate, 100) : 0}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono text-xs font-bold ${
                              !hasAtt
                                ? 'text-[#A89A91]'
                                : attendanceRate >= 75
                                ? 'text-emerald-400'
                                : attendanceRate >= 60
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {hasAtt ? `${attendanceRate}%` : '0%'}
                          </span>
                        </div>
                      </td>

                      {/* Action Column */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/students/attendance/${student.id}`);
                          }}
                          className="p-1.5 rounded-lg bg-[#231A16] hover:bg-[#2F211B] text-[#A89A91] hover:text-[#F5F0EA] border border-[#3A2922] transition-colors cursor-pointer"
                          title="View Attendance Breakdown"
                        >
                          <Eye className="w-4 h-4 text-[#C49B7B]" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredStudents.length > 0 && (
          <div className="p-4 bg-[#140F0D] border-t border-[#3A2922] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#A89A91]">
              Showing{' '}
              <span className="font-semibold text-[#F5F0EA]">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-[#F5F0EA]">
                {Math.min(currentPage * pageSize, filteredStudents.length)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-[#F5F0EA]">
                {filteredStudents.length}
              </span>{' '}
              students
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-[#A89A91] px-2">
                Page {currentPage} of{' '}
                {Math.max(1, Math.ceil(filteredStudents.length / pageSize))}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  currentPage >= Math.ceil(filteredStudents.length / pageSize)
                }
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
