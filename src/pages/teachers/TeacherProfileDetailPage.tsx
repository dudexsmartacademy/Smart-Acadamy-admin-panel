import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Edit2,
  Plus,
  Power,
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  ShieldCheck,
  BriefcaseBusiness,
  Key,
  Send,
  Copy,
  ExternalLink,
  Check,
} from 'lucide-react';

import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AddFacultyModal } from './AddFacultyModal';
import { useToast } from '../../context/ToastContext';

import { teacherService } from '../../services/teacherService';
import { emailNotificationService } from '../../services/emailNotificationService';
import type { TeacherAccessDelivery } from '../../services/teacherInvitationService';
import { TemporaryPasswordNotice } from '../../components/teachers/TemporaryPasswordNotice';

const TEACHER_PORTAL_URL =
  ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_TEACHER_PORTAL_URL) ||
  'http://localhost:5176';
import { Teacher } from '../../types';

export const TeacherProfileDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { teacherId } = useParams<{ teacherId: string }>();
  const { success, error: toastError } = useToast();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const location = useLocation();
  // Set when a temporary password could not be emailed (after create or resend).
  const [undeliveredAccess, setUndeliveredAccess] = useState<TeacherAccessDelivery | null>(() => {
    const access = (location.state as { access?: TeacherAccessDelivery } | null)?.access;
    return access && !access.emailSent && access.temporaryPassword ? access : null;
  });
  useEffect(() => {
    if (undeliveredAccess) setIsEmailModalOpen(true);
    // Only when arriving from the create form with an undelivered password.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleResendEmail = async () => {
    if (!teacher) return;
    const targetEmail = teacher.email || teacher.loginEmail || '';
    if (!targetEmail) return;

    setIsResending(true);
    try {
      const access = await emailNotificationService.sendFacultyWelcomeEmail({ email: targetEmail });
      if (access.emailSent) {
        setUndeliveredAccess(null);
        success('Temporary Password Sent', `A new temporary password was emailed to ${targetEmail}.`);
      } else {
        setUndeliveredAccess(access);
        setIsEmailModalOpen(true);
        toastError(
          'Email Not Sent',
          'A new temporary password was set, but it could not be emailed. Share it from the dialog.'
        );
      }
    } catch (error) {
      toastError(
        'Email Error',
        error instanceof Error ? error.message : 'Could not reset the temporary password.'
      );
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (!teacherId) return;

    const load = () => {
      const foundTeacher = teacherService.getTeacherById(teacherId);
      if (foundTeacher) {
        setTeacher(foundTeacher);
      }
    };

    load();
    teacherService.fetchTeachers().then(load);

    const unsub = teacherService.onChange(load);
    window.addEventListener('dudex_teachers_changed', load);

    return () => {
      unsub();
      window.removeEventListener('dudex_teachers_changed', load);
    };
  }, [teacherId]);

  const handlePhotoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!teacher || !event.target.files?.[0]) return;

    const file = event.target.files[0];

    const reader = new FileReader();

    reader.onload = async () => {
      const avatar = reader.result as string;

      try {
        const updatedTeacher = await teacherService.updateTeacherRecord(teacher.id, {
          avatar,
        });
        if (updatedTeacher) setTeacher(updatedTeacher);
      } catch (error) {
        toastError(
          'Profile update failed',
          error instanceof Error ? error.message : 'Could not save the teacher photo.'
        );
      }
    };

    reader.readAsDataURL(file);
  };

  if (!teacher) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm text-[#A89A91]">
          Teacher profile not found.
        </p>

        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/teachers/profiles')}
          >
            Back to Teacher Profiles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <PageHeader
        title="Teacher Profile"
        description="View and manage your faculty profile details, photo, and contact information."
        breadcrumbs={[
          {
            label: 'Teacher Management',
            path: '/admin/teachers/profiles',
          },
          {
            label: 'Teacher Profiles',
            path: '/admin/teachers/profiles',
          },
          {
            label: teacher.fullName,
          },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Faculty
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit2 className="w-4 h-4" />}
              onClick={() =>
                navigate(`/admin/teachers/${teacher.id}/edit`)
              }
            >
              Edit Profile
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Power className="w-4 h-4" />}
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              {teacher.status === 'suspended' ? 'Reactivate Profile' : 'Deactivate Profile'}
            </Button>
          </div>
        }
      />

      {/* Main Profile Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* LEFT PROFILE CARD */}
        <Card className="lg:col-span-4 p-6">

          <div className="flex flex-col items-center text-center">

            {/* Profile Image */}
            <div className="relative">

              <Avatar
                src={teacher.avatar}
                name={teacher.fullName}
                size="xl"
                className="!w-24 !h-24 !text-2xl"
              />

              {/* Camera Button */}
              <label
                htmlFor="teacher-profile-photo"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#171311] border border-[#3A2922] flex items-center justify-center cursor-pointer hover:bg-[#2A1710] transition-colors"
              >
                <Camera className="w-4 h-4 text-[#F5F0EA]" />

                <input
                  id="teacher-profile-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            </div>

            {/* Name */}
            <h2 className="mt-5 text-xl font-bold text-[#F5F0EA]">
              {teacher.fullName}
            </h2>

            {/* Designation */}
            <p className="mt-1 text-sm text-[#A89A91]">
              {teacher.designation}
            </p>

            {/* Status */}
            <div className="mt-3">
              <StatusBadge
                status={teacher.status}
                size="sm"
              />
            </div>
          </div>

          {/* Left Information */}
          <div className="mt-6 pt-5 border-t border-[#3A2922] space-y-4">

            {/* Faculty ID */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2A1710] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#946246]" />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#A89A91]">
                  Faculty ID
                </p>

                <p className="text-sm font-semibold text-[#F5F0EA]">
                  {teacher.teacherId}
                </p>
              </div>
            </div>

            {/* Department */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2A1710] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-[#946246]" />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#A89A91]">
                  Department
                </p>

                <p className="text-sm font-semibold text-[#F5F0EA]">
                  {teacher.department}
                </p>
              </div>
            </div>

            {/* Portal Credentials Action */}
            <div className="pt-2 border-t border-[#3A2922]">
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-[#241510] hover:bg-[#2F1C15] border border-[#5A321F]/60 text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Key className="w-4 h-4 text-[#F59E0B]" />
                  <div>
                    <p className="text-xs font-semibold text-[#F5F0EA] group-hover:text-[#F59E0B] transition-colors">
                      Faculty Credentials & Email
                    </p>
                    <p className="text-[11px] text-[#A89A91]">
                      View welcome mail & portal access
                    </p>
                  </div>
                </div>
                <Send className="w-3.5 h-3.5 text-[#A89A91] group-hover:text-[#F59E0B] transition-colors" />
              </button>
            </div>
          </div>
        </Card>

        {/* RIGHT PERSONAL INFORMATION */}
        <Card className="lg:col-span-8 p-6">

          {/* Section Header */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#3A2922]">

            <div>
              <h2 className="text-lg font-bold text-[#F5F0EA]">
                Personal Information
              </h2>

              <p className="text-xs text-[#A89A91] mt-1">
                Official teacher details and verified contact information
              </p>
            </div>

            <button
              onClick={() =>
                navigate(`/admin/teachers/${teacher.id}/edit`)
              }
              className="flex items-center gap-1.5 text-xs font-semibold text-[#946246] hover:text-[#F1E5D8] transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Details
            </button>
          </div>

          {/* Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7 pt-6">

            {/* Full Name */}
            <ProfileField
              icon={<User className="w-4 h-4" />}
              label="Full Name"
              value={teacher.fullName}
            />

            {/* Faculty ID */}
            <ProfileField
              icon={<ShieldCheck className="w-4 h-4" />}
              label="Faculty ID"
              value={teacher.teacherId}
            />

            {/* Email */}
            <ProfileField
              icon={<Mail className="w-4 h-4" />}
              label="Email Address"
              value={teacher.email}
            />

            {/* Phone */}
            <ProfileField
              icon={<Phone className="w-4 h-4" />}
              label="Phone Number"
              value={teacher.phone}
            />

            {/* Department */}
            <ProfileField
              icon={<Building2 className="w-4 h-4" />}
              label="Department"
              value={teacher.department}
            />

            {/* Designation */}
            <ProfileField
              icon={<BriefcaseBusiness className="w-4 h-4" />}
              label="Designation"
              value={teacher.designation}
            />

            {/* Qualification */}
            <div className="md:col-span-2">
              <ProfileField
                icon={<GraduationCap className="w-4 h-4" />}
                label="Qualification & Degree"
                value={teacher.qualification}
              />
            </div>

          </div>
        </Card>
      </div>

      {/* Bottom Back Button */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/admin/teachers/profiles')}
        >
          Back to Teacher Profiles
        </Button>
      </div>

      {/* Add Faculty Modal */}
      <AddFacultyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newTeacher) => {
          navigate(`/admin/teachers/profile/${newTeacher.id}`);
        }}
      />

      {/* Deactivation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={async () => {
          try {
            // Suspended profiles are reactivated; any other status is suspended.
            const nextStatus = teacher.status === 'suspended' ? 'active' : 'suspended';
            const updated = await teacherService.setTeacherStatus(teacher.id, nextStatus);
            if (!updated) throw new Error('The teacher record was not found.');
            success(
              nextStatus === 'active' ? 'Faculty Member Reactivated' : 'Faculty Member Suspended',
              `${updated.fullName} is now ${nextStatus}.`
            );
            setIsDeleteDialogOpen(false);
            if (nextStatus === 'suspended') navigate('/admin/teachers/profiles');
          } catch (error) {
            toastError(
              'Could Not Update Faculty Status',
              error instanceof Error ? error.message : 'The status was not saved.'
            );
          }
        }}
        title={teacher.status === 'suspended' ? 'Reactivate Faculty Profile' : 'Deactivate Faculty Profile'}
        message={teacher.status === 'suspended'
          ? `Reactivate the faculty profile for ${teacher.fullName} (${teacher.teacherId})? They will be able to use the teacher portal again.`
          : `Deactivate the faculty profile for ${teacher.fullName} (${teacher.teacherId})? Its profile and linked records will be preserved.`}
        confirmText={teacher.status === 'suspended' ? 'Reactivate Faculty' : 'Deactivate Faculty'}
        variant="primary"
      />

      {/* Welcome Email & Credentials Modal (DudeX Theme) */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#140F0D] border border-[#5A321F] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3A2922] bg-[#1A120E]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2A1710] border border-[#5A321F] flex items-center justify-center text-[#F59E0B]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F5F0EA]">
                    Faculty Portal Access
                  </h3>
                  <p className="text-xs text-[#A89A91]">
                    Passwords are set through a secure Supabase Auth email.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#2A1710] text-[#A89A91] hover:text-[#F5F0EA] flex items-center justify-center border border-[#3A2922]"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Branded Preview */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Credentials Box */}
              <div className="p-4 rounded-xl bg-[#1C120C] border border-[#5A321F]/80">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#3A2922]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                    Teacher Account Details
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Verified account
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Faculty ID */}
                  <div className="p-3 rounded-lg bg-[#140F0D] border border-[#3A2922] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase text-[#A89A91] font-medium">Faculty ID</p>
                      <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{teacher.teacherId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(teacher.teacherId, 'id')}
                      className="p-1.5 rounded bg-[#2A1710] text-[#A89A91] hover:text-white"
                      title="Copy Faculty ID"
                    >
                      {copiedKey === 'id' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Login Email */}
                  <div className="p-3 rounded-lg bg-[#140F0D] border border-[#3A2922] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase text-[#A89A91] font-medium">Login Email</p>
                      <p className="text-xs font-semibold text-[#F5F0EA] font-mono mt-0.5 truncate max-w-[170px]">
                        {teacher.email || teacher.loginEmail || 'Not set'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(teacher.email || teacher.loginEmail || '', 'email')}
                      className="p-1.5 rounded bg-[#2A1710] text-[#A89A91] hover:text-white"
                      title="Copy Email"
                    >
                      {copiedKey === 'email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password setup */}
                  <div className="p-3 rounded-lg bg-[#140F0D] border border-[#3A2922] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase text-[#A89A91] font-medium">Password</p>
                      <p className="text-sm font-bold text-[#F59E0B] mt-0.5">
                        Set securely by the faculty member
                      </p>
                    </div>
                  </div>

                  {/* Portal URL */}
                  <div className="p-3 rounded-lg bg-[#140F0D] border border-[#3A2922] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase text-[#A89A91] font-medium">Teacher Portal URL</p>
                      <p className="text-xs font-medium text-[#F5F0EA] font-mono mt-0.5">{TEACHER_PORTAL_URL}</p>
                    </div>
                    <a
                      href={TEACHER_PORTAL_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded bg-[#2A1710] text-[#A89A91] hover:text-white"
                      title="Open Portal"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              {undeliveredAccess && (
                <TemporaryPasswordNotice
                  access={undeliveredAccess}
                  onDismiss={() => setUndeliveredAccess(null)}
                />
              )}

              {/* Email Content Preview */}
              <div className="p-4 rounded-xl bg-[#17110E] border border-[#3A2922] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#A89A91]">
                  <span>Subject: <strong className="text-[#F5F0EA]">Your Dudex Smart Academy teacher account</strong></span>
                  <span className="text-[11px] text-[#C97809]">DudeX Academy Branded</span>
                </div>
                <div className="p-4 rounded-lg bg-[#0F0B09] border border-[#2A1710] text-xs font-mono text-[#D4C3B3] leading-relaxed whitespace-pre-wrap">
{`Dear ${teacher.fullName},

Welcome to DudeX Academy! Your faculty profile has been created in the DudeX Portal.

Your Account Details:
------------------------------------------
• Faculty Name: ${teacher.fullName}
• Faculty ID: ${teacher.teacherId}
• Department: ${teacher.department}
• Designation: ${teacher.designation}
• Login Email: ${teacher.email || teacher.loginEmail}
• Teacher Portal: ${TEACHER_PORTAL_URL}
------------------------------------------

Your temporary password is included in the email. You will be asked to choose your own permanent password after signing in.`}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#3A2922] bg-[#1A120E]">
              <p className="text-xs text-[#A89A91]">
                Resending sets a new temporary password and emails it to <span className="text-[#F5F0EA] font-mono">{teacher.email || teacher.loginEmail}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmailModalOpen(false)}
                >
                  Close
                </Button>

                {/* Direct 1-Click Send via Gmail web */}
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(teacher.email || teacher.loginEmail || '')}&su=${encodeURIComponent(`Welcome to DudeX Portal – Your Faculty Account Credentials (${teacher.teacherId})`)}&body=${encodeURIComponent(
`Dear ${teacher.fullName},

Your DudeX Teacher Portal account is ready.
Faculty ID: ${teacher.teacherId}
Department: ${teacher.department}
Login email: ${teacher.email || teacher.loginEmail}
Portal: ${TEACHER_PORTAL_URL}

Your temporary password is sent in a separate email. You will be asked to choose a permanent password after signing in.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#EA4335] to-[#D93025] hover:opacity-90 transition-opacity border border-red-500/30 shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Open in Gmail
                </a>

                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Send className="w-4 h-4" />}
                  isLoading={isResending}
                  onClick={handleResendEmail}
                >
                  Resend Temporary Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


/* -------------------------------------------------------------------------- */
/* Reusable profile field                                                     */
/* -------------------------------------------------------------------------- */

interface ProfileFieldProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
}

const ProfileField: React.FC<ProfileFieldProps> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="flex items-start gap-3">

      <div className="w-9 h-9 rounded-lg bg-[#2A1710] flex items-center justify-center shrink-0">
        <span className="text-[#946246]">
          {icon}
        </span>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-[#A89A91]">
          {label}
        </p>

        <p className="text-sm font-semibold text-[#F5F0EA] mt-0.5 break-words">
          {value || 'Not provided'}
        </p>
      </div>

    </div>
  );
};
