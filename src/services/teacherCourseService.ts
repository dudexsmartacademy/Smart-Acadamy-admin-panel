import { TeacherCourse } from '../types';
import { activityService } from './activityService';
import { teacherService } from './teacherService';

let cachedCourses: TeacherCourse[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_teacher_courses_changed'));
  }
}

export const subscribeTeacherCourses = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const teacherCourseService = {
  getCourses(): TeacherCourse[] {
    return cachedCourses;
  },

  getCoursesByTeacherId(teacherId: string): TeacherCourse[] {
    return cachedCourses.filter((c) => c.teacherId === teacherId);
  },

  getCourseById(id: string): TeacherCourse | undefined {
    return cachedCourses.find((c) => c.id === id || c.code === id);
  },

  assignCourse(courseData: Omit<TeacherCourse, 'id'>): TeacherCourse {
    const newCourse: TeacherCourse = {
      ...courseData,
      id: crypto.randomUUID(),
    };

    cachedCourses = [newCourse, ...cachedCourses];
    notifyChange();

    // Update teacher's assignedCourseIds
    const teacher = teacherService.getTeacherById(newCourse.teacherId);
    if (teacher) {
      const courseIds = Array.from(new Set([...(teacher.assignedCourseIds || []), newCourse.id]));
      teacherService.updateTeacherLocal(teacher.id, { assignedCourseIds: courseIds });
    }

    activityService.log(
      'Course Assigned',
      'courses',
      newCourse.name,
      `Assigned course "${newCourse.name}" (${newCourse.code}) to ${newCourse.teacherName || 'Faculty'}`
    );

    return newCourse;
  },

  updateCourse(id: string, updates: Partial<TeacherCourse>): TeacherCourse | null {
    const index = cachedCourses.findIndex((c) => c.id === id);
    if (index === -1) return null;

    cachedCourses[index] = { ...cachedCourses[index], ...updates };
    notifyChange();
    return cachedCourses[index];
  },

  removeCourseAssignment(courseId: string): boolean {
    const course = cachedCourses.find((c) => c.id === courseId);
    if (!course) return false;

    cachedCourses = cachedCourses.filter((c) => c.id !== courseId);
    notifyChange();

    // Remove from teacher
    const teacher = teacherService.getTeacherById(course.teacherId);
    if (teacher) {
      const courseIds = (teacher.assignedCourseIds || []).filter((id) => id !== courseId);
      teacherService.updateTeacherLocal(teacher.id, { assignedCourseIds: courseIds });
    }

    activityService.log(
      'Course Assignment Removed',
      'courses',
      course.name,
      `Unassigned course "${course.name}" from ${course.teacherName}`
    );

    return true;
  },

  subscribe: subscribeTeacherCourses,
};
