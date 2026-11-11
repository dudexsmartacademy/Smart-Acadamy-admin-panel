import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export const ResetPasswordPage: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(`Could not update the password: ${updateError.message}`);
      return;
    }
    navigate('/admin/students/list', { replace: true });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Verifying reset link...</div>;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0B0B] px-4 text-[#F5F0EA]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-[#3A2922] bg-[#171311] p-7"
      >
        <div>
          <h1 className="text-xl font-bold">Set a new admin password</h1>
          <p className="mt-1 text-sm text-[#A89A91]">Choose a new password for your account.</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-950/40 p-3 text-sm text-rose-300">{error}</p>}
        <label className="block space-y-1 text-sm">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-[#3A2922] bg-[#0B0B0B] px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="w-full rounded-lg border border-[#3A2922] bg-[#0B0B0B] px-3 py-2"
          />
        </label>
        <Button type="submit" variant="primary" className="w-full" isLoading={saving}>
          Save password
        </Button>
      </form>
    </main>
  );
};
