import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  UserCheck,
  Eye,
  Trash2,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  Briefcase,
  ExternalLink,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import { useToast } from '../../context/ToastContext';

import { teacherApplicationService } from '../../services/teacherApplicationService';
import { TeacherApplication, ApplicationStatus } from '../../types';
import { DEPARTMENTS } from '../../constants/storageKeys';

export const TeacherApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError, info } = useToast();

  const [applications, setApplications] = useState<TeacherApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Selected for viewing/editing
  const [selectedApp, setSelectedApp] = useState<TeacherApplication | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');

  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject' | 'convert' | 'delete';
    app: TeacherApplication;
  } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = () => {
    setApplications(teacherApplicationService.getApplications());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.fullName.toLowerCase().includes(q) ||
        app.applicationNumber.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        app.department.toLowerCase().includes(q) ||
        app.requestedSubject.toLowerCase().includes(q);

      const matchesStatus = !statusFilter || app.status === statusFilter;
      const matchesDept = !deptFilter || app.department === deptFilter;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [applications, searchQuery, statusFilter, deptFilter]);

  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApps.slice(start, start + pageSize);
  }, [filteredApps, currentPage, pageSize]);

  const handleOpenDetail = (app: TeacherApplication) => {
    setSelectedApp(app);
    setReviewerNotes(app.reviewerNotes || '');
    setIsDetailModalOpen(true);
  };

  const handleUpdateStatus = (appId: string, status: ApplicationStatus, notes?: string) => {
    teacherApplicationService.updateApplicationStatus(appId, status, notes);
    success(
      `Application ${status.toUpperCase()}`,
      `Application has been marked as ${status.replace('_', ' ')}.`
    );
    loadData();
    setIsDetailModalOpen(false);
  };

  const handleConvert = async (app: TeacherApplication) => {
    try {
      const result = await teacherApplicationService.convertToTeacher(app.id);
      if (result) {
        success(
          'Applicant Successfully Converted to Faculty',
          `${result.teacher.fullName} is now an active faculty member with ID ${result.teacher.teacherId}.`
        );
        loadData();
        navigate(`/admin/teachers/${result.teacher.id}`);
      } else {
        toastError('Conversion Failed', 'Could not convert applicant into teacher record.');
      }
    } catch (error) {
      toastError(
        'Conversion Failed',
        error instanceof Error ? error.message : 'Could not convert applicant into teacher record.'
      );
    } finally {
      setConfirmAction(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'approve') {
      handleUpdateStatus(confirmAction.app.id, 'approved', reviewerNotes);
    } else if (confirmAction.type === 'reject') {
      handleUpdateStatus(confirmAction.app.id, 'rejected', reviewerNotes);
    } else if (confirmAction.type === 'convert') {
      await handleConvert(confirmAction.app);
    } else if (confirmAction.type === 'delete') {
      teacherApplicationService.deleteApplication(confirmAction.app.id);
      success('Application Deleted', `Removed application ${confirmAction.app.applicationNumber}`);
      loadData();
    }

    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Recruitment & Applications"
        description="Review candidate applications, verify qualifications, and convert approved applicants into faculty members."
        breadcrumbs={[
          { label: 'Teacher Management', path: '/admin/teachers' },
          { label: 'Teacher Applications' },
        ]}
      />

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl bg-[#171311] border border-[#3A2922] flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          placeholder="Search by applicant name, application #, subject, qualification..."
          className="flex-1"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholderOption="All Statuses"
            options={[
              { value: 'pending', label: 'Pending Review' },
              { value: 'under_review', label: 'Under Review' },
              { value: 'approved', label: 'Approved' },
              { value: 'converted', label: 'Converted to Faculty' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />

          <Select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholderOption="All Departments"
            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          />
        </div>
      </div>

      {/* Applications Table */}
      {paginatedApps.length === 0 ? (
        <EmptyState
          title="No Applications Found"
          description="No teacher applications match your filter criteria."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('');
            setDeptFilter('');
          }}
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Applicant Name</TableHeaderCell>
                <TableHeaderCell>Application #</TableHeaderCell>
                <TableHeaderCell>Department & Subject</TableHeaderCell>
                <TableHeaderCell>Qualification & Experience</TableHeaderCell>
                <TableHeaderCell>Applied Date</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {paginatedApps.map((app) => (
                <TableRow key={app.id} onClick={() => handleOpenDetail(app)}>
                  <TableCell>
                    <div>
                      <span className="font-bold text-[#F5F0EA] block">{app.fullName}</span>
                      <span className="text-xs text-[#A89A91]">{app.email}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="px-2 py-0.5 rounded bg-[#2A1710] text-[#F1E5D8] font-mono text-xs border border-[#5A321F]/40 font-semibold">
                      {app.applicationNumber}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div>
                      <span className="text-xs font-semibold text-[#F5F0EA] block">{app.department}</span>
                      <span className="text-[11px] text-[#A89A91] block">{app.requestedSubject}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <span className="text-xs text-[#F5F0EA] block">{app.qualification}</span>
                      <span className="text-[11px] text-[#A89A91]">{app.experienceYears} Years Exp</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-[#A89A91]">
                      {new Date(app.appliedDate).toLocaleDateString()}
                    </span>
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={app.status} size="sm" />
                  </TableCell>

                  <TableCell className="text-right">
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton
                        icon={<Eye className="w-4 h-4 text-[#A89A91] hover:text-[#F1E5D8]" />}
                        label="View Application"
                        size="sm"
                        onClick={() => handleOpenDetail(app)}
                      />

                      {app.status !== 'converted' && app.status !== 'rejected' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setConfirmAction({ type: 'convert', app })}
                          leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                          className="text-xs py-1 px-2.5"
                        >
                          Convert
                        </Button>
                      )}

                      {app.status === 'pending' && (
                        <>
                          <IconButton
                            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            label="Approve"
                            size="sm"
                            onClick={() => setConfirmAction({ type: 'approve', app })}
                          />
                          <IconButton
                            icon={<XCircle className="w-4 h-4 text-rose-400" />}
                            label="Reject"
                            size="sm"
                            onClick={() => setConfirmAction({ type: 'reject', app })}
                          />
                        </>
                      )}

                      <IconButton
                        icon={<Trash2 className="w-4 h-4 text-[#A89A91] hover:text-rose-400" />}
                        label="Delete"
                        size="sm"
                        onClick={() => setConfirmAction({ type: 'delete', app })}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredApps.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Application Detail & Review Modal */}
      {selectedApp && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Application Details: ${selectedApp.fullName}`}
          description={`Application Reference: ${selectedApp.applicationNumber}`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedApp.status} size="md" />
              </div>
              <div className="flex items-center gap-2">
                {selectedApp.status !== 'converted' && selectedApp.status !== 'rejected' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setConfirmAction({ type: 'convert', app: selectedApp });
                    }}
                    leftIcon={<UserCheck className="w-4 h-4" />}
                  >
                    Convert to Faculty
                  </Button>
                )}

                {selectedApp.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedApp.id, 'rejected', reviewerNotes)}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedApp.id, 'approved', reviewerNotes)}
                    >
                      Approve Application
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-5 text-sm">
            {/* Candidate Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#140F0D] border border-[#3A2922]">
              <div>
                <span className="text-xs text-[#A89A91] block">Full Legal Name</span>
                <span className="text-[#F5F0EA] font-semibold">{selectedApp.fullName}</span>
              </div>
              <div>
                <span className="text-xs text-[#A89A91] block">Contact Email</span>
                <span className="text-[#F5F0EA] font-semibold">{selectedApp.email}</span>
              </div>
              <div>
                <span className="text-xs text-[#A89A91] block">Phone</span>
                <span className="text-[#F5F0EA] font-semibold">{selectedApp.phone}</span>
              </div>
              <div>
                <span className="text-xs text-[#A89A91] block">Applied Date</span>
                <span className="text-[#F5F0EA] font-semibold">
                  {new Date(selectedApp.appliedDate).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#A89A91] block">Department</span>
                <span className="text-[#F5F0EA] font-semibold">{selectedApp.department}</span>
              </div>
              <div>
                <span className="text-xs text-[#A89A91] block">Requested Discipline</span>
                <span className="text-[#F5F0EA] font-semibold">{selectedApp.requestedSubject}</span>
              </div>
            </div>

            {/* Academic Credentials */}
            <div>
              <h4 className="text-xs font-bold uppercase text-[#A89A91] tracking-wider mb-2">
                Qualifications & Research Background
              </h4>
              <p className="text-sm text-[#F5F0EA] font-medium">{selectedApp.qualification}</p>
              <p className="text-xs text-[#A89A91] mt-0.5">
                {selectedApp.experienceYears} Years of Higher Education Instruction Experience
              </p>
            </div>

            {/* Cover Letter */}
            {selectedApp.coverLetter && (
              <div>
                <h4 className="text-xs font-bold uppercase text-[#A89A91] tracking-wider mb-1.5">
                  Candidate Statement / Cover Letter
                </h4>
                <div className="p-3.5 rounded-xl bg-[#111111] border border-[#3A2922] text-xs text-[#A89A91] leading-relaxed">
                  {selectedApp.coverLetter}
                </div>
              </div>
            )}

            {/* Skills */}
            {selectedApp.skills && selectedApp.skills.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase text-[#A89A91] tracking-wider mb-2">
                  Competencies
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedApp.skills.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-full text-xs bg-[#2A1710] text-[#F1E5D8] border border-[#5A321F]/40"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviewer Notes Editor */}
            <div>
              <Textarea
                label="Administrative Review Remarks"
                placeholder="Enter comments, interview feedback, or reason for decision..."
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={
          confirmAction?.type === 'convert'
            ? 'Convert Applicant to Active Faculty Member'
            : confirmAction?.type === 'approve'
            ? 'Approve Faculty Application'
            : confirmAction?.type === 'reject'
            ? 'Reject Application'
            : 'Delete Application'
        }
        message={
          confirmAction?.type === 'convert'
            ? `Confirm conversion of ${confirmAction.app.fullName}. This requires a verified Supabase Auth account and sends a secure password setup link.`
            : `Are you sure you want to proceed with this action for ${confirmAction?.app.fullName}?`
        }
        confirmText={
          confirmAction?.type === 'convert'
            ? 'Convert & Enroll Faculty'
            : confirmAction?.type === 'approve'
            ? 'Approve'
            : confirmAction?.type === 'reject'
            ? 'Reject'
            : 'Delete'
        }
        variant={
          confirmAction?.type === 'reject' || confirmAction?.type === 'delete' ? 'danger' : 'primary'
        }
      />
    </div>
  );
};
