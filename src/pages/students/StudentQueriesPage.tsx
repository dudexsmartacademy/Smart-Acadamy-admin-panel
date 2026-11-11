import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Search,
  ChevronDown,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  User,
  GraduationCap,
  Building,
  Mail,
  Phone,
  MessageSquare,
  Send,
  X,
  Sparkles,
  ExternalLink,
  Check,
  Download,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import {
  getStudentQueries,
  updateStudentQuery,
} from '../../services/studentQueryService';
import { getStudentById, getStudents } from '../../services/studentService';
import { academicService } from '../../services/academicService';
import {
  getStudentCollege,
  getStudentDegree,
  getStudentSpecialization,
  getStudentBatch,
} from './StudentListPage';
import { StudentQuery, Student } from '../../types';

export const StudentQueriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [queries, setQueries] = useState<StudentQuery[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Search & Standard Filters (Matching At-Risk & All Students)
  const [searchQuery, setSearchQuery] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [degreeFilter, setDegreeFilter] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  // Dropdown menus
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Active Query Modal
  const [selectedQuery, setSelectedQuery] = useState<StudentQuery | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'pending' | 'in_review' | 'resolved'>('in_review');
  const [adminResponseText, setAdminResponseText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = () => {
    setQueries(getStudentQueries());
    setStudents(getStudents());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter options
  const categories = [
    'All Categories',
    'Attendance Correction',
    'Technical Issues',
    'Exam / Assessment Query',
    'Course Content & Notes',
    'Live Session Access',
    'General Inquiry',
  ];

  const statuses = ['All Statuses', 'pending', 'in_review', 'resolved'];

  const [collegesVersion, setCollegesVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = academicService.onAcademicChange(() => {
      setCollegesVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

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

  // Helper to get student details for a query
  const getQueryStudentInfo = (q: StudentQuery) => {
    const s = students.find(
      (item) =>
        item.id === q.studentId ||
        item.studentId === q.studentId ||
        item.fullName.toLowerCase() === q.studentName.toLowerCase()
    );
    return {
      student: s,
      college: s ? getStudentCollege(s) : q.collegeName || 'DudeX Institute of Technology',
      degree: s ? getStudentDegree(s) : 'B.Tech',
      specialization: s ? getStudentSpecialization(s) : 'CSE',
      batch: s ? getStudentBatch(s) : q.batch || 'Batch 1',
    };
  };

  // Filtered queries
  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      const info = getQueryStudentInfo(q);

      // Category
      if (categoryFilter !== 'All Categories' && q.category !== categoryFilter) {
        return false;
      }

      // Status
      if (
        statusFilter !== 'All Statuses' &&
        q.status.toLowerCase() !== statusFilter.toLowerCase()
      ) {
        return false;
      }

      // College
      if (collegeFilter && info.college !== collegeFilter) {
        return false;
      }

      // Degree
      if (degreeFilter && info.degree !== degreeFilter) {
        return false;
      }

      // Specialization
      if (specializationFilter && info.specialization !== specializationFilter) {
        return false;
      }

      // Batch
      if (batchFilter && info.batch !== batchFilter) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matches =
          q.studentName.toLowerCase().includes(query) ||
          q.queryCode.toLowerCase().includes(query) ||
          q.studentId.toLowerCase().includes(query) ||
          q.description.toLowerCase().includes(query) ||
          (q.subject && q.subject.toLowerCase().includes(query)) ||
          info.college.toLowerCase().includes(query) ||
          info.degree.toLowerCase().includes(query) ||
          info.specialization.toLowerCase().includes(query) ||
          info.batch.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [
    queries,
    students,
    categoryFilter,
    statusFilter,
    collegeFilter,
    degreeFilter,
    specializationFilter,
    batchFilter,
    searchQuery,
  ]);

  // Statistics
  const stats = useMemo(() => {
    const total = queries.length;
    const pending = queries.filter(
      (q) => q.status.toLowerCase() === 'pending'
    ).length;
    const inReview = queries.filter(
      (q) => q.status.toLowerCase() === 'in_review'
    ).length;
    const resolved = queries.filter(
      (q) => q.status.toLowerCase() === 'resolved'
    ).length;

    return { total, pending, inReview, resolved };
  }, [queries]);

  // Handle open modal
  const handleOpenQuery = (query: StudentQuery) => {
    setSelectedQuery(query);
    setResolutionStatus((query.status.toLowerCase() as any) || 'in_review');
    setAdminResponseText(query.adminResponse || '');

    let student = getStudentById(query.studentId);
    if (!student) {
      student = getStudents().find(
        (s) => s.id === query.studentId || s.studentId === query.studentId
      );
    }
    setSelectedStudent(student || null);
  };

  // Handle Save Resolution
  const handleSaveResolution = () => {
    if (!selectedQuery) return;
    setIsSaving(true);

    updateStudentQuery(selectedQuery.id, {
      status: resolutionStatus,
      adminResponse: adminResponseText.trim(),
    });

    setTimeout(() => {
      setIsSaving(false);
      showToast(
        `Query [${selectedQuery.queryCode}] updated to "${resolutionStatus}"!`,
        'success'
      );
      loadData();
      setSelectedQuery(null);
    }, 400);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All Categories');
    setStatusFilter('All Statuses');
    setCollegeFilter('');
    setDegreeFilter('');
    setSpecializationFilter('');
    setBatchFilter('');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Query Code,Student Name,College,Degree,Specialization,Batch,Category,Subject,Priority,Status,Submitted At\n',
    ];
    const rows = filteredQueries.map((q) => {
      const info = getQueryStudentInfo(q);
      return `"${q.queryCode}","${q.studentName}","${info.college}","${info.degree}","${info.specialization}","${info.batch}","${q.category}","${q.subject || ''}","${q.priority}","${q.status}","${q.submittedAt}"`;
    }).join('\n');

    const blob = new Blob([...headers, rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_queries_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn font-sans">
      {/* Page Header with Export CSV action */}
      <PageHeader
        title="Student Queries & Support Desk"
        description="Manage inquiries, technical tickets, and attendance correction requests submitted by students from the help portal."
        breadcrumbs={[
          { label: 'Admin', path: '/admin/students/list' },
          { label: 'Students', path: '/admin/students/list' },
          { label: 'Student Queries' },
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

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#171311] border border-[#3A2922] rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#231A16] border border-[#3A2922] flex items-center justify-center text-[#A89A91]">
            <HelpCircle className="w-5 h-5 text-[#C49B7B]" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#A89A91] uppercase tracking-wider">
              Total Queries
            </div>
            <div className="text-2xl font-extrabold text-[#F5F0EA] tracking-tight mt-0.5">
              {stats.total}
            </div>
          </div>
        </div>

        <div className="bg-[#171311] border border-[#3A2922] rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#231A16] border border-[#3A2922] flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#A89A91] uppercase tracking-wider">
              Pending Review
            </div>
            <div className="text-2xl font-extrabold text-amber-400 tracking-tight mt-0.5">
              {stats.pending}
            </div>
          </div>
        </div>

        <div className="bg-[#171311] border border-[#3A2922] rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#231A16] border border-[#3A2922] flex items-center justify-center text-blue-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#A89A91] uppercase tracking-wider">
              In Review
            </div>
            <div className="text-2xl font-extrabold text-blue-400 tracking-tight mt-0.5">
              {stats.inReview}
            </div>
          </div>
        </div>

        <div className="bg-[#171311] border border-[#3A2922] rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#231A16] border border-[#3A2922] flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#A89A91] uppercase tracking-wider">
              Resolved Tickets
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 tracking-tight mt-0.5">
              {stats.resolved}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Controls (College, Degree, Specialization, Batch, Category, Status) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-4 shadow-sm space-y-3.5">
        {/* Row 1: Search + Category + Status + Reset */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A89A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, query code, batch, subject, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#140F0D] border border-[#3A2922] rounded-xl text-xs sm:text-sm text-[#F5F0EA] placeholder-[#A89A91]/60 focus:outline-none focus:border-[#946246] transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#946246] cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#140F0D] border border-[#3A2922] text-[#F5F0EA] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#946246] cursor-pointer capitalize"
            >
              {statuses.map((st) => (
                <option key={st} value={st}>
                  {st.replace('_', ' ')}
                </option>
              ))}
            </select>

            {(searchQuery || collegeFilter || degreeFilter || specializationFilter || batchFilter || categoryFilter !== 'All Categories' || statusFilter !== 'All Statuses') && (
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
              onChange={(e) => setCollegeFilter(e.target.value)}
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
              onChange={(e) => setDegreeFilter(e.target.value)}
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
              onChange={(e) => setSpecializationFilter(e.target.value)}
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
              onChange={(e) => setBatchFilter(e.target.value)}
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

      {/* Queries Table */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#140F0D] text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <th className="py-3.5 px-5">Student & Batch</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Query Details</th>
                <th className="py-3.5 px-3 text-center">Priority</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Submitted At</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1E19]/80">
              {filteredQueries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#A89A91]">
                    No student queries match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredQueries.map((q) => {
                  const statusKey = q.status.toLowerCase();
                  const info = getQueryStudentInfo(q);

                  return (
                    <tr
                      key={q.id}
                      className="hover:bg-[#1E1815]/70 transition-colors group"
                    >
                      {/* Student & Batch */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#2A1E19] border border-[#5A321F] flex items-center justify-center text-xs font-bold text-[#F5F0EA] flex-shrink-0">
                            {q.studentName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#F5F0EA] text-sm group-hover:text-[#C49B7B] transition-colors">
                              {q.studentName}
                            </div>
                            <div className="text-[11px] text-[#A89A91] flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-[#F5F0EA]">{info.batch}</span>
                              <span>•</span>
                              <span>{info.degree}</span>
                              <span>•</span>
                              <span>{info.specialization}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#231A16] border border-[#3A2922] text-[#F5F0EA]">
                          {q.category}
                        </span>
                      </td>

                      {/* Query Details */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-[#F5F0EA] truncate text-xs">
                          {q.subject || q.description.slice(0, 45)}
                        </div>
                        <p className="text-[11px] text-[#A89A91] line-clamp-1 mt-0.5">
                          {q.description}
                        </p>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            q.priority === 'high' || q.priority === 'urgent'
                              ? 'bg-rose-950/60 text-rose-300 border border-rose-800/80'
                              : q.priority === 'medium'
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/80'
                              : 'bg-[#231A16] text-[#A89A91] border border-[#3A2922]'
                          }`}
                        >
                          {q.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            statusKey === 'pending'
                              ? 'bg-amber-950/40 text-amber-400 border-amber-900/60'
                              : statusKey === 'in_review'
                              ? 'bg-blue-950/40 text-blue-400 border-blue-900/60'
                              : 'bg-[#1B2920] text-emerald-400 border-emerald-900/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              statusKey === 'pending'
                                ? 'bg-amber-400'
                                : statusKey === 'in_review'
                                ? 'bg-blue-400'
                                : 'bg-emerald-400'
                            }`}
                          />
                          {q.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Submitted At */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#A89A91]">
                        {q.submittedAt}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenQuery(q)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#231A16] hover:bg-[#2F211B] border border-[#3A2922] hover:border-[#5A321F] text-xs font-semibold text-[#F5F0EA] transition-all cursor-pointer shadow-sm group-hover:border-[#946246]/50"
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
      </div>

      {/* RESOLUTION & DETAIL MODAL */}
      {selectedQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#171311] border border-[#3A2922] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#140F0D] border-b border-[#3A2922] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#231A16] border border-[#5A321F] flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-[#C49B7B]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#F5F0EA]">
                      Query Ticket #{selectedQuery.queryCode}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#231A16] border border-[#3A2922] text-[#A89A91]">
                      {selectedQuery.category}
                    </span>
                  </div>
                  <div className="text-xs text-[#A89A91] mt-0.5">
                    Submitted by {selectedQuery.studentName} on{' '}
                    {selectedQuery.submittedAt}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedQuery(null)}
                className="w-8 h-8 rounded-lg bg-[#231A16] hover:bg-[#2F211B] border border-[#3A2922] text-[#A89A91] hover:text-[#F5F0EA] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Student Context Card */}
              {selectedStudent && (
                <div className="p-4 bg-[#140F0D] border border-[#2A1E19] rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[#A89A91] text-[10px] uppercase font-bold block">
                      Student
                    </span>
                    <span className="font-semibold text-[#F5F0EA] mt-0.5 block">
                      {selectedStudent.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A89A91] text-[10px] uppercase font-bold block">
                      College
                    </span>
                    <span className="font-semibold text-[#F5F0EA] mt-0.5 block truncate">
                      {getStudentCollege(selectedStudent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A89A91] text-[10px] uppercase font-bold block">
                      Degree & Specialization
                    </span>
                    <span className="font-semibold text-[#F5F0EA] mt-0.5 block truncate">
                      {getStudentDegree(selectedStudent)} • {getStudentSpecialization(selectedStudent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A89A91] text-[10px] uppercase font-bold block">
                      Batch
                    </span>
                    <span className="font-semibold text-[#F5F0EA] mt-0.5 block">
                      {getStudentBatch(selectedStudent)}
                    </span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#A89A91] uppercase tracking-wider">
                  Query Description
                </label>
                <div className="p-4 bg-[#140F0D] border border-[#2A1E19] rounded-xl text-xs text-[#F5F0EA] leading-relaxed">
                  {selectedQuery.description}
                </div>
              </div>

              {/* Status Update Radio Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#A89A91] uppercase tracking-wider">
                  Ticket Status
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['pending', 'in_review', 'resolved'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setResolutionStatus(st)}
                      className={`p-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        resolutionStatus === st
                          ? st === 'resolved'
                            ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
                            : st === 'in_review'
                            ? 'bg-blue-950/60 border-blue-600 text-blue-400'
                            : 'bg-amber-950/60 border-amber-600 text-amber-400'
                          : 'bg-[#140F0D] border-[#2A1E19] text-[#A89A91] hover:text-[#F5F0EA]'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          st === 'resolved'
                            ? 'bg-emerald-400'
                            : st === 'in_review'
                            ? 'bg-blue-400'
                            : 'bg-amber-400'
                        }`}
                      />
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Administrator Response */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#A89A91] uppercase tracking-wider">
                  Admin Resolution Note / Response to Student
                </label>
                <textarea
                  rows={3}
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  placeholder="Enter remarks or resolution details sent to the student..."
                  className="w-full p-3.5 bg-[#140F0D] border border-[#3A2922] rounded-xl text-xs text-[#F5F0EA] placeholder-[#A89A91]/60 focus:outline-none focus:border-[#946246] transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#140F0D] border-t border-[#3A2922] flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedQuery(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSaving}
                onClick={handleSaveResolution}
                className="bg-[#946246] hover:bg-[#7A4930] text-[#F5F0EA] font-bold"
              >
                {isSaving ? 'Updating...' : 'Save Resolution'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
