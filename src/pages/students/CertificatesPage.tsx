import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  PlusCircle,
  Search,
  Eye,
  Printer,
  ShieldCheck,
  CheckCircle2,
  XCircle,
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
  getCertificates,
  issueCertificate,
  updateCertificateStatus,
} from '../../services/certificateService';
import { getStudents } from '../../services/studentService';
import { getAcademicCourses } from '../../services/academicCourseService';
import { StudentCertificate } from '../../types';

export const CertificatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewCert, setPreviewCert] = useState<StudentCertificate | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  const students = getStudents();
  const courses = getAcademicCourses();

  const [formData, setFormData] = useState({
    studentId: students[0]?.id || '',
    courseName: courses[0]?.name || 'Full-Stack Web Development',
  });

  const loadData = () => {
    setCertificates(getCertificates());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = certificates.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        c.studentName.toLowerCase().includes(q) ||
        c.certificateNumber.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const selStudent = students.find((s) => s.id === formData.studentId);
    if (!selStudent) return;

    const issued = issueCertificate({
      studentId: selStudent.id,
      studentName: selStudent.fullName,
      courseName: formData.courseName,
      certificateNumber: `DX-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Issued',
    });

    showToast(`Issued certificate for ${selStudent.fullName}!`, 'success');
    setIsIssueModalOpen(false);
    loadData();
    setPreviewCert(issued);
  };

  const handleStatusToggle = (cert: StudentCertificate) => {
    const nextStatus = cert.status === 'Issued' ? 'Revoked' : 'Issued';
    updateCertificateStatus(cert.id, nextStatus);
    loadData();
    showToast(`Certificate status updated to ${nextStatus}`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Student Certificate Management"
        subtitle="Issue cryptographic academic credentials, print diplomas, and verify qualification certificates"
        breadcrumbs={[
          { label: 'Admin', to: '/admin/students' },
          { label: 'Students', to: '/admin/students' },
          { label: 'Certificates' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsIssueModalOpen(true)}>
            <Award className="w-4 h-4 mr-1.5" />
            Issue Certificate
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
            placeholder="Search by student name, certificate ID, or course..."
            className="w-full pl-9 pr-4 py-2 bg-[#1C1714] border border-[#3A2922] rounded-lg text-xs sm:text-sm text-[#F5F0EA] placeholder-[#A89A91]/60 focus:outline-none focus:border-[#946246]"
          />
        </div>
      </Card>

      {/* Certificates Table */}
      <Card className="overflow-hidden border-[#3A2922] bg-[#140F0D]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#1A1412] text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <th className="py-3 px-4">Certificate ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Course Completed</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1710]">
              {filtered.map((cert) => (
                <tr key={cert.id} className="hover:bg-[#1E1815]/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#F1E5D8]">
                    {cert.certificateNumber}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => navigate(`/admin/students/${cert.studentId}`)}
                      className="font-semibold text-[#F5F0EA] hover:text-[#946246] transition-colors flex items-center gap-1.5"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-[#946246]" />
                      {cert.studentName}
                    </button>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#F5F0EA]">
                    {cert.courseName}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#A89A91]">
                    {cert.issuedDate}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={cert.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewCert(cert)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Preview
                      </Button>
                      <button
                        onClick={() => handleStatusToggle(cert)}
                        className={`text-xs px-2 py-1 rounded font-semibold transition-colors ${
                          cert.status === 'Issued'
                            ? 'text-rose-400 hover:bg-rose-950/40'
                            : 'text-emerald-400 hover:bg-emerald-950/40'
                        }`}
                      >
                        {cert.status === 'Issued' ? 'Revoke' : 'Re-issue'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Luxury Certificate Modal Preview */}
      <Modal
        isOpen={Boolean(previewCert)}
        onClose={() => setPreviewCert(null)}
        title="Certificate of Academic Excellence"
      >
        {previewCert && (
          <div className="space-y-4 text-center">
            {/* Certificate Frame */}
            <div
              id="printable-certificate"
              className="p-8 sm:p-10 rounded-2xl bg-gradient-to-b from-[#1C1714] via-[#140F0D] to-[#0D0A09] border-4 border-[#946246] shadow-2xl relative overflow-hidden text-[#F5F0EA]"
            >
              {/* Corner Ornaments */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-[#946246]" />
              <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-[#946246]" />
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-[#946246]" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-[#946246]" />

              <div className="mb-2 flex justify-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7A4930] to-[#2A1710] border border-[#946246] flex items-center justify-center text-[#F1E5D8] shadow-lg">
                  <Award className="w-6 h-6 text-[#F1E5D8]" />
                </div>
              </div>

              <div className="text-xl sm:text-2xl font-black tracking-widest text-[#F1E5D8] uppercase font-serif">
                DUDEx SMART ACADEMY
              </div>
              <div className="text-[10px] sm:text-xs text-[#A89A91] tracking-widest uppercase mt-0.5">
                Official Certification of Mastery
              </div>

              <div className="my-6">
                <p className="text-xs italic text-[#A89A91]">This is proudly presented to</p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F5F0EA] tracking-wide my-2">
                  {previewCert.studentName}
                </h2>
                <p className="text-xs text-[#A89A91] max-w-md mx-auto leading-relaxed">
                  for successfully fulfilling all rigorous academic requirements, hands-on lab milestones, and comprehensive examination standards in
                </p>
                <div className="text-base sm:text-lg font-bold text-[#946246] mt-2 tracking-wide uppercase font-serif">
                  {previewCert.courseName}
                </div>
              </div>

              {/* Signatures & Verification */}
              <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-[#3A2922] text-xs">
                <div className="text-center">
                  <div className="h-8 flex items-end justify-center">
                    <span className="font-serif italic text-sm text-[#F1E5D8]">Dr. Sarah Jenkins</span>
                  </div>
                  <div className="border-t border-[#5A321F] pt-1 text-[10px] text-[#A89A91] uppercase tracking-wider">
                    Dean of Academics
                  </div>
                </div>

                <div className="text-center">
                  <div className="h-8 flex items-end justify-center">
                    <span className="font-serif italic text-sm text-[#F1E5D8]">Marcus Vance</span>
                  </div>
                  <div className="border-t border-[#5A321F] pt-1 text-[10px] text-[#A89A91] uppercase tracking-wider">
                    Head of Engineering
                  </div>
                </div>
              </div>

              <div className="mt-6 text-[10px] font-mono text-[#A89A91] flex justify-between items-center">
                <span>Certificate No: <strong className="text-[#F1E5D8]">{previewCert.certificateNumber}</strong></span>
                <span>Issue Date: <strong className="text-[#F1E5D8]">{previewCert.issuedDate}</strong></span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewCert(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1.5" />
                Print Certificate
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Issue Certificate Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Issue Student Academic Certificate"
      >
        <form onSubmit={handleIssue} className="space-y-4 text-xs">
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Generate & Issue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
