import React, { useState } from 'react';
import { Check, Copy, KeyRound, MailWarning } from 'lucide-react';

import type { TeacherAccessDelivery } from '../../services/teacherInvitationService';

interface TemporaryPasswordNoticeProps {
  access: TeacherAccessDelivery;
  onDismiss?: () => void;
}

// Shown only when the temporary password email could not be sent: the admin
// sees the password once and passes it to the teacher another way.
export const TemporaryPasswordNotice: React.FC<TemporaryPasswordNoticeProps> = ({
  access,
  onDismiss,
}) => {
  const [copied, setCopied] = useState(false);
  if (access.emailSent || !access.temporaryPassword) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(access.temporaryPassword || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm text-amber-100"
    >
      <div className="flex items-start gap-3">
        <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-semibold text-amber-200">The temporary password email was not sent</p>
          <p className="text-amber-100/80">
            {access.emailError || 'The email could not be delivered.'} Share these sign-in details
            with the teacher securely. They will be asked to choose a permanent password after
            signing in. This password is shown only once.
          </p>
          <div className="grid gap-1 rounded-lg border border-amber-800/60 bg-black/30 p-3 font-mono text-xs sm:text-sm">
            <span>
              <span className="text-amber-300/70">Email: </span>
              {access.email}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-300/70" />
              <span className="break-all">{access.temporaryPassword}</span>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1 rounded-md border border-amber-700/60 px-2 py-0.5 font-sans text-xs text-amber-200 hover:bg-amber-900/40"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </span>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg bg-amber-700/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              I have shared it
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
