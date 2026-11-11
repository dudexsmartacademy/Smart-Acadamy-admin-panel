import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  BriefcaseBusiness,
  ShieldCheck,
  Save,
  ArrowLeft,
  Camera,
  Sparkles,
} from 'lucide-react';

import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Card } from '../../components/common/Card';
import { useToast } from '../../context/ToastContext';
import { teacherService } from '../../services/teacherService';
import { Teacher } from '../../types';
import { DEPARTMENTS, DESIGNATIONS } from '../../constants/storageKeys';

export const TeacherFormPage: React.FC = () => {
  const { teacherId } = useParams<{ teacherId?: string }>();
  const isEditing = Boolean(teacherId);
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // ============================================================
  // FORM STATE (Streamlined to match Teacher Profile content)
  // ============================================================
  const [formData, setFormData] = useState({
    fullName: '',
    facultyId: '',
    avatar: '',
    email: '',
    phone: '',
    department: DEPARTMENTS[0] || 'Computer Science & Engineering',
    designation: DESIGNATIONS[2] || 'Faculty / Assistant Professor',
    qualification: '',
  });

  const [existingTeacher, setExistingTeacher] = useState<Teacher | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // ============================================================
  // LOAD EXISTING TEACHER / AUTO-GENERATE ID
  // ============================================================
  useEffect(() => {
    if (isEditing && teacherId) {
      const existing = teacherService.getTeacherById(teacherId);

      if (existing) {
        setExistingTeacher(existing);
        setFormData({
          fullName: existing.fullName,
          facultyId: existing.teacherId,
          avatar: existing.avatar || '',
          email: existing.email,
          phone: existing.phone || '',
          department: existing.department || DEPARTMENTS[0],
          designation: existing.designation || DESIGNATIONS[0],
          qualification: existing.qualification || '',
        });
      } else {
        toastError('Record Not Found', 'Could not locate teacher record.');
        navigate('/admin/teachers/profiles');
      }
    } else {
      // Auto-generate Faculty ID for new registration
      setFormData((prev) => ({
        ...prev,
        facultyId: teacherService.generateNextTeacherId(),
      }));
    }
  }, [isEditing, teacherId, navigate]);

  // ============================================================
  // PROFILE PHOTO HANDLERS
  // ============================================================
  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toastError('File Too Large', 'Please upload a photo smaller than 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        avatar: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProfilePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      avatar: '',
    }));
    if (profilePhotoInputRef.current) {
      profilePhotoInputRef.current.value = '';
    }
  };

  // ============================================================
  // FORM VALIDATION
  // ============================================================
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.designation.trim()) {
      newErrors.designation = 'Designation is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================
  // SUBMIT HANDLER
  // ============================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toastError('Validation Failed', 'Please fix all highlighted errors before submitting.');
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing && teacherId) {
        // Update teacher record preserving existing extra fields
        const updated = await teacherService.updateTeacherRecord(teacherId, {
          teacherId: formData.facultyId,
          fullName: formData.fullName.trim(),
          avatar: formData.avatar,
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          department: formData.department,
          designation: formData.designation,
          qualification: formData.qualification.trim(),
        });
        if (!updated) {
          throw new Error('The teacher record was not found. Reload and try again.');
        }

        success(
          'Faculty Record Updated',
          `Saved profile details for ${formData.fullName}.`
        );

        navigate(`/admin/teachers/profile/${updated.id}`);
      } else {
        // Create new faculty member
        const created = await teacherService.createTeacher({
          teacherId: formData.facultyId || teacherService.generateNextTeacherId(),
          fullName: formData.fullName.trim(),
          avatar: formData.avatar || undefined,
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          department: formData.department,
          designation: formData.designation,
          qualification: formData.qualification.trim(),
        });

        if (created.access.emailSent) {
          success(
            'Faculty Member Registered',
            `Added ${created.fullName} (${created.teacherId}) and emailed a temporary password to ${created.email}.`
          );
        } else {
          toastError(
            'Temporary Password Not Emailed',
            `Added ${created.fullName}, but the temporary password email could not be sent. Share it from the profile page.`
          );
        }

        // The profile page shows the temporary password once if it was not emailed.
        navigate(`/admin/teachers/profile/${created.id}`, { state: { access: created.access } });
      }
    } catch (err) {
      toastError(
        'Save Error',
        err instanceof Error ? err.message : 'An error occurred while saving teacher record.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const returnPath =
    isEditing && teacherId
      ? `/admin/teachers/profile/${existingTeacher?.id || teacherId}`
      : '/admin/teachers/profiles';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}
      <PageHeader
        title={
          isEditing
            ? `Edit Faculty Record: ${formData.fullName || 'Teacher'}`
            : 'Register New Faculty Member'
        }
        description={
          isEditing
            ? 'Modify faculty profile details, photo, department, and contact information.'
            : 'Enroll a new faculty instructor with department affiliations and profile details.'
        }
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
            label: isEditing ? 'Edit Faculty' : 'New Faculty',
          },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(returnPath)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Profile
          </Button>
        }
      />

      {/* ======================================================
          FORM
      ====================================================== */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Card */}
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between border-b border-[#3A2922] pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#2A1710] p-2 text-[#F1E5D8]">
                <User className="h-5 w-5 text-[#946246]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F0EA]">
                  Personal & Academic Information
                </h3>
                <p className="text-xs text-[#A89A91]">
                  Official teacher details and verified contact info
                </p>
              </div>
            </div>

            {/* Auto ID indicator */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2A1710] text-[#F1E5D8] border border-[#5A321F]/60">
              <ShieldCheck className="w-3.5 h-3.5 text-[#946246]" />
              <span>{formData.facultyId || 'Auto ID'}</span>
            </div>
          </div>

          {/* Profile Picture Row */}
          <div className="mb-6 pb-6 border-b border-[#3A2922]/60">
            <label className="block text-xs font-medium text-[#A89A91] mb-3">
              Profile Picture
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative shrink-0">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[#5A321F] bg-[#2A1710]">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt={`${formData.fullName || 'Teacher'} profile`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <User className="h-10 w-10 text-[#A89A91]" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#18120F] bg-[#7A4930] text-white shadow-md transition hover:bg-[#946246]"
                  title="Upload profile picture"
                  aria-label="Upload profile picture"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-2 w-full text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#5A321F] bg-[#2A1710] px-3.5 py-2 text-xs font-semibold text-[#F1E5D8] transition hover:border-[#7A4930] hover:bg-[#3A2116]"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Edit Photo
                  </button>

                  {formData.avatar && (
                    <button
                      type="button"
                      onClick={handleRemoveProfilePhoto}
                      className="rounded-lg px-3 py-2 text-xs font-medium text-[#A89A91] transition hover:bg-[#2A1710] hover:text-rose-400"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-[#A89A91]">
                  JPG, PNG or WEBP • Maximum 5 MB
                </p>

                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleProfilePhotoChange}
                  className="hidden"
                />

                <div className="mt-1">
                  <Input
                    label="Profile Photo URL (Optional)"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.avatar.startsWith('data:image/') ? '' : formData.avatar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        avatar: e.target.value,
                      })
                    }
                    helperText="Optional: paste a direct image URL instead of uploading a photo"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields Grid: Only Teacher Profile Content */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {/* FULL NAME */}
            <Input
              label="Full Name"
              placeholder="e.g. Prof. Alex Morgan"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fullName: e.target.value,
                })
              }
              leftIcon={<User className="h-4 w-4 text-[#946246]" />}
              error={errors.fullName}
              required
            />

            {/* FACULTY ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#A89A91]">
                  Faculty ID {!isEditing && <span className="text-emerald-400 font-semibold">(Auto-generated)</span>}
                </label>
                {!isEditing && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/40">
                    <Sparkles className="w-2.5 h-2.5" /> Auto
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  placeholder="FAC099"
                  value={formData.facultyId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      facultyId: e.target.value,
                    })
                  }
                  leftIcon={<ShieldCheck className="h-4 w-4 text-[#946246]" />}
                  required
                />
              </div>
            </div>

            {/* EMAIL ADDRESS */}
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. faculty.google@dudex.edu"
              value={formData.email}
              disabled={isEditing}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  email: e.target.value,
                })
              }
              leftIcon={<Mail className="h-4 w-4 text-[#946246]" />}
              error={errors.email}
              required
            />
            {isEditing && (
              <p className="text-xs text-[#A89A91]">
                Account email changes require a verified Supabase Auth flow.
              </p>
            )}

            {/* PHONE NUMBER */}
            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  phone: e.target.value,
                })
              }
              leftIcon={<Phone className="h-4 w-4 text-[#946246]" />}
            />

            {/* DEPARTMENT */}
            <Select
              label="Department"
              value={formData.department}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  department: e.target.value,
                })
              }
              options={DEPARTMENTS.map((dept) => ({
                value: dept,
                label: dept,
              }))}
              error={errors.department}
              required
            />

            {/* DESIGNATION */}
            <Select
              label="Designation"
              value={formData.designation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  designation: e.target.value,
                })
              }
              options={DESIGNATIONS.map((desig) => ({
                value: desig,
                label: desig,
              }))}
              error={errors.designation}
              required
            />

            {/* QUALIFICATION & DEGREE */}
            <div className="sm:col-span-2">
              <Input
                label="Qualification & Degree"
                placeholder="e.g. M.Tech in Computer Science, Ph.D. in AI & Robotics"
                value={formData.qualification}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    qualification: e.target.value,
                  })
                }
                leftIcon={<GraduationCap className="h-4 w-4 text-[#946246]" />}
              />
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-[#3A2922] pt-4">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => navigate(returnPath)}
            disabled={isLoading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            leftIcon={<Save className="h-4 w-4" />}
          >
            {isEditing ? 'Update Faculty Member' : 'Save Faculty Member'}
          </Button>
        </div>
      </form>
    </div>
  );
};
