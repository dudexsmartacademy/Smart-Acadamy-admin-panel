import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { GraduationCap, Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Checkbox } from '../../components/common/Checkbox';
export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const { login, isAuthenticated, admin, loading } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // ProtectedRoute passes the page that sent us here; go back to it after sign-in
  // (also on a reload, where the session check can briefly bounce through /login).
  const fromPath = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const returnTo = fromPath?.pathname?.startsWith('/admin')
    ? `${fromPath.pathname}${fromPath.search || ''}`
    : '/admin/students/list';

  // An administrator who is already signed in goes straight to the portal.
  useEffect(() => {
    if (!loading && isAuthenticated && admin?.role === 'Super Admin') {
      navigate(returnTo, { replace: true });
    }
  }, [loading, isAuthenticated, admin, navigate, returnTo]);

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errs.email = 'Administrator email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email format';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const res = await login(email, password, rememberMe);
      if (res.success) {
        success('Welcome Back, Administrator', 'Logged into DUDEx Smart Academy Control Center.');
        navigate(returnTo, { replace: true });
      } else {
        setErrors({ general: res.error || 'Invalid credentials' });
        toastError('Authentication Failed', res.error);
      }
    } catch (err) {
      setErrors({ general: 'An unexpected authentication error occurred.' });
      toastError('Login Error', 'Please verify your network connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4 sm:p-6 lg:p-10 text-[#F5F0EA]">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-[#3A2922] bg-[#171311] shadow-2xl overflow-hidden min-h-[620px]">
        {/* Left Branding Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#2A1710] via-[#1A110C] to-[#0B0B0B] p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#3A2922] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#5A321F]/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#7A4930]/15 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          {/* Logo & Platform Name */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#5A321F] border border-[#946246]/60 flex items-center justify-center text-[#F1E5D8] shadow-lg overflow-hidden p-1.5">
                <img src="/logo.png?v=20261031_0715" alt="DudeX Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#F5F0EA] tracking-wide font-sans">
                  DUDEx <span className="text-[#946246] font-normal">ACADEMY</span>
                </h1>
                <p className="text-[11px] font-semibold text-[#A89A91] tracking-widest uppercase">
                  Admin Command Portal
                </p>
              </div>
            </div>

            <div className="mt-12 space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#F1E5D8] leading-tight">
                Enterprise Educational Leadership & Operations
              </h2>
              <p className="text-xs sm:text-sm text-[#A89A91] leading-relaxed">
                Centralized management hub for faculty schedules, academic curriculum, department assignments, and institutional performance.
              </p>
            </div>
          </div>

          {/* Institutional Highlights */}
          <div className="relative z-10 mt-8 pt-8 border-t border-[#3A2922]/70 space-y-3 text-xs text-[#A89A91]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#946246]" />
              <span>Role-Based Secure Authorization</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#946246]" />
              <span>Biometric & Schedule Synchronization</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#946246]" />
              <span>Audit Logging & Real-time Operations</span>
            </div>
          </div>
        </div>

        {/* Right Login Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-[#171311]">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#F5F0EA] tracking-tight">
                Admin Sign In
              </h2>
              <p className="text-xs sm:text-sm text-[#A89A91] mt-1.5">
                Enter your authorized administration credentials to continue.
              </p>
            </div>

            {/* General Error Banner */}
            {errors.general && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Admin Email Address"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <div className="space-y-1">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#A89A91] hover:text-[#F5F0EA] p-1 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <Checkbox
                  label="Remember this device"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />

                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#946246] hover:text-[#F1E5D8] transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-4"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Dashboard
              </Button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};
