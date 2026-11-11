import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Save,
  User,
  GraduationCap,
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import { academicService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { Student } from '../../types';

export const StudentProfileDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const collegesList = academicService.getAllColleges();
  const degreesList = academicService.getDegreesForCollege(student?.collegeName);
  const specsList = academicService.getSpecializationsForCollege(student?.collegeName);
  const batchesList = academicService.getBatchesForCollege(student?.collegeName);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    whatsappNumber: '',
    alternatePhone: '',
    address: '',
    githubUrl: '',
    linkedinUrl: '',
    collegeName: '',
    collegeMailId: '',
    registerNumber: '',
    degree: 'B.Tech',
    specialization: 'CSE',
    batch: 'Batch 1',
    role: 'AI Placement / Software Engineer',
  });

  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingCollege, setIsEditingCollege] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load student data
  useEffect(() => {
    const load = () => {
      let s: Student | undefined;
      if (studentId) {
        s =
          studentService.getStudentById(studentId) ||
          studentService
            .getStudents()
            .find((item) => item.id === studentId || item.studentId === studentId);
      }

      if (!s && !studentId) {
        s = studentService.getStudents()[0];
      }

      if (s) {
        setStudent(s);
        setFormData({
          fullName: s.fullName || '',
          email: s.email || '',
          whatsappNumber: s.whatsappNumber || s.phone || '',
          alternatePhone: s.alternatePhone || '',
          address: s.address || '',
          githubUrl: s.githubUrl || '',
          linkedinUrl: s.linkedinUrl || '',
          collegeName: s.collegeName || '',
          collegeMailId: s.collegeMailId || s.accountEmail || s.email || '',
          registerNumber: s.registerNumber || s.studentId || '',
          degree: s.degree || 'B.Tech',
          specialization:
            s.specialization
              ? s.specialization.split('-')[0].replace(/Batch\s*\d+/i, '').trim()
              : s.courseName || s.department || 'CSE',
          batch: s.batch || s.batchName || 'Batch 1',
          role: 'Student',
        });
      }
    };

    load();
    studentService.fetchStudents().then(load);

    window.addEventListener('dudex_students_changed', load);
    return () => {
      window.removeEventListener('dudex_students_changed', load);
    };
  }, [studentId]);

  // Handle Save
  const handleSaveAll = () => {
    if (!student) return;
    setIsSaving(true);

    const updated = studentService.updateStudent(student.id, {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.whatsappNumber,
      whatsappNumber: formData.whatsappNumber,
      alternatePhone: formData.alternatePhone,
      address: formData.address,
      githubUrl: formData.githubUrl,
      linkedinUrl: formData.linkedinUrl,
      collegeName: formData.collegeName,
      collegeMailId: formData.collegeMailId,
      registerNumber: formData.registerNumber,
      degree: formData.degree,
      specialization: formData.specialization,
      batch: formData.batch,
      batchName: formData.batch,
    });

    setTimeout(() => {
      setIsSaving(false);
      setIsEditingPersonal(false);
      setIsEditingCollege(false);
      if (updated) {
        setStudent(updated);
      }
      showToast('Student academic information updated successfully', 'success');
    }, 300);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      const updated = studentService.updateStudent(student.id, {
        avatar: result,
        profileImage: result,
      });
      if (updated) {
        setStudent(updated);
        showToast('Profile photo updated successfully', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Get Initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'ST';
  };

  if (!student) {
    return (
      <div className="py-20 text-center text-[#A89A91]">
        Loading student profile...
      </div>
    );
  }

  const initials = getInitials(formData.fullName);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fadeIn font-sans">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/students/list')}
          className="flex items-center gap-2 text-xs font-semibold text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Student Directory
        </button>

        {(isEditingPersonal || isEditingCollege) && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditingPersonal(false);
                setIsEditingCollege(false);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#171311] hover:bg-[#2A1E19] border border-[#3A2922] text-xs font-medium text-[#A89A91] hover:text-[#F5F0EA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#946246] hover:bg-[#7A4930] text-[#F5F0EA] text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* TOP PROFILE HEADER CARD (Cohort dropdown removed matching Screenshot 5) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Avatar & Student Name */}
          <div className="flex items-center gap-4">
            {student.avatar || student.profileImage ? (
              <img
                src={student.avatar || student.profileImage}
                alt={formData.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#5A321F] flex-shrink-0 shadow-inner"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#C8B8A6] text-[#2C1A12] font-bold text-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                {initials}
              </div>
            )}

            <div>
              <h1 className="text-xl font-bold text-[#F5F0EA] leading-tight">
                {formData.fullName}
              </h1>
              <p className="text-xs text-[#A89A91] mt-0.5 font-medium">
                {formData.role}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2.5 px-3 py-1 rounded-lg bg-[#140F0D] hover:bg-[#2A1E19] border border-[#3A2922] text-[11px] font-semibold text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer"
              >
                Change Profile Photo
              </button>
            </div>
          </div>

          {/* Right: Edit Button (Cohort dropdown removed) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isEditingPersonal && isEditingCollege) {
                  handleSaveAll();
                } else {
                  setIsEditingPersonal(true);
                  setIsEditingCollege(true);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#140F0D] hover:bg-[#2A1E19] border border-[#3A2922] text-xs font-semibold text-[#F5F0EA] transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-[#946246]" />
              {isEditingPersonal || isEditingCollege ? 'Done' : 'Edit'}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Personal & Contact Details */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#2A1E19]">
          <h2 className="text-sm font-bold text-[#F5F0EA]">
            Personal & Contact Details
          </h2>
          <button
            type="button"
            onClick={() => setIsEditingPersonal(!isEditingPersonal)}
            className="text-xs text-[#946246] hover:text-[#F1E5D8] font-medium flex items-center gap-1 cursor-pointer"
          >
            <Edit className="w-3 h-3" />
            {isEditingPersonal ? 'Close' : 'Edit'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              disabled={!isEditingPersonal}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingPersonal
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
          </div>

          {/* Personal Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              Personal Email
            </label>
            <input
              type="email"
              value={formData.email}
              disabled={!isEditingPersonal}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingPersonal
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
          </div>

          {/* WhatsApp Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              WhatsApp Number
            </label>
            <input
              type="text"
              value={formData.whatsappNumber}
              disabled={!isEditingPersonal}
              onChange={(e) =>
                setFormData({ ...formData, whatsappNumber: e.target.value })
              }
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingPersonal
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
          </div>

          {/* Alternate Phone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              Alternate Phone
            </label>
            <input
              type="text"
              value={formData.alternatePhone}
              disabled={!isEditingPersonal}
              onChange={(e) =>
                setFormData({ ...formData, alternatePhone: e.target.value })
              }
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingPersonal
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-medium text-[#A89A91]">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              disabled={!isEditingPersonal}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingPersonal
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
          </div>

          {/* GitHub URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              GitHub Profile Link
            </label>
            <input
              type="url"
              value={formData.githubUrl}
              disabled={!isEditingPersonal}
              onChange={(e) =>
                setFormData({ ...formData, githubUrl: e.target.value })
              }
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingPersonal
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
          </div>

          {/* LinkedIn URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              LinkedIn Profile Link
            </label>
            <input
              type="url"
              value={formData.linkedinUrl}
              disabled={!isEditingPersonal}
              onChange={(e) =>
                setFormData({ ...formData, linkedinUrl: e.target.value })
              }
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingPersonal
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: College Information (Screenshot 3: Course -> Degree, Section removed, Specialization with batch) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#2A1E19]">
          <h2 className="text-sm font-bold text-[#F5F0EA]">
            College Information
          </h2>
          <button
            type="button"
            onClick={() => setIsEditingCollege(!isEditingCollege)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#140F0D] hover:bg-[#2A1E19] border border-[#3A2922] text-xs font-semibold text-[#F5F0EA] transition-colors cursor-pointer"
          >
            <Edit className="w-3 h-3 text-[#946246]" />
            {isEditingCollege ? 'Done' : 'Edit'}
          </button>
        </div>

        <div className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              disabled={!isEditingCollege}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingCollege
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
          </div>

          {/* College Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              College Name
            </label>
            <input
              type="text"
              list="profile-colleges"
              value={formData.collegeName}
              disabled={!isEditingCollege}
              onChange={(e) =>
                setFormData({ ...formData, collegeName: e.target.value })
              }
              placeholder="Select or enter college"
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingCollege
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
            <datalist id="profile-colleges">
              {collegesList.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {/* College Mail ID (Locked) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              College Mail ID <span className="text-[10px] text-[#A89A91]">(Locked)</span>
            </label>
            <input
              type="email"
              value={formData.collegeMailId}
              disabled
              className="w-full h-10 px-3.5 rounded-xl border border-[#3A2922] bg-[#140F0D]/60 text-xs text-[#A89A91] cursor-not-allowed"
            />
          </div>

          {/* College Register Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              College Register Number
            </label>
            <input
              type="text"
              value={formData.registerNumber}
              disabled={!isEditingCollege}
              onChange={(e) =>
                setFormData({ ...formData, registerNumber: e.target.value })
              }
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingCollege
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
          </div>

          {/* Degree (Requirement 4: Course changed to Degree) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              Degree
            </label>
            <input
              type="text"
              list="profile-degrees"
              value={formData.degree}
              disabled={!isEditingCollege}
              onChange={(e) =>
                setFormData({ ...formData, degree: e.target.value })
              }
              placeholder="e.g. B.Tech / M.Tech"
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingCollege
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
            <datalist id="profile-degrees">
              {degreesList.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>

          {/* Specialization (Clean without batch) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              Specialization
            </label>
            <input
              type="text"
              list="profile-specs"
              value={formData.specialization}
              disabled={!isEditingCollege}
              onChange={(e) =>
                setFormData({ ...formData, specialization: e.target.value })
              }
              placeholder="e.g. AI & DS / CSE"
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingCollege
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
            <datalist id="profile-specs">
              {specsList.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          {/* Batch (Separated from Specialization) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A89A91]">
              Batch
            </label>
            <input
              type="text"
              list="profile-batches"
              value={formData.batch}
              disabled={!isEditingCollege}
              onChange={(e) =>
                setFormData({ ...formData, batch: e.target.value })
              }
              placeholder="e.g. Batch 1"
              className={`w-full h-10 px-3.5 rounded-xl border text-xs text-[#F5F0EA] transition-all ${
                isEditingCollege
                  ? 'bg-[#140F0D] border-[#946246]/60 focus:outline-none'
                  : 'bg-[#140F0D] border-[#3A2922] opacity-90'
              }`}
            />
            <datalist id="profile-batches">
              {batchesList.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
        </div>
      </div>
    </div>
  );
};
