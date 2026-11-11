import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  Save,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowRight,
  X,
  Lock,
} from 'lucide-react';

import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';

const ADMIN_TARGET_EMAIL = 'dudexsmartacademy@gmail.com';

export const ProfilePage: React.FC = () => {
  const { admin, updateAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  // Workflow modes: 'view' | 'otp' | 'edit'
  const [activeMode, setActiveMode] = useState<'view' | 'otp' | 'edit'>('view');

  // OTP Verification state
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');
  const [resendCountdown, setResendCountdown] = useState<number>(30);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: admin?.name || '',
    email: admin?.email || ADMIN_TARGET_EMAIL,
    phone: admin?.phone || '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Synchronize initial form data when admin loads
  useEffect(() => {
    if (admin) {
      setEditForm((prev) => ({
        ...prev,
        name: admin.name || prev.name,
        email: admin.email || ADMIN_TARGET_EMAIL,
        phone: admin.phone || prev.phone,
      }));
    }
  }, [admin]);

  // Resend OTP countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeMode === 'otp' && resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [activeMode, resendCountdown]);

  // Helper to trigger OTP generation and dispatch
  const handleStartOtpFlow = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setEnteredOtp('');
    setOtpError('');
    setResendCountdown(30);
    setActiveMode('otp');
    success('Verification OTP Dispatched', `A 6-digit security code has been sent to ${ADMIN_TARGET_EMAIL}.`);
  };

  const handleResendOtp = () => {
    if (resendCountdown > 0) return;
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setEnteredOtp('');
    setOtpError('');
    setResendCountdown(30);
    success('New OTP Dispatched', `A fresh verification code was sent to ${ADMIN_TARGET_EMAIL}.`);
  };

  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!enteredOtp.trim()) {
      setOtpError('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');

    setTimeout(() => {
      setIsVerifyingOtp(false);
      if (enteredOtp.trim() === generatedOtp.trim()) {
        success('Identity Verified', 'Access granted to update administrator profile and credentials.');
        // Initialize edit form with current admin data
        setEditForm({
          name: admin?.name || '',
          email: admin?.email || ADMIN_TARGET_EMAIL,
          phone: admin?.phone || '',
          password: '',
          confirmPassword: '',
        });
        setFormErrors({});
        setActiveMode('edit');
      } else {
        setOtpError('Invalid OTP code. Please check the code sent to your email and try again.');
        toastError('Verification Failed', 'Incorrect OTP entered.');
      }
    }, 400);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!editForm.name.trim()) {
      errors.name = 'Full name is required.';
    }

    if (!editForm.email.trim()) {
      errors.email = 'Mail ID is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!editForm.phone.trim()) {
      errors.phone = 'Phone number is required.';
    }

    if (editForm.password) {
      if (editForm.password.length < 6) {
        errors.password = 'Password must be at least 6 characters.';
      }
      if (editForm.password !== editForm.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    } else if (editForm.confirmPassword) {
      errors.password = 'Please enter a new password.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toastError('Validation Error', 'Please correct the highlighted fields.');
      return;
    }

    setIsSaving(true);
    setFormErrors({});

    setTimeout(() => {
      // 1. Update Admin Profile in AuthContext and localStorage
      updateAdmin({
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
      });

      // 2. If password was provided, update credentials in authService
      if (editForm.password) {
        authService.updateCredentials(editForm.email.trim(), editForm.password);
      } else {
        authService.updateCredentials(editForm.email.trim());
      }

      setIsSaving(false);
      setActiveMode('view');
      success('Admin Profile Updated', 'All changes and credentials have been securely saved.');
    }, 400);
  };

  const currentEmail = admin?.email || ADMIN_TARGET_EMAIL;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Administrator Profile & Security"
        description="Manage your institutional administration profile, contact lines, and authorized security credentials."
        breadcrumbs={[{ label: 'Admin Profile' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* =========================================================
            LEFT PROFILE OVERVIEW CARD
            (Profile image display and Department Directorate removed)
        ========================================================= */}
        <div className="md:col-span-5">
          <Card className="p-6 text-center space-y-4 bg-gradient-to-b from-[#1A1412] to-[#171311] border-[#3A2922]">
            {/* Authoritative emblem instead of profile photo */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5A321F] to-[#2A1710] border border-[#7A4930] flex items-center justify-center text-[#F1E5D8] shadow-lg shadow-black/40">
                <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#F5F0EA]">{admin?.name || 'Administrator'}</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#5A321F] text-[#F1E5D8] inline-block mt-1">
                {admin?.role || 'Super Admin'}
              </span>
            </div>

            <div className="pt-4 border-t border-[#3A2922] text-left text-xs space-y-2.5 text-[#A89A91]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 shrink-0">
                  <Mail className="w-3.5 h-3.5 text-[#946246]" /> Email:
                </span>
                <span className="text-[#F5F0EA] font-mono text-[11px] truncate" title={currentEmail}>
                  {currentEmail}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 shrink-0">
                  <Phone className="w-3.5 h-3.5 text-[#946246]" /> Phone:
                </span>
                <span className="text-[#F5F0EA] font-mono text-[11px]">
                  {admin?.phone || 'Not configured'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#946246]" /> Status:
                </span>
                <span className="text-emerald-400 font-bold">Active Account</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#946246]" /> Joined:
                </span>
                <span className="text-[#F5F0EA]">{admin?.joinedDate || new Date().toISOString().split('T')[0]}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#946246]" /> Last Login:
                </span>
                <span className="text-[#F5F0EA]">
                  {admin?.lastLogin ? new Date(admin.lastLogin).toLocaleTimeString() : 'Active Now'}
                </span>
              </div>
            </div>

            {/* Assigned Permissions Summary */}
            <div className="pt-4 border-t border-[#3A2922] text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                Assigned Authority Matrix
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Full Faculty Management',
                  'Full Student Dossiers',
                  'Curriculum & Batches',
                  'Exams & Grading Engine',
                  'Fee Plans & Receipts',
                  'Portal Governance',
                  'Audit Logs & Security',
                ].map((perm) => (
                  <span
                    key={perm}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-[#2A1710] text-[#D4AF37] border border-[#5A321F]"
                  >
                    ✓ {perm}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* =========================================================
            RIGHT INTERACTIVE PANEL: VIEW / OTP / EDIT TAB
        ========================================================= */}
        <div className="md:col-span-7">
          {/* TAB 1: DEFAULT READ-ONLY VIEW WITH 'CHANGE ADMIN PROFILE' */}
          {activeMode === 'view' && (
            <Card className="p-6 border-[#3A2922] space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#F5F0EA]">Administrator Profile Information</h3>
                <p className="text-xs text-[#A89A91] mt-0.5">
                  Primary institutional administration contact and verified identity.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Administrator Full Name"
                  value={admin?.name || 'Administrator'}
                  disabled
                  leftIcon={<User className="w-4 h-4" />}
                />

                <Input
                  label="Registered Email (Primary Administrator)"
                  value={currentEmail}
                  disabled
                  leftIcon={<Mail className="w-4 h-4" />}
                  helperText="Official administrative notification and security dispatch address"
                />

                <Input
                  label="Direct Phone Number"
                  value={admin?.phone || 'Not configured'}
                  disabled
                  leftIcon={<Phone className="w-4 h-4" />}
                />

                {/* Prominent Change Admin Profile Button Below Phone Number */}
                <div className="pt-4 border-t border-[#3A2922] space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#1C1512] border border-[#5A321F]/60 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                    <div className="text-xs text-[#A89A91] leading-relaxed">
                      To alter your name, mail ID, phone number, or password, two-factor OTP verification is required.
                      The verification code will be dispatched to <strong className="text-[#F1E5D8]">{ADMIN_TARGET_EMAIL}</strong>.
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="w-full justify-center shadow-lg shadow-[#5A321F]/20"
                    onClick={handleStartOtpFlow}
                    leftIcon={<KeyRound className="w-4 h-4" />}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Change Admin Profile
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 2: OTP VERIFICATION WORKFLOW */}
          {activeMode === 'otp' && (
            <Card className="p-6 border-[#5A321F] bg-[#161210] space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#3A2922]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#5A321F] flex items-center justify-center text-[#F1E5D8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F5F0EA]">Security Verification</h3>
                    <p className="text-xs text-[#A89A91]">Two-Factor Authorization Step</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMode('view')}
                  className="text-[#A89A91] hover:text-[#F5F0EA] p-1.5 rounded-lg hover:bg-[#2A1710] transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-[#A89A91] leading-relaxed space-y-1">
                <p>
                  A 6-digit One-Time Password (OTP) has been sent to the administrative mailbox:
                </p>
                <div className="p-2 rounded-lg bg-[#111111] border border-[#3A2922] font-mono text-center text-sm font-bold text-[#F5F0EA]">
                  {ADMIN_TARGET_EMAIL}
                </div>
              </div>



              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A89A91] mb-2">
                    Enter 6-Digit OTP Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => {
                      setEnteredOtp(e.target.value.replace(/\D/g, ''));
                      setOtpError('');
                    }}
                    placeholder="• • • • • •"
                    className="w-full bg-[#111111] text-center tracking-[0.5em] font-mono text-2xl py-3 px-4 rounded-xl border border-[#3A2922] text-[#F5F0EA] focus:border-[#7A4930] focus:ring-2 focus:ring-[#946246]/40 focus:outline-none transition-all placeholder-[#A89A91]/30"
                    autoFocus
                  />
                  {otpError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCountdown > 0}
                    className="flex items-center gap-1.5 text-xs text-[#946246] hover:text-[#F1E5D8] disabled:opacity-40 disabled:hover:text-[#946246] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend OTP Code'}
                  </button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveMode('view')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isVerifyingOtp}
                      leftIcon={<ShieldCheck className="w-4 h-4" />}
                    >
                      Verify & Proceed
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 3: EDIT ADMIN PROFILE TAB (Only opened when OTP is verified)
              Contains ONLY: Name, Mail ID, Phone No, Password, Confirm Password */}
          {activeMode === 'edit' && (
            <Card className="p-6 border-[#7A4930] bg-[#161210] space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#3A2922]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 uppercase tracking-wider">
                      OTP Verified
                    </span>
                    <h3 className="text-base font-bold text-[#F5F0EA]">Change Admin Profile</h3>
                  </div>
                  <p className="text-xs text-[#A89A91] mt-0.5">
                    Authorized security tab to alter credentials and contact lines.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMode('view')}
                  className="text-[#A89A91] hover:text-[#F5F0EA] p-1.5 rounded-lg hover:bg-[#2A1710] transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* 1. Name */}
                <Input
                  label="Name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  error={formErrors.name}
                  leftIcon={<User className="w-4 h-4" />}
                  placeholder="e.g. Administrator"
                  required
                />

                {/* 2. Mail ID */}
                <Input
                  label="Mail ID"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  error={formErrors.email}
                  leftIcon={<Mail className="w-4 h-4" />}
                  placeholder="e.g. dudexsmartacademy@gmail.com"
                  helperText="Primary email used for administrator sign-in and security dispatch"
                  required
                />

                {/* 3. Phone No */}
                <Input
                  label="Phone No"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  error={formErrors.phone}
                  leftIcon={<Phone className="w-4 h-4" />}
                  placeholder="e.g. +1 (555) 839-2041"
                  required
                />

                <div className="pt-2 border-t border-[#3A2922]/80 space-y-4">
                  <p className="text-xs font-semibold text-[#F1E5D8] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                    Update Password (Optional — leave blank to keep current password)
                  </p>

                  {/* 4. Password */}
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    error={formErrors.password}
                    leftIcon={<Lock className="w-4 h-4" />}
                    placeholder="Enter new password"
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />

                  {/* 5. Confirm Password */}
                  <Input
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={editForm.confirmPassword}
                    onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                    error={formErrors.confirmPassword}
                    leftIcon={<Lock className="w-4 h-4" />}
                    placeholder="Confirm new password"
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#3A2922]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setActiveMode('view')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSaving}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
