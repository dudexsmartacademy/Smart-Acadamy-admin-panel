import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  PlusCircle,
  Search,
  BookOpen,
  Layers,
  Calendar,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import {
  getEnrollments,
  createEnrollment,
  updateEnrollmentStatus,
} from '../../services/enrollmentService';
import { getStudents } from '../../services/studentService';
import { getAcademicCourses } from '../../services/academicCourseService';
import { getAcademicBatches } from '../../services/academicBatchService';
import { StudentEnrollment } from '../../types';

export const EnrollmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const students = getStudents();
  const courses = getAcademicCourses();
  const batches = getAcademicBatches();

  const [formData, setFormData] = useState({
    studentId: students[0]?.id || '',
    courseId: courses[0]?.id || '',
    batchId: batches[0]?.id || '',
    feePlan: 'Semester Basis ($1,200/sem)' as StudentEnrollment['feePlan'],
  });

  const loadData = () => {
    setEnrollments(getEnrollments());
  };

  useEffect(() => {
    loadData();
    import('../../services/enrollmentService').then((m) => m.fetchEnrollments().then(loadData));
    const handleChanged = () => loadData();
    window.addEventListener('dudex_enrollments_changed', handleChanged);
    return () => window.removeEventListener('dudex_enrollments_changed', handleChanged);
  }, []);

  const filtered = enrollments.filter((e) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        e.studentName.toLowerCase().includes(q) ||
        e.studentId.toLowerCase().includes(q) ||
        e.courseName.toLowerCase().includes(q) ||
        e.batchName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selStudent = students.find((s) => s.id === formData.studentId);
    const selCourse = courses.find((c) => c.id === formData.courseId);
    const selBatch = batches.find((b) => b.id === formData.batchId);

    if (!selStudent || !selCourse || !selBatch) {
      showToast('Please select valid student, course and batch.', 'error');
      return;
    }

    createEnrollment({
      studentId: selStudent.id,
      studentName: selStudent.fullName,
      courseId: selCourse.id,
      courseName: selCourse.name,
      batchId: selBatch.id,
      batchName: selBatch.name,
      feePlan: formData.feePlan,
    });

    showToast(`Enrolled ${selStudent.fullName} into ${selCourse.name}!`, 'success');
    setIsModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Student Enrollments"
        subtitle="Manage program enrollments, batch assignments, and associated student fee plans"
        breadcrumbs={[
          { label: 'Admin', to: '/admin/students' },
          { label: 'Students', to: '/admin/students' },
          { label: 'Enrollments' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Enroll Student
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
            placeholder="Search by student name, ID, course, or batch..."
            className="w-full pl-9 pr-4 py-2 bg-[#1C1714] border border-[#3A2922] rounded-lg text-xs sm:text-sm text-[#F5F0EA] placeholder-[#A89A91]/60 focus:outline-none focus:border-[#946246]"
          />
        </div>
      </Card>

      <Card className="overflow-hidden border-[#3A2922] bg-[#140F0D]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#1A1412] text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Course Program</th>
                <th className="py-3 px-4">Batch Allocation</th>
                <th className="py-3 px-4">Enrollment Date</th>
                <th className="py-3 px-4">Fee Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1710]">
              {filtered.map((enr) => (
                <tr key={enr.id} className="hover:bg-[#1E1815]/60 transition-colors">
                  <td className="py-3 px-4">
                    <button
                      onClick={() => navigate(`/admin/students/${enr.studentId}`)}
                      className="font-semibold text-[#F5F0EA] hover:text-[#946246] transition-colors text-left"
                    >
                      {enr.studentName}
                    </button>
                    <div className="text-[11px] text-[#A89A91] font-mono">{enr.studentId}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#F5F0EA]">
                    {enr.courseName}
                  </td>
                  <td className="py-3 px-4 text-[#A89A91]">
                    {enr.batchName}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#A89A91]">
                    {enr.enrollmentDate}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#F1E5D8]">
                    {enr.feePlan}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={enr.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/students/${enr.studentId}`)}
                    >
                      View Dossier
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Enroll Student in Academic Program"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#A89A91] mb-1">Select Student *</label>
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#A89A91] mb-1">Course Program *</label>
            <select
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.courseCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#A89A91] mb-1">Assigned Batch *</label>
            <select
              value={formData.batchId}
              onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
              className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.batchCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#A89A91] mb-1">Fee Plan *</label>
            <select
              value={formData.feePlan}
              onChange={(e) => setFormData({ ...formData, feePlan: e.target.value as any })}
              className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
            >
              <option value="One-Time Full ($4,000)">One-Time Full ($4,000)</option>
              <option value="Semester Basis ($1,200/sem)">Semester Basis ($1,200/sem)</option>
              <option value="Monthly Installments ($450/mo)">Monthly Installments ($450/mo)</option>
              <option value="Scholarship (100% Waiver)">Scholarship (100% Waiver)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Complete Enrollment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
