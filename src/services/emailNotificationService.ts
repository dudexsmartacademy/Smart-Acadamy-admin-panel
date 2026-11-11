import { teacherInvitationService, type TeacherAccessDelivery } from './teacherInvitationService';

export interface FacultyWelcomeEmailPayload {
  email: string;
}

export const emailNotificationService = {
  async sendFacultyWelcomeEmail(
    payload: FacultyWelcomeEmailPayload,
  ): Promise<TeacherAccessDelivery> {
    return teacherInvitationService.resendSetupEmail(payload.email);
  },
};
