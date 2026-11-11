import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Eye,
  X,
  ExternalLink,
  Award,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { getResults, getResultsByStudent } from '../../services/resultService';
import { getStudents } from '../../services/studentService';
import { academicService } from '../../services/academicService';
import {
  getStudentCollege,
  getStudentDegree,
  getStudentSpecialization,
  getStudentBatch,
} from './StudentListPage';
import { Student, StudentResult } from '../../types';

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);

  // Filters matching Student Directory & Attendance
  const [collegeFilter, setCollegeFilter] = useState('');
  const [degreeFilter, setDegreeFilter] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [collegesVersion, setCollegesVersion] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const load = () => {
      setStudents(getStudents());
      setResults(getResults());
    };
    load();

    import('../../services/resultService').then((m) => m.fetchResults().then(load));

    const handleResultsChanged = () => load();
    window.addEventListener('dudex_results_changed', handleResultsChanged);
    window.addEventListener('dudex_students_changed', handleResultsChanged);

    const unsubscribe = academicService.onAcademicChange(() => {
      setCollegesVersion((v) => v + 1);
    });
    return () => {
      window.removeEventListener('dudex_results_changed', handleResultsChanged);
      window.removeEventListener('dudex_students_changed', handleResultsChanged);
      unsubscribe();
    };
  }, []);

  // Available Filter Options
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

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
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
    students,
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

  // Open Student Result in new tab
  const handleOpenStudentResult = (studentId: string) => {
    window.open(`/admin/students/results/${studentId}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn font-sans">
      {/* Page Header */}
      <PageHeader
        title="Student Results & Assessments"
        description="Search students and review comprehensive academic assessment evaluations and scorecards."
        breadcrumbs={[
          { label: 'Student Management', path: '/admin/students/list' },
          { label: 'Results' },
        ]}
      />

      {/* Filter and Search Bar Controls (matching All Students page format) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-4 shadow-sm space-y-3.5">
        {/* Row 1: Search + Reset */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
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

          {(collegeFilter || degreeFilter || specializationFilter || batchFilter || searchQuery) && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#231A16] hover:bg-[#2F211B] border border-[#3A2922] text-xs font-semibold text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer self-start md:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
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

      {/* Results Table (Student Profile Image, Name, College, Degree, Specialization, Batch, Action Eye Logo) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#140F0D] text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <th className="py-3.5 px-5">Student</th>
                <th className="py-3.5 px-4">College</th>
                <th className="py-3.5 px-4">Degree</th>
                <th className="py-3.5 px-4">Specialization</th>
                <th className="py-3.5 px-4">Batch</th>
                <th className="py-3.5 px-4 text-center">Score</th>
                <th className="py-3.5 px-4 text-center">Percentage</th>
                <th className="py-3.5 px-4 text-center">Grade</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1E19]/80">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-[#A89A91]">
                    No students found matching your selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const college = getStudentCollege(student);
                  const degree = getStudentDegree(student);
                  const specialization = getStudentSpecialization(student);
                  const batch = getStudentBatch(student);

                  // results.student_id is profiles.id (auth UID); student.id
                  // is student_profiles.id. Match on both plus userId.
                  const studentResults = results.filter(
                    (r) =>
                      r.studentId === student.id ||
                      (student.userId && r.studentId === student.userId) ||
                      ((r as any).studentUserId && (r as any).studentUserId === student.userId) ||
                      (r.studentName && student.fullName && r.studentName.toLowerCase().trim() === student.fullName.toLowerCase().trim()) ||
                      (student.studentId && r.studentIdCode === student.studentId) ||
                      (Boolean((student as any).rollNumber) && r.studentIdCode === (student as any).rollNumber)
                  );
                  const latestResult = studentResults[0];

                  const scoreDisplay = latestResult
                    ? `${latestResult.marksObtained}/${latestResult.maxMarks}`
                    : '—';
                  const pctDisplay = latestResult
                    ? `${Number(latestResult.percentage).toFixed(2)}%`
                    : '—';
                  const gradeDisplay = latestResult?.grade || '—';

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-[#1E1815]/70 transition-colors group cursor-pointer"
                      onClick={() => handleOpenStudentResult(student.id)}
                    >
                      {/* Student (Profile Image + Name) */}
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

                      {/* Score */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#F5F0EA]">
                        {scoreDisplay}
                      </td>

                      {/* Percentage */}
                      <td className={`py-3.5 px-4 text-center font-mono font-bold ${latestResult ? 'text-emerald-400' : 'text-[#A89A91]'}`}>
                        {pctDisplay}
                      </td>

                      {/* Grade */}
                      <td className="py-3.5 px-4 text-center">
                        {latestResult ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2A1E19] border border-[#5A321F] text-[11px] font-bold text-[#F5F0EA]">
                            {gradeDisplay}
                          </span>
                        ) : (
                          <span className="text-xs text-[#A89A91] font-mono">—</span>
                        )}
                      </td>

                      {/* Action (Eye Logo - opens in new tab) */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenStudentResult(student.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#231A16] hover:bg-[#2F211B] border border-[#3A2922] hover:border-[#5A321F] text-xs font-semibold text-[#F5F0EA] transition-all cursor-pointer shadow-sm group-hover:border-[#946246]/50"
                          title="View Student Result in New Tab"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#C49B7B]" />
                          <span>View</span>
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
