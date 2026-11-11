import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Download,
  X,
  Filter,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { getStudents, getAtRiskStudents } from '../../services/studentService';
import { academicService } from '../../services/academicService';
import {
  getStudentCollege,
  getStudentDegree,
  getStudentSpecialization,
  getStudentBatch,
} from './StudentListPage';
import { Student } from '../../types';

export const AtRiskStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);

  // Filters
  const [collegeFilter, setCollegeFilter] = useState('');
  const [degreeFilter, setDegreeFilter] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [collegesVersion, setCollegesVersion] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setStudents(getStudents());
    const unsubscribe = academicService.onAcademicChange(() => {
      setCollegesVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  // Filter options
  const availableColleges = useMemo(() => {
    const list = academicService.getAllColleges();
    const set = new Set<string>(list);
    students.forEach((s) => {
      if (s.collegeName) set.add(s.collegeName);
    });
    return Array.from(set);
  }, [students, collegesVersion]);

  const availableDegrees = useMemo(() => {
    const list = academicService.getDegreesForCollege(collegeFilter);
    const set = new Set<string>(list);
    students.forEach((s) => {
      if (!collegeFilter || getStudentCollege(s) === collegeFilter) {
        set.add(getStudentDegree(s));
      }
    });
    return Array.from(set);
  }, [students, collegeFilter, collegesVersion]);

  const availableSpecializations = useMemo(() => {
    const list = academicService.getSpecializationsForCollege(collegeFilter);
    const set = new Set<string>(list);
    students.forEach((s) => {
      if (!collegeFilter || getStudentCollege(s) === collegeFilter) {
        set.add(getStudentSpecialization(s));
      }
    });
    return Array.from(set);
  }, [students, collegeFilter, collegesVersion]);

  const availableBatches = useMemo(() => {
    const list = academicService.getBatchesForCollege(collegeFilter);
    const set = new Set<string>(list);
    students.forEach((s) => {
      if (!collegeFilter || getStudentCollege(s) === collegeFilter) {
        set.add(getStudentBatch(s));
      }
    });
    return Array.from(set);
  }, [students, collegeFilter, collegesVersion]);

  // Determine risk severity for any student
  const getStudentRisk = (s: Student): { isAtRisk: boolean; level: 'CRITICAL RISK' | 'WARNING RISK' | 'SAFE' } => {
    const isSuspended = s.status === 'Suspended' || s.status === 'suspended';
    if (isSuspended) {
      return { isAtRisk: true, level: 'CRITICAL RISK' };
    }

    const hasAtt = s.attendancePercentage !== undefined && s.attendancePercentage !== null;
    const hasMarks =
      (s.averageMarks !== undefined && s.averageMarks !== null) ||
      (s.averageScore !== undefined && s.averageScore !== null);

    // If student is new with no attendance records or examination scores logged, they are safe
    if (!hasAtt && !hasMarks) {
      return { isAtRisk: false, level: 'SAFE' };
    }

    const att = hasAtt ? s.attendancePercentage! : 100;
    const score = hasMarks ? (s.averageMarks ?? s.averageScore ?? 100) : 100;

    if (att < 60 || score < 40) {
      return { isAtRisk: true, level: 'CRITICAL RISK' };
    }
    if (att < 75 || score < 55) {
      return { isAtRisk: true, level: 'WARNING RISK' };
    }
    return { isAtRisk: false, level: 'SAFE' };
  };

  // Filtered Students (displays all at-risk students or filtered list)
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const risk = getStudentRisk(s);

      // By default or filter, ensure we show at-risk students (or filter by specific risk level)
      if (riskFilter === 'All') {
        // Show students meeting at-risk criteria
        if (!risk.isAtRisk) return false;
      } else if (riskFilter === 'CRITICAL RISK') {
        if (risk.level !== 'CRITICAL RISK') return false;
      } else if (riskFilter === 'WARNING RISK') {
        if (risk.level !== 'WARNING RISK') return false;
      } else if (riskFilter === 'ALL STUDENTS') {
        // user selected to view all students
      }

      // College filter
      if (collegeFilter && getStudentCollege(s) !== collegeFilter) {
        return false;
      }

      // Degree filter
      if (degreeFilter && getStudentDegree(s) !== degreeFilter) {
        return false;
      }

      // Specialization filter
      if (specializationFilter && getStudentSpecialization(s) !== specializationFilter) {
        return false;
      }

      // Batch filter
      if (batchFilter && getStudentBatch(s) !== batchFilter) {
        return false;
      }

      // Search query
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
    students,
    collegeFilter,
    degreeFilter,
    specializationFilter,
    batchFilter,
    riskFilter,
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
    setRiskFilter('All');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Student Name,Student ID,College,Degree,Specialization,Batch,Attendance %,Average Exam Score,Pending Assignments,Risk Severity\n',
    ];
    const rows = filteredStudents.map((s) => {
      const risk = getStudentRisk(s);
      const attStr = s.attendancePercentage !== undefined && s.attendancePercentage !== null ? `${s.attendancePercentage}%` : 'N/A';
      const scoreStr = s.averageMarks !== undefined && s.averageMarks !== null ? `${s.averageMarks}%` : (s.averageScore !== undefined && s.averageScore !== null ? `${s.averageScore}%` : 'N/A');
      const overdue = s.totalAssignments && s.assignmentsCompleted !== undefined ? Math.max(0, s.totalAssignments - s.assignmentsCompleted) : 0;
      return `"${s.fullName}","${s.studentId}","${getStudentCollege(s)}","${getStudentDegree(s)}","${getStudentSpecialization(s)}","${getStudentBatch(s)}","${attStr}","${scoreStr}","${overdue} Overdue","${risk.level}"`;
    }).join('\n');

    const blob = new Blob([...headers, rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `at_risk_students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto font-sans animate-fadeIn">
      {/* Top Header & Breadcrumbs with Export Action */}
      <PageHeader
        title="At-Risk Students Identification"
        description="Automated factual threshold detection for students with critical attendance, failing scores, or missed assignments"
        breadcrumbs={[
          { label: 'Admin', path: '/admin/students/list' },
          { label: 'Students', path: '/admin/students/list' },
          { label: 'At-Risk' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Threshold Guide (from Screenshot 1) */}
      <div className="p-4 bg-[#140F0D] border border-rose-950/60 rounded-2xl flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="text-xs text-[#A89A91]">
          <span className="font-bold text-[#F5F0EA] block mb-0.5">
            Threshold Trigger Rules
          </span>
          Students appear on this list if their attendance falls below{' '}
          <strong className="text-rose-300">75%</strong>, average examination marks fall below{' '}
          <strong className="text-rose-300">50%</strong>, or if enrollment has been marked suspended.
        </div>
      </div>

      {/* Filter and Search Bar Controls (College, Degree, Specialization, Batch) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-4 shadow-sm space-y-3.5">
        {/* Row 1: Search + Risk Level + Reset */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A89A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search student by name, college, degree, or specialization..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-[#140F0D] border border-[#3A2922] rounded-xl text-xs sm:text-sm text-[#F5F0EA] placeholder-[#A89A91]/60 focus:outline-none focus:border-[#946246] transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#946246] cursor-pointer"
            >
              <option value="All">All At-Risk Students</option>
              <option value="CRITICAL RISK">Critical Risk Only</option>
              <option value="WARNING RISK">Warning Risk Only</option>
              <option value="ALL STUDENTS">View All Academy Students</option>
            </select>

            {(collegeFilter || degreeFilter || specializationFilter || batchFilter || searchQuery || riskFilter !== 'All') && (
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

      {/* At-Risk Table (Action column removed as requested) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#140F0D] text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <th className="py-3.5 px-5">Student</th>
                <th className="py-3.5 px-4">College</th>
                <th className="py-3.5 px-4">Degree</th>
                <th className="py-3.5 px-4">Specialization</th>
                <th className="py-3.5 px-4">Batch</th>
                <th className="py-3.5 px-4 text-center">Attendance %</th>
                <th className="py-3.5 px-4 text-center">Average Exam Score</th>
                <th className="py-3.5 px-4 text-center">Pending Assignments</th>
                <th className="py-3.5 px-5">Risk Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1E19]/80">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-emerald-400 font-semibold text-sm">
                    No students currently meet the at-risk threshold criteria for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((stu) => {
                  const college = getStudentCollege(stu);
                  const degree = getStudentDegree(stu);
                  const specialization = getStudentSpecialization(stu);
                  const batch = getStudentBatch(stu);
                  const risk = getStudentRisk(stu);

                  return (
                    <tr
                      key={stu.id}
                      className="hover:bg-[#1E1815]/70 transition-colors"
                    >
                      {/* Student Profile & Name */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {stu.avatar || stu.profileImage ? (
                            <img
                              src={stu.profileImage || stu.avatar}
                              alt={stu.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-rose-900/80 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#2A1E19] border border-rose-900/80 flex items-center justify-center text-xs font-bold text-[#F5F0EA] shrink-0">
                              {stu.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-[#F5F0EA] block text-sm">
                              {stu.fullName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* College */}
                      <td className="py-3.5 px-4 text-[#F5F0EA] font-medium max-w-[170px] truncate">
                        {college}
                      </td>

                      {/* Degree */}
                      <td className="py-3.5 px-4 font-semibold text-[#A89A91]">
                        {degree}
                      </td>

                      {/* Specialization */}
                      <td className="py-3.5 px-4 font-semibold text-[#F5F0EA]">
                        {specialization}
                      </td>

                      {/* Batch */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA]">
                          {batch}
                        </span>
                      </td>

                      {/* Attendance % */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-400 text-sm">
                        {stu.attendancePercentage !== undefined && stu.attendancePercentage !== null
                          ? `${stu.attendancePercentage}%`
                          : '—'}
                      </td>

                      {/* Average Exam Score */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400 text-sm">
                        {stu.averageMarks !== undefined && stu.averageMarks !== null
                          ? `${stu.averageMarks}%`
                          : stu.averageScore !== undefined && stu.averageScore !== null
                          ? `${stu.averageScore}%`
                          : '—'}
                      </td>

                      {/* Pending Assignments */}
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-[#A89A91]">
                        {stu.totalAssignments && stu.assignmentsCompleted !== undefined
                          ? `${Math.max(0, stu.totalAssignments - stu.assignmentsCompleted)} Overdue`
                          : '0 Overdue'}
                      </td>

                      {/* Risk Severity */}
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            risk.level === 'CRITICAL RISK'
                              ? 'bg-rose-950/70 text-rose-300 border-rose-800/80'
                              : 'bg-amber-950/70 text-amber-300 border-amber-800/80'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              risk.level === 'CRITICAL RISK'
                                ? 'bg-rose-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          {risk.level}
                        </span>
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
              at-risk students
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
