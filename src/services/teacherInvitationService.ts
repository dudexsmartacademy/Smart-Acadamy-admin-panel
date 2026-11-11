import { supabaseAny as supabase } from '../lib/supabase';

export interface TeacherInvitationPayload {
  email: string;
  full_name: string;
  faculty_id: string;
  department_id: string;
  designation: string;
  phone?: string | null;
  qualification?: string | null;
  avatar_url?: string | null;
}

interface TeacherInvitationResponse {
  ok: boolean;
  mode?: string;
  email_sent?: boolean;
  email_error?: string;
  /** Only present when the temporary password email could not be sent. */
  temporary_password?: string;
  teacher_profile_id?: string;
  user_id?: string;
  provisioned?: boolean;
  error?: string;
}

async function invokeTeacherInvitation(
  body: Record<string, string | null | undefined>,
): Promise<TeacherInvitationResponse> {
  const { data, error } = await supabase.functions.invoke<TeacherInvitationResponse>(
    'invite-teacher',
    { body },
  );

  if (error) {
    // FunctionsFetchError: the browser never got a response — the function is
    // not deployed in this project, or it rejected this page's origin (CORS).
    if ((error as { name?: string }).name === 'FunctionsFetchError') {
      throw new Error(
        `Could not reach the invite-teacher Edge Function from ${window.location.origin}. ` +
          'Deploy the latest supabase/functions/invite-teacher to this project and add this origin to its ALLOWED_ORIGINS secret.',
      );
    }
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      let serverMessage: string | undefined;
      try {
        const payload: unknown = await context.clone().json();
        if (
          typeof payload === 'object' &&
          payload !== null &&
          'error' in payload &&
          typeof payload.error === 'string'
        ) {
          serverMessage = payload.error;
        }
      } catch {
        serverMessage = undefined;
      }
      if (serverMessage) throw new Error(serverMessage);
    }
    throw new Error(`Teacher invitation request failed: ${error.message}`);
  }

  if (!data?.ok) {
    throw new Error(data?.error || 'Teacher invitation request did not succeed.');
  }
  return data;
}

/** How a teacher's temporary password reached them. */
export interface TeacherAccessDelivery {
  email: string;
  emailSent: boolean;
  emailError?: string;
  temporaryPassword?: string;
}

export function toAccessDelivery(email: string, response: TeacherInvitationResponse): TeacherAccessDelivery {
  return {
    email,
    emailSent: response.email_sent === true,
    emailError: response.email_error,
    temporaryPassword: response.temporary_password,
  };
}

export const teacherInvitationService = {
  inviteTeacher(payload: TeacherInvitationPayload): Promise<TeacherInvitationResponse> {
    return invokeTeacherInvitation({
      action: 'invite',
      ...payload,
    });
  },

  /** Sets a new temporary password and emails it to the teacher. */
  async resendSetupEmail(email: string): Promise<TeacherAccessDelivery> {
    const cleanEmail = email.trim().toLowerCase();
    const response = await invokeTeacherInvitation({
      action: 'resend',
      email: cleanEmail,
    });
    return toAccessDelivery(cleanEmail, response);
  },
};
