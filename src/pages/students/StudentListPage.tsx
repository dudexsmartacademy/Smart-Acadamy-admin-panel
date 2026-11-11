import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Download,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { getStudents, deleteStudent } from '../../services/studentService';
import { academicService } from '../../services/academicService';
import { Student } from '../../types';

// Helper to determine the student's college
export const getStudentCollege = (s: Student): string => {
  return s.collegeName || 'DudeX Institute of Technology';
};

// Helper to determine the student's degree
export const getStudentDegree = (s: Student): string => {
  if (s.degree) return s.degree;
  if (s.department?.includes('Artificial') || s.courseName?.includes('Neural')) return 'M.Tech';
  if (s.department?.includes('Computer') || s.courseName?.includes('Data Structures')) return 'B.Tech';
  if (s.department?.includes('Information') || s.courseName?.includes('Network')) return 'B.Tech';
  return 'B.Tech';
};

// Helper to determine the student's clean specialization (WITHOUT batch)
export const getStudentSpecialization = (s: Student): string => {
  if (s.specialization) {
    const clean = s.specialization.split('-')[0].replace(/Batch\s*\d+/i, '').trim();
    if (clean) return clean;
  }
  if (s.department?.includes('Artificial') || s.courseName?.includes('Neural')) return 'AI & DS';
  if (s.department?.includes('Information') || s.courseName?.includes('Network')) return 'Cyber Security';
  if (s.department?.includes('Technology') || s.courseName?.includes('Modern')) return 'Information Technology';
  return 'CSE';
};

// Helper to determine the student's batch
export const getStudentBatch = (s: Student): string => {
  if (s.batch) return s.batch;
  if (s.batchName) return s.batchName;
  if (s.specialization && s.specialization.includes('Batch 2')) return 'Batch 2';
  if (s.specialization && s.specialization.includes('Batch 3')) return 'Batch 3';
  return 'Batch 1';
};

