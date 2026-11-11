import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  User,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Image as ImageIcon,
  Send,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useToast } from '../../context/ToastContext';
import { teacherService } from '../../services/teacherService';
import { DESIGNATIONS } from '../../constants/storageKeys';
import { supabaseAny as supabase } from '../../lib/supabase';
import { Teacher } from '../../types';
import type { TeacherAccessDelivery } from '../../services/teacherInvitationService';
import { TemporaryPasswordNotice } from '../../components/teachers/TemporaryPasswordNotice';

interface AddFacultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newTeacher: Teacher) => void;
}

export const AddFacultyModal: React.FC<AddFacultyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // Departments come from the database so the invitation gets a real department id.
  const [departmentOptions, setDepartmentOptions] = useState<{ value: string; label: string; name: string }[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [designation, setDesignation] = useState(DESIGNATIONS[0] || 'Faculty / Assistant Professor');
  const [qualification, setQualification] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [undeliveredAccess, setUndeliveredAccess] = useState<TeacherAccessDelivery | null>(null);
  const [createdTeacher, setCreatedTeacher] = useState<Teacher | null>(null);

  const closeDialog = () => {
    const created = createdTeacher;
    setUndeliveredAccess(null);
    setCreatedTeacher(null);
    onClose();
    if (created) onSuccess?.(created);
  };

  // Generate a faculty ID when the modal opens.
  useEffect(() => {
    if (isOpen) {
      const generatedId = teacherService.generateNextTeacherId();
      setFacultyId(generatedId);
      setFullName('');
      setEmail('');
      setPhone('');
      setDepartmentId('');
      setDesignation(DESIGNATIONS[0] || 'Faculty / Assistant Professor');
      setQualification('');
      setAvatar('');
      setAvatarUrlInput('');
      setShowUrlInput(false);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      const [{ data: depts, error: deptError }, { data: colleges }] = await Promise.all([
        supabase.from('departments').select('id, name, code, college_id').order('name'),
        supabase.from('colleges').select('id, name'),
      ]);
      if (cancelled) return;
      if (deptError) {
        toastError('Could Not Load Departments', deptError.message);
        return;
      }
      const collegeNames = new Map((colleges || []).map((c: { id: string; name: string }) => [c.id, c.name]));
      const options = (depts || []).map((d: { id: string; name: string; college_id: string | null }) => ({
        value: d.id,
        name: d.name,
        label: d.college_id && collegeNames.get(d.college_id) ? `${d.name} — ${collegeNames.get(d.college_id)}` : d.name,
      }));
      setDepartmentOptions(options);
      setDepartmentId((current) => current || options[0]?.value || '');
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toastError('File Too Large', 'Please upload a photo smaller than 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (avatarUrlInput.trim()) {
      setAvatar(avatarUrlInput.trim());
      setShowUrlInput(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!departmentId) {
      newErrors.department = departmentOptions.length === 0
        ? 'No departments exist yet. Add them to a college under Academic Setup first.'
        : 'Department is required';
    }

    if (!designation) {
      newErrors.designation = 'Designation is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanTeacherId = facultyId || teacherService.generateNextTeacherId();
      const newTeacher = await teacherService.createTeacher({
        teacherId: cleanTeacherId,
        fullName: fullName.trim(),
        avatar: avatar || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        department: departmentOptions.find((option) => option.value === departmentId)?.name || '',
        departmentId,
        designation,
        qualification: qualification.trim(),
      });

      if (newTeacher.access.emailSent) {
        success(
          'Faculty Profile Created',
          `Registered ${newTeacher.fullName} (${newTeacher.teacherId}) and emailed a temporary password to ${newTeacher.email}.`
        );
        onClose();
        onSuccess?.(newTeacher);
      } else {
        // Keep the dialog open (onSuccess navigates away) until the admin has
        // passed the password on.
        toastError(
          'Temporary Password Not Emailed',
          `Registered ${newTeacher.fullName}, but the temporary password email could not be sent.`
        );
        setCreatedTeacher(newTeacher);
        setUndeliveredAccess(newTeacher.access);
      }
    } catch (err) {
      toastError(
        'Save Error',
        err instanceof Error ? err.message : 'Failed to add new faculty member.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeDialog}
      title="Add New Faculty Member"
      description="Creates the teacher's account and emails them a temporary password."
      maxWidth="2xl"
    >
      {undeliveredAccess ? (
        <TemporaryPasswordNotice access={undeliveredAccess} onDismiss={closeDialog} />
      ) : (
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Profile Image Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-[#140F0D] border border-[#3A2922]">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-[#2A1710] border-2 border-[#5A321F] flex items-center justify-center overflow-hidden">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Faculty Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <User className="w-9 h-9 text-[#A89A91]" />
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#7A4930] hover:bg-[#946246] border border-[#140F0D] flex items-center justify-center text-[#F1E5D8] shadow-md transition-colors"
              title="Upload photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <p className="text-xs font-semibold text-[#F5F0EA]">Profile Image</p>
              <p className="text-[11px] text-[#A89A91]">
                Upload JPG, PNG, or WEBP (max 5 MB) or paste a photo URL.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Camera className="w-3.5 h-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Photo
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<ImageIcon className="w-3.5 h-3.5" />}
                onClick={() => setShowUrlInput(!showUrlInput)}
              >
                Photo URL
              </Button>

              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            {showUrlInput && (
              <div className="flex gap-2 pt-1">
                <input
                  type="url"
                  placeholder="Paste direct image URL..."
                  value={avatarUrlInput}
                  onChange={(e) => setAvatarUrlInput(e.target.value)}
                  className="flex-1 rounded-lg border border-[#3A2922] bg-[#111111] px-3 py-1.5 text-xs text-[#F5F0EA] placeholder-[#A89A91]/50 focus:border-[#7A4930] focus:outline-none"
                />
                <Button type="button" variant="primary" size="sm" onClick={handleApplyUrl}>
                  Set
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Faculty ID (Auto-Generated) */}
          <div className="sm:col-span-1">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-[#A89A91]">
                Faculty ID <span className="text-emerald-400 font-semibold">(Auto-generated)</span>
              </label>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/40">
                <Sparkles className="w-2.5 h-2.5" /> Auto
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                className="w-full rounded-lg border border-[#3A2922] bg-[#140F0D] px-3 py-2 text-sm font-semibold text-[#F1E5D8] focus:border-[#7A4930] focus:outline-none"
                placeholder="FAC099"
              />
              <ShieldCheck className="w-4 h-4 text-[#946246] absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Full Name */}
          <div className="sm:col-span-1">
            <Input
              label="Full Name"
              placeholder="e.g. Prof. Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={errors.fullName}
              required
            />
          </div>

          {/* Email Address */}
          <div className="sm:col-span-1">
            <Input
              label="Email Address"
              type="email"
              placeholder="faculty.google@dudex.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-[#946246]" />}
              error={errors.email}
              required
            />
          </div>

          {/* Phone Number */}
          <div className="sm:col-span-1">
            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4 text-[#946246]" />}
            />
          </div>

          {/* Department */}
          <div className="sm:col-span-1">
            <Select
              label="Department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={departmentOptions.map(({ value, label }) => ({ value, label }))}
              error={errors.department}
              required
            />
          </div>

          {/* Designation */}
          <div className="sm:col-span-1">
            <Select
              label="Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              options={DESIGNATIONS.map((desig) => ({
                value: desig,
                label: desig,
              }))}
              error={errors.designation}
              required
            />
          </div>

          {/* Qualification & Degree */}
          <div className="sm:col-span-2">
            <Input
              label="Qualification & Degree"
              placeholder="e.g. M.Tech in Computer Science, Ph.D. in AI & Robotics"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              leftIcon={<GraduationCap className="w-4 h-4 text-[#946246]" />}
            />
          </div>

          {/* Secure account setup notice */}
          <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#1A120E] border border-amber-500/30 flex items-start gap-3 shadow-inner">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Send className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="space-y-1 text-xs text-[#A89A91] leading-relaxed">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F1E5D8]">Secure account setup</span>
              </div>
              <p>
                The teacher's account is created with a temporary password, which is emailed to them. They choose their own password the first time they sign in. The email goes to <span className="text-amber-300 font-mono">{email.trim() || 'the faculty email'}</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3A2922]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Add Faculty
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );
};
