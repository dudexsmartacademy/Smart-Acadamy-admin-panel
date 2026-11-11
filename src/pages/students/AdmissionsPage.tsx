import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Eye,
  PlusCircle,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import {
  getAdmissions,
  updateAdmissionStatus,
  convertAdmissionToStudent,
  createAdmission,
} from '../../services/admissionService';
import { getAcademicCourses } from '../../services/academicCourseService';
import { StudentAdmission } from '../../types';

export const AdmissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [admissions, setAdmissions] = useState<StudentAdmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Admission for View/Convert
  const [selectedAdmission, setSelectedAdmission] = useState<StudentAdmission | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Application Form
  const courses = getAcademicCourses();
  const [newApp, setNewApp] = useState({
    applicantName: '',
    email: '',
    phone: '',
    courseName: courses[0]?.name || 'Full-Stack Web Development',
    qualification: "Bachelor's in Computer Science",
    notes: 'Candidate has 1 year of junior dev experience.',
  });

  const loadData = () => {
    setAdmissions(getAdmissions());
  };

  useEffect(() => {
    loadData();
    import('../../services/admissionService').then((m) => m.fetchAdmissions().then(loadData));
    const handleChanged = () => loadData();
    window.addEventListener('dudex_admissions_changed', handleChanged);
    return () => window.removeEventListener('dudex_admissions_changed', handleChanged);
  }, []);

  const filtered = useMemo(() => {
    return admissions.filter((a) => {
      const name = a.applicantName || a.fullName || '';
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          name.toLowerCase().includes(q) ||
          (a.applicationId || '').toLowerCase().includes(q) ||
          (a.email || '').toLowerCase().includes(q) ||
          (a.courseName || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (statusFilter && a.status !== statusFilter) return false;
      return true;
    });
  }, [admissions, searchQuery, statusFilter]);

  const handleStatusChange = (id: string, status: StudentAdmission['status']) => {
    updateAdmissionStatus(id, status);
    loadData();
    showToast(`Application status updated to ${status}`, 'success');
  };

  const handleConvert = () => {
    if (!selectedAdmission) return;
    const newStudent = convertAdmissionToStudent(selectedAdmission.id);
    if (newStudent) {
      showToast(`Applicant converted to Student: ${newStudent.fullName}!`, 'success');
      setIsConvertModalOpen(false);
      loadData();
      navigate(`/admin/students/${newStudent.id}`);
    } else {
      showToast('Conversion failed. Please try again.', 'error');
    }
  };

  const handleCreateApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApp.applicantName.trim() || !newApp.email.trim() || !newApp.phone.trim()) {
      showToast('Please fill all required fields.', 'error');
      return;
    }
    createAdmission(newApp);
    showToast('New admission application registered!', 'success');
    setIsCreateModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Student Admissions"
        subtitle="Manage prospective student applications, review qualifications, and convert applicants into active academy students"
        breadcrumbs={[
          { label: 'Admin', to: '/admin/students' },
          { label: 'Students', to: '/admin/students' },
          { label: 'Admissions' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-1.5" />
            New Admission
          </Button>
        }
      />

      {/* Filter Bar */}
      <Card className="p-4 bg-[#140F0D] border-[#3A2922]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#946246] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by applicant name, ID, email, or course..."
              className="w-full pl-9 pr-4 py-2 bg-[#1C1714] border border-[#3A2922] rounded-lg text-xs sm:text-sm text-[#F5F0EA] placeholder-[#A89A91]/60 focus:outline-none focus:border-[#946246]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] text-xs rounded-lg px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Converted">Converted</option>
            <option value="Rejected">Rejected</option>
            <option value="Waitlisted">Waitlisted</option>
          </select>
        </div>
      </Card>

      {/* Applications Table */}
      <Card className="overflow-hidden border-[#3A2922] bg-[#140F0D]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#1A1412] text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Course Applied</th>
                <th className="py-3 px-4">Qualification</th>
                <th className="py-3 px-4">Application Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1710]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#A89A91]">
                    No admission applications found.
                  </td>
                </tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-[#1E1815]/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#F1E5D8]">
                      {app.applicationId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#F5F0EA]">
                      {app.applicantName}
                    </td>
                    <td className="py-3 px-4 text-[#A89A91]">
                      <div>{app.email}</div>
                      <div className="text-[11px]">{app.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#F5F0EA]">
                      {app.courseName}
                    </td>
                    <td className="py-3 px-4 text-[#A89A91]">
                      {app.qualification}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#A89A91]">
                      {app.applicationDate}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {app.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(app.id, 'Approved')}
                              className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/40"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(app.id, 'Rejected')}
                              className="px-2 py-1 text-[11px] font-semibold rounded bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-800/40"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {app.status === 'Approved' && (
                          <button
                            onClick={() => {
                              setSelectedAdmission(app);
                              setIsConvertModalOpen(true);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold rounded bg-[#5A321F] text-[#F1E5D8] hover:bg-[#7A4930] flex items-center gap-1"
                          >
                            <GraduationCap className="w-3 h-3" />
                            Convert
                          </button>
                        )}
                        {app.status === 'Converted' && (
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Converted
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Convert to Student Confirmation Modal */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert Admission to Student"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#A89A91]">
            Converting <strong className="text-[#F5F0EA]">{selectedAdmission?.applicantName}</strong> will automatically create a new student record with assigned student ID, batch, course enrollment, and initial fee invoice.
          </p>
          <div className="p-3 bg-[#140F0D] rounded-lg border border-[#3A2922] space-y-1.5 font-mono">
            <div>Course: <span className="text-[#F1E5D8]">{selectedAdmission?.courseName}</span></div>
            <div>Email: <span className="text-[#F1E5D8]">{selectedAdmission?.email}</span></div>
            <div>Phone: <span className="text-[#F1E5D8]">{selectedAdmission?.phone}</span></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsConvertModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConvert}>
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Confirm & Create Student
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Application Registration Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register Admission Application"
      >
        <form onSubmit={handleCreateApplication} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#A89A91] mb-1">Applicant Name *</label>
            <input
              type="text"
              required
              value={newApp.applicantName}
              onChange={(e) => setNewApp({ ...newApp, applicantName: e.target.value })}
              className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A89A91] mb-1">Email *</label>
              <input
                type="email"
                required
                value={newApp.email}
                onChange={(e) => setNewApp({ ...newApp, email: e.target.value })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-[#A89A91] mb-1">Phone *</label>
              <input
                type="tel"
                required
                value={newApp.phone}
                onChange={(e) => setNewApp({ ...newApp, phone: e.target.value })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-[#A89A91] mb-1">Course Applied *</label>
            <select
              value={newApp.courseName}
              onChange={(e) => setNewApp({ ...newApp, courseName: e.target.value })}
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
            <label className="block text-[#A89A91] mb-1">Qualification</label>
            <input
              type="text"
              value={newApp.qualification}
              onChange={(e) => setNewApp({ ...newApp, qualification: e.target.value })}
              className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
