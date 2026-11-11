import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  PlusCircle,
  Search,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  Award,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import {
  getExams,
  createExam,
  updateExamStatus,
  subscribeExams,
} from '../../services/examService';
import { getAcademicCourses } from '../../services/academicCourseService';
import { getAcademicSubjects } from '../../services/academicSubjectService';
import { getAcademicBatches } from '../../services/academicBatchService';
import { teacherService } from '../../services/teacherService';
import { StudentExam } from '../../types';

export const ExamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [exams, setExams] = useState<StudentExam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const courses = getAcademicCourses();
  const subjects = getAcademicSubjects();
  const batches = getAcademicBatches();
  const teachers = teacherService.getTeachers();

  const [formData, setFormData] = useState({
    title: '',
    courseName: courses[0]?.name || '',
    subjectName: subjects[0]?.name || '',
    teacherName: teachers[0]?.fullName || '',
    batchName: batches[0]?.name || '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '01:00 PM',
    durationMinutes: 180,
    totalMarks: 100,
    passingMarks: 50,
    status: 'Scheduled' as StudentExam['status'],
  });

  const loadData = () => {
    setExams(getExams());
  };

  useEffect(() => {
    loadData();
    import('../../services/examService').then((m) => m.fetchExams().then(loadData));
    const handleChanged = () => loadData();
    window.addEventListener('dudex_exams_changed', handleChanged);
    const unsub = subscribeExams(loadData);
    return () => {
      window.removeEventListener('dudex_exams_changed', handleChanged);
      unsub();
    };
  }, []);

  const filtered = exams.filter((e) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        e.title.toLowerCase().includes(q) ||
        e.courseName.toLowerCase().includes(q) ||
        e.subjectName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Exam title is required.', 'error');
      return;
    }

    createExam({
      ...formData,
      enrolledStudentsCount: 18,
      attemptsCount: 0,
    });

    showToast(`Exam "${formData.title}" scheduled successfully!`, 'success');
    setIsModalOpen(false);
    loadData();
  };

  const handleStatusChange = (id: string, status: StudentExam['status']) => {
    updateExamStatus(id, status);
    loadData();
    showToast(`Exam marked as ${status}`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Examinations Management"
        subtitle="Schedule comprehensive term assessments, set pass marks, monitor attempts, and generate results"
        breadcrumbs={[
          { label: 'Admin', to: '/admin/students' },
          { label: 'Students', to: '/admin/students' },
          { label: 'Exams' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Schedule Exam
          </Button>
        }
      />

      <Card className="p-4 bg-[#140F0D] border-[#3A2922]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#946246] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exams by title, course, or subject..."
            className="w-full pl-9 pr-4 py-2 bg-[#1C1714] border border-[#3A2922] rounded-lg text-xs sm:text-sm text-[#F5F0EA] placeholder-[#A89A91]/60 focus:outline-none focus:border-[#946246]"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((exam) => (
          <Card
            key={exam.id}
            className="p-5 bg-[#140F0D] border-[#3A2922] flex flex-col justify-between hover:border-[#5A321F] transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono text-[#946246]">{exam.courseName}</span>
                <StatusBadge status={exam.status} size="sm" />
              </div>
              <h3 className="font-bold text-sm text-[#F5F0EA]">{exam.title}</h3>
              <p className="text-xs text-[#A89A91] mt-0.5">{exam.subjectName} • Batch: {exam.batchName}</p>

              <div className="mt-4 pt-3 border-t border-[#2A1710] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#A89A91]">
                  <span>Date & Time:</span>
                  <span className="font-mono text-[#F1E5D8]">
                    {exam.startDate} ({exam.startTime})
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#A89A91]">
                  <span>Duration:</span>
                  <span className="font-semibold text-[#F5F0EA]">{exam.durationMinutes} Minutes</span>
                </div>
                <div className="flex items-center justify-between text-[#A89A91]">
                  <span>Total / Pass Marks:</span>
                  <span className="font-mono font-bold text-[#F1E5D8]">
                    {exam.totalMarks} / {exam.passingMarks}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#A89A91]">
                  <span>Registered Students:</span>
                  <span className="font-semibold text-emerald-400">{exam.enrolledStudentsCount || 18}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2A1710] flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/students/results')}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-pink-400" />
                Results
              </Button>
              {exam.status === 'Scheduled' && (
                <button
                  onClick={() => handleStatusChange(exam.id, 'Completed')}
                  className="px-2.5 py-1 text-xs rounded bg-emerald-950 text-emerald-300 font-semibold hover:bg-emerald-900 border border-emerald-800/40"
                >
                  Mark Completed
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Schedule Exam Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Academic Examination"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#A89A91] mb-1">Exam Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Midterm Comprehensive Examination 2026"
              className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A89A91] mb-1">Course *</label>
              <select
                value={formData.courseName}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#A89A91] mb-1">Subject *</label>
              <select
                value={formData.subjectName}
                onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A89A91] mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-[#A89A91] mb-1">Start Time *</label>
              <input
                type="text"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                placeholder="10:00 AM"
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[#A89A91] mb-1">Duration (mins)</label>
              <input
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-[#A89A91] mb-1">Total Marks</label>
              <input
                type="number"
                value={formData.totalMarks}
                onChange={(e) => setFormData({ ...formData, totalMarks: Number(e.target.value) })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-[#A89A91] mb-1">Pass Marks</label>
              <input
                type="number"
                value={formData.passingMarks}
                onChange={(e) => setFormData({ ...formData, passingMarks: Number(e.target.value) })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Schedule Exam
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
