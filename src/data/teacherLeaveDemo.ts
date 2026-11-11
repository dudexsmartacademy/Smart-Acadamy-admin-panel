import { teacherService } from '../services/teacherService';
import { teacherLeaveService } from '../services/teacherLeaveService';

export interface TeacherLeaveDemo {
  teacherId: string;
  facultyName: string;
  department: string;
  casualLeaveRemaining: number;
  medicalLeaveRemaining: number;
  totalLeaveTaken: number;
  pendingRequests: number;
}

export const teacherLeaveDemo: Record<string, TeacherLeaveDemo> = {};

export function getTeacherLeaveDemo(teacherId: string): TeacherLeaveDemo {
  const teacher = teacherService.getTeacherById(teacherId);
  const resolvedFacultyId = teacher?.teacherId || teacherId;
  const requests = teacherLeaveService.getLeaveByTeacherId(teacherId);
  const approved = requests.filter((r) => r.status === 'approved');
  const pending = requests.filter((r) => r.status === 'pending');

  const clTaken = approved
    .filter((r) => r.leaveType === 'casual')
    .reduce((sum, r) => sum + (r.totalDays || 1), 0);
  const mlTaken = approved
    .filter((r) => r.leaveType === 'medical' || r.leaveType === 'sick')
    .reduce((sum, r) => sum + (r.totalDays || 1), 0);
  const totalTaken = clTaken + mlTaken;

  return {
    teacherId: resolvedFacultyId,
    facultyName: teacher?.fullName || 'Faculty Member',
    department: teacher?.department || 'Academic Department',
    casualLeaveRemaining: Math.max(0, 12 - clTaken),
    medicalLeaveRemaining: Math.max(0, 10 - mlTaken),
    totalLeaveTaken: totalTaken,
    pendingRequests: pending.length,
  };
}