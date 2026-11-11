import { TeacherAssignment, AssignmentSubmission, AssignmentStatus } from '../types';
import { activityService } from './activityService';

let cachedAssignments: TeacherAssignment[] = [];
let cachedSubmissions: AssignmentSubmission[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_teacher_assignments_changed'));
  }
}

export const subscribeTeacherAssignments = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const teacherAssignmentService = {
  getAssignments(): TeacherAssignment[] {
    return cachedAssignments;
  },

  getAssignmentsByTeacherId(teacherId: string): TeacherAssignment[] {
    return cachedAssignments.filter((a) => a.teacherId === teacherId);
  },

  getAssignmentById(id: string): TeacherAssignment | undefined {
    return cachedAssignments.find((a) => a.id === id);
  },

  getSubmissions(assignmentId?: string): AssignmentSubmission[] {
    if (assignmentId) {
      return cachedSubmissions.filter((s) => s.assignmentId === assignmentId);
    }
    return cachedSubmissions;
  },

  createAssignment(data: Omit<TeacherAssignment, 'id' | 'submissionsCount' | 'gradedCount' | 'lateSubmissionsCount'>): TeacherAssignment {
    const newAssignment: TeacherAssignment = {
      ...data,
      id: crypto.randomUUID(),
      submissionsCount: 0,
      gradedCount: 0,
      lateSubmissionsCount: 0,
    };

    cachedAssignments = [newAssignment, ...cachedAssignments];
    notifyChange();

    activityService.log(
      'Assignment Created',
      'assignments',
      newAssignment.title,
      `Created new academic assignment "${newAssignment.title}" for ${newAssignment.courseName}`
    );

    return newAssignment;
  },

  updateAssignment(id: string, updates: Partial<TeacherAssignment>): TeacherAssignment | null {
    const index = cachedAssignments.findIndex((a) => a.id === id);
    if (index === -1) return null;

    cachedAssignments[index] = { ...cachedAssignments[index], ...updates };
    notifyChange();

    activityService.log(
      'Assignment Updated',
      'assignments',
      cachedAssignments[index].title,
      `Updated assignment details for "${cachedAssignments[index].title}"`
    );

    return cachedAssignments[index];
  },

  updateStatus(id: string, status: AssignmentStatus): TeacherAssignment | null {
    return this.updateAssignment(id, { status });
  },

  deleteAssignment(id: string): boolean {
    const target = cachedAssignments.find((a) => a.id === id);
    if (!target) return false;

    cachedAssignments = cachedAssignments.filter((a) => a.id !== id);
    notifyChange();

    activityService.log(
      'Assignment Deleted',
      'assignments',
      target.title,
      `Deleted assignment "${target.title}"`
    );

    return true;
  },

  subscribe: subscribeTeacherAssignments,
};
