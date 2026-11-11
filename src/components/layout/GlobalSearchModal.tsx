import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  User,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  BookMarked,
  Clock,
  FileSpreadsheet,
  CreditCard,
  Building2,
  X,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { teacherService } from '../../services/teacherService';
import { getStudents } from '../../services/studentService';
import { academicService } from '../../services/academicService';
import { getAcademicBatches } from '../../services/academicBatchService';
import { getAcademicClasses } from '../../services/academicClassService';
import { getExams } from '../../services/examService';
import { getResults } from '../../services/resultService';
import { getFees } from '../../services/feeService';
import { announcementService } from '../../services/announcementService';
import { StatusBadge } from '../common/StatusBadge';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const teachers = useMemo(() => (isOpen ? teacherService.getTeachers() : []), [isOpen]);
  const students = useMemo(() => (isOpen ? getStudents() : []), [isOpen]);
  const colleges = useMemo(() => (isOpen ? academicService.getColleges() : []), [isOpen]);
  const batches = useMemo(() => (isOpen ? getAcademicBatches() : []), [isOpen]);
  const classes = useMemo(() => (isOpen ? getAcademicClasses() : []), [isOpen]);
  const exams = useMemo(() => (isOpen ? getExams() : []), [isOpen]);
  const results = useMemo(() => (isOpen ? getResults() : []), [isOpen]);
  const fees = useMemo(() => (isOpen ? getFees() : []), [isOpen]);
  const announcements = useMemo(() => (isOpen ? announcementService.getAnnouncements() : []), [isOpen]);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return {
        students: [],
        teachers: [],
        colleges: [],
        batches: [],
        classes: [],
        exams: [],
        results: [],
        fees: [],
        announcements: [],
      };
    }
    const q = query.toLowerCase().trim();

    return {
      students: students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.courseName && s.courseName.toLowerCase().includes(q)) ||
          (s.batchName && s.batchName.toLowerCase().includes(q))
      ),
      teachers: teachers.filter(
        (t) =>
          (t.fullName || (t as any).name || '').toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q)
      ),
      colleges: colleges.filter(
        (c) =>
          c.collegeName.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.degrees.some((d) => d.toLowerCase().includes(q)) ||
          c.specializations.some((s) => s.toLowerCase().includes(q))
      ),
      batches: batches.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.batchCode.toLowerCase().includes(q) ||
          b.courseName.toLowerCase().includes(q)
      ),
      classes: classes.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.courseName.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.teacherName.toLowerCase().includes(q)
      ),
      exams: exams.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.courseName.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q)
      ),
      results: results.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.studentIdCode.toLowerCase().includes(q) ||
          r.examTitle.toLowerCase().includes(q) ||
          r.grade.toLowerCase().includes(q)
      ),
      fees: fees.filter(
        (f) =>
          f.studentName.toLowerCase().includes(q) ||
          f.studentIdCode.toLowerCase().includes(q) ||
          f.courseName.toLowerCase().includes(q) ||
          f.feePlan.toLowerCase().includes(q)
      ),
      announcements: announcements.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.audience.toLowerCase().includes(q)
      ),
    };
  }, [
    query,
    students,
    teachers,
    colleges,
    batches,
    classes,
    exams,
    results,
    fees,
    announcements,
  ]);

  if (!isOpen) return null;

  const totalFound =
    filtered.students.length +
    filtered.teachers.length +
    filtered.colleges.length +
    filtered.classes.length +
    filtered.exams.length +
    filtered.results.length +
    filtered.fees.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 sm:pt-16">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-3xl bg-[#171311] border border-[#3A2922] rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Search input header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#3A2922] bg-[#1F1916] shrink-0">
          <Search className="w-5 h-5 text-[#946246] mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, faculty, courses, subjects, batches, exams, invoices..."
            className="w-full bg-transparent text-[#F5F0EA] placeholder-[#A89A91]/60 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#A89A91] hover:text-[#F5F0EA] rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block ml-3 px-2 py-0.5 text-[10px] bg-[#2A1710] text-[#A89A91] rounded border border-[#3A2922]">
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query && (
            <div className="py-12 text-center text-xs text-[#A89A91]">
              Type keywords above to search across all Dudex Academy entities in real time.
            </div>
          )}

          {query && totalFound === 0 && (
            <div className="py-12 text-center text-xs text-[#A89A91]">
              No results matched &quot;<span className="text-[#F5F0EA]">{query}</span>&quot;
            </div>
          )}

          {/* Students */}
          {filtered.students.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A89A91] uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#946246]" />
                Students ({filtered.students.length})
              </div>
              <div className="space-y-1">
                {filtered.students.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      navigate(`/admin/students/${s.id}`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#2A1710]/50 border border-transparent hover:border-[#5A321F]/40 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={s.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60'}
                        alt={s.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-[#5A321F]/50 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#F5F0EA] group-hover:text-[#F1E5D8]">
                            {s.fullName}
                          </span>
                          <span className="text-xs px-1.5 py-0.2 bg-[#2A1710] text-[#A89A91] rounded font-mono">
                            {s.studentId}
                          </span>
                        </div>
                        <p className="text-xs text-[#A89A91] mt-0.5">
                          {s.course} • Batch: {s.batch} ({s.section})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s.status} size="sm" />
                      <ArrowRight className="w-4 h-4 text-[#A89A91] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teachers */}
          {filtered.teachers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A89A91] uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#946246]" />
                Faculty Members ({filtered.teachers.length})
              </div>
              <div className="space-y-1">
                {filtered.teachers.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      navigate(`/admin/teachers/profile/${t.id}`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#2A1710]/50 border border-transparent hover:border-[#5A321F]/40 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={t.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60'}
                        alt={t.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-[#5A321F]/50 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#F5F0EA] group-hover:text-[#F1E5D8]">
                            {t.fullName}
                          </span>
                          <span className="text-xs px-1.5 py-0.2 bg-[#2A1710] text-[#A89A91] rounded font-mono">
                            {t.teacherId}
                          </span>
                        </div>
                        <p className="text-xs text-[#A89A91] mt-0.5">
                          {t.designation} • {t.department}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={t.status} size="sm" />
                      <ArrowRight className="w-4 h-4 text-[#A89A91] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Academic Colleges */}
          {filtered.colleges && filtered.colleges.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A89A91] uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#946246]" />
                Academic Institutions ({filtered.colleges.length})
              </div>
              <div className="space-y-1">
                {filtered.colleges.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      navigate('/admin/academic');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#2A1710]/50 border border-transparent hover:border-[#5A321F]/40 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#2A1710] text-[#F1E5D8]">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-[#F5F0EA] group-hover:text-[#F1E5D8]">
                          {c.collegeName} ({c.code})
                        </span>
                        <p className="text-xs text-[#A89A91] mt-0.5">
                          Degrees: {c.degrees.join(', ')} • Batches: {c.batches?.length || 0}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={c.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* Exams & Results */}
          {filtered.exams.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A89A91] uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#946246]" />
                Exams ({filtered.exams.length})
              </div>
              <div className="space-y-1">
                {filtered.exams.slice(0, 4).map((e) => (
                  <div
                    key={e.id}
                    onClick={() => {
                      navigate('/admin/students/exams');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#2A1710]/50 border border-transparent hover:border-[#5A321F]/40 cursor-pointer transition-colors group"
                  >
                    <div>
                      <span className="text-sm font-semibold text-[#F5F0EA]">
                        {e.title}
                      </span>
                      <p className="text-xs text-[#A89A91] mt-0.5">
                        {e.courseName} • {e.subjectName} • Date: {e.startDate}
                      </p>
                    </div>
                    <StatusBadge status={e.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
