import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, GraduationCap } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { info } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please provide a valid administration email');
      return;
    }

    setIsLoading(true);
    setError('');

    const res = await authService.requestPasswordReset(email);
    setIsLoading(false);
    if (res.success) {
      setIsSubmitted(true);
      info('Reset Email Sent', res.message);
    } else {
      setError(res.error || res.message || 'Failed to send reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4 sm:p-6 text-[#F5F0EA]">
      <div className="w-full max-w-md bg-[#171311] border border-[#3A2922] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#5A321F]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#5A321F] border border-[#946246]/60 flex items-center justify-center text-[#F1E5D8] overflow-hidden p-1">
            <img src="/logo.png?v=20261031_0715" alt="DudeX Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-[#F5F0EA] tracking-wide">
              DUDEx <span className="text-[#946246] font-normal">ACADEMY</span>
            </h1>
            <p className="text-[10px] text-[#A89A91] uppercase tracking-wider">Password Recovery</p>
          </div>
        </div>

        {!isSubmitted ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#F5F0EA]">Reset Password</h2>
              <p className="text-xs text-[#A89A91] mt-1.5 leading-relaxed">
                Enter your registered admin email address to receive password reset verification instructions.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Admin Email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                leftIcon={<Mail className="w-4 h-4 text-[#946246]" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<Send className="w-4 h-4" />}
              >
                Send Reset Instructions
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-4 space-y-4 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F5F0EA]">Check Your Email</h3>
              <p className="text-xs text-[#A89A91] mt-1 leading-relaxed">
                Password reset instructions were sent to{' '}
                <span className="text-[#F1E5D8] font-semibold">{email}</span>.
                Please check your inbox and follow the link to reset your password.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-[#3A2922] text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#946246] hover:text-[#F1E5D8] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Admin Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