export const StudentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Primary Filters: College, Degree, Specialization, Batch
  const [collegeFilter, setCollegeFilter] = useState('');
  const [degreeFilter, setDegreeFilter] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'attendance' | 'specialization' | 'batch' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const loadData = () => {
    setStudents(getStudents());
  };

  const [collegesVersion, setCollegesVersion] = useState(0);

  useEffect(() => {
    loadData();
    // Async refresh from Supabase
    import('../../services/studentService').then((m) => m.fetchStudents().then(loadData));

    const handleStudentsChanged = () => loadData();
    window.addEventListener('dudex_students_changed', handleStudentsChanged);

    const unsubscribe = academicService.onAcademicChange(() => {
      setCollegesVersion((v) => v + 1);
    });
    return () => {
      window.removeEventListener('dudex_students_changed', handleStudentsChanged);
      unsubscribe();
    };
  }, []);

  // 1. Available Colleges
  const availableColleges = useMemo(() => {
    const list = academicService.getAllColleges();
    const set = new Set<string>(list);
    students.forEach((s) => {
      if (s.collegeName) set.add(s.collegeName);
    });
    return Array.from(set);
  }, [students, collegesVersion]);

  // 2. Available Degrees
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

  // 3. Available Specializations (Clean, without batch)
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

  // 4. Available Batches
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

  // Filtered students list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // 1. College Filter
      if (collegeFilter && getStudentCollege(s) !== collegeFilter) {
        return false;
      }

      // 2. Degree Filter
      if (degreeFilter && getStudentDegree(s) !== degreeFilter) {
        return false;
      }

      // 3. Specialization Filter (Clean)
      if (specializationFilter && getStudentSpecialization(s) !== specializationFilter) {
        return false;
      }

      // 4. Batch Filter
      if (batchFilter && getStudentBatch(s) !== batchFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter && s.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const spec = getStudentSpecialization(s).toLowerCase();
        const deg = getStudentDegree(s).toLowerCase();
        const b = getStudentBatch(s).toLowerCase();
        const matches =
          s.fullName.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          spec.includes(q) ||
          deg.includes(q) ||
          b.includes(q) ||
          getStudentCollege(s).toLowerCase().includes(q);
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
    statusFilter,
    searchQuery,
  ]);

  // Sorting
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.fullName.localeCompare(b.fullName);
      } else if (sortBy === 'attendance') {
        comparison = (a.attendancePercentage || 0) - (b.attendancePercentage || 0);
      } else if (sortBy === 'specialization') {
        comparison = getStudentSpecialization(a).localeCompare(getStudentSpecialization(b));
      } else if (sortBy === 'batch') {
        comparison = getStudentBatch(a).localeCompare(getStudentBatch(b));
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredStudents, sortBy, sortOrder]);

  // Pagination
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, currentPage, pageSize]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteStudent(deleteTarget.id);
      loadData();
      setDeleteTarget(null);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setCollegeFilter('');
    setDegreeFilter('');
    setSpecializationFilter('');
    setBatchFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto font-sans animate-fadeIn">
      {/* Top Header & Breadcrumbs */}
      <PageHeader
        title="Student Directory"
        description={`Displaying ${filteredStudents.length} of ${students.length} students across academic programs`}
        breadcrumbs={[
          { label: 'Admin', path: '/admin/students/list' },
          { label: 'Students', path: '/admin/students/list' },
          { label: 'Directory' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const headers = ['ID,Name,College,Degree,Specialization,Batch,Attendance,Status\n'];
                const rows = filteredStudents.map(
                  (s) =>
                    `"${s.studentId}","${s.fullName}","${getStudentCollege(s)}","${getStudentDegree(s)}","${getStudentSpecialization(s)}","${getStudentBatch(s)}","${s.attendancePercentage}%","${s.status}"`
                ).join('\n');
                const blob = new Blob([...headers, rows], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `students_directory_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              }}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filter & Search Bar Container (Separated Specialization & Batch) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-4 shadow-sm space-y-3.5">
        {/* Row 1: Search + Status */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A89A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by student name, ID, email, phone, degree, specialization or batch..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#140F0D] border border-[#3A2922] rounded-xl text-xs sm:text-sm text-[#F5F0EA] placeholder-[#A89A91]/60 focus:outline-none focus:border-[#946246] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#946246] cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>

            {(searchQuery || collegeFilter || degreeFilter || specializationFilter || batchFilter || statusFilter) && (
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
          {/* 1. College Selector */}
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

          {/* 2. Degree Selector */}
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

          {/* 3. Specialization Selector (Clean, pure specialization) */}
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

          {/* 4. Batch Selector (Separated from Specialization) */}
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

      {/* Table Container (Gender and DOB removed, Batch column added) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#140F0D] text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <th
                  className="py-3.5 px-5 cursor-pointer hover:text-[#F5F0EA]"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1.5">
                    Profile & Name
                    {sortBy === 'name' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4">Student ID</th>
                <th className="py-3.5 px-4">Contact</th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-[#F5F0EA]"
                  onClick={() => toggleSort('specialization')}
                >
                  <div className="flex items-center gap-1.5">
                    Specialization
                    {sortBy === 'specialization' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-[#F5F0EA]"
                  onClick={() => toggleSort('batch')}
                >
                  <div className="flex items-center gap-1.5">
                    Batch
                    {sortBy === 'batch' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-[#F5F0EA]"
                  onClick={() => toggleSort('attendance')}
                >
                  <div className="flex items-center gap-1.5">
                    Attendance
                    {sortBy === 'attendance' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-[#F5F0EA]"
                  onClick={() => toggleSort('status')}
                >
                  <div className="flex items-center gap-1.5">
                    Status
                    {sortBy === 'status' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1E19]/80">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#A89A91]">
                    No students found matching your selected college, degree, specialization, or batch criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => {
                  const hasAtt = s.attendancePercentage !== undefined && s.attendancePercentage !== null;
                  const att = hasAtt ? s.attendancePercentage : 0;
                  const degree = getStudentDegree(s);
                  const specialization = getStudentSpecialization(s);
                  const batch = getStudentBatch(s);

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-[#1E1815]/70 transition-colors group"
                    >
                      {/* Profile & Name (Gender and DOB removed completely) */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {s.avatar ? (
                            <img
                              src={s.avatar}
                              alt={s.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-[#3A2922]"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#2A1E19] border border-[#5A321F] flex items-center justify-center text-xs font-bold text-[#F5F0EA]">
                              {s.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/admin/students/profile/${s.id}`)
                              }
                              className="font-bold text-[#F5F0EA] hover:text-[#C49B7B] transition-colors text-left block"
                            >
                              {s.fullName}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#F5F0EA]">
                        {s.studentId}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 max-w-[180px]">
                        <div className="text-[#F5F0EA] truncate font-mono text-[11px]">
                          {s.email}
                        </div>
                        <div className="text-[11px] text-[#A89A91] font-mono mt-0.5">
                          {s.phone}
                        </div>
                      </td>

                      {/* Specialization & Degree */}
                      <td className="py-3.5 px-4">
                        <div className="text-[#F5F0EA] font-semibold text-xs truncate max-w-[200px]">
                          {specialization}
                        </div>
                        <div className="text-[11px] text-[#A89A91] mt-0.5 font-medium">
                          {degree}
                        </div>
                      </td>

                      {/* Batch Column */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA]">
                          {batch}
                        </span>
                      </td>

                      {/* Attendance */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#231A16] rounded-full overflow-hidden border border-[#3A2922]">
                            <div
                              className={`h-full rounded-full ${
                                !hasAtt
                                  ? 'bg-neutral-600'
                                  : att >= 75
                                  ? 'bg-emerald-400'
                                  : att >= 60
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                              style={{ width: `${hasAtt ? Math.min(att, 100) : 0}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono text-xs font-bold ${
                              !hasAtt
                                ? 'text-[#A89A91]'
                                : att >= 75
                                ? 'text-emerald-400'
                                : att >= 60
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {hasAtt ? `${att}%` : '0%'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            s.status.toLowerCase() === 'active'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                              : 'bg-neutral-800/40 text-neutral-400 border-neutral-700/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              s.status.toLowerCase() === 'active'
                                ? 'bg-emerald-400'
                                : 'bg-neutral-400'
                            }`}
                          />
                          {s.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/admin/students/profile/${s.id}`)
                            }
                            className="p-1.5 rounded-lg bg-[#231A16] hover:bg-[#2F211B] text-[#A89A91] hover:text-[#F5F0EA] border border-[#3A2922] transition-colors cursor-pointer"
                            title="View Student Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            className="p-1.5 rounded-lg bg-[#231A16] hover:bg-rose-950/40 text-[#A89A91] hover:text-rose-400 border border-[#3A2922] hover:border-rose-900/40 transition-colors cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Student Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#A89A91]">
            Are you sure you want to delete student{' '}
            <strong className="text-[#F5F0EA]">{deleteTarget?.fullName}</strong>{' '}
            ({deleteTarget?.studentId})? This action will remove all academic
            enrollments and cannot be undone.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDeleteConfirm}
            >
              Delete Student
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
