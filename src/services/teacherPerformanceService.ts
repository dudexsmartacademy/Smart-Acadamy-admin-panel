import { teacherService } from './teacherService';
import { teacherClassService } from './teacherClassService';
import { teacherCourseService } from './teacherCourseService';
import { teacherAssignmentService } from './teacherAssignmentService';
import { TeacherPerformance } from '../types';

export const teacherPerformanceService = {
  getAllPerformances(): TeacherPerformance[] {
    const teachers = teacherService.getTeachers();
    const classes = teacherClassService.getClasses();
    const courses = teacherCourseService.getCourses();
    const assignments = teacherAssignmentService.getAssignments();
    return teachers.map((teacher) => {
      const teacherClasses = classes.filter((c) => c.teacherId === teacher.id);
      const conducted = teacherClasses.filter((c) => c.status === 'completed').length;
      const live = teacherClasses.filter((c) => c.status === 'live').length;
      const scheduled = teacherClasses.length;

      const teacherCourses = courses.filter((c) => c.teacherId === teacher.id);
      const teacherAssignments = assignments.filter((a) => a.teacherId === teacher.id);
      
      const totalAssignedStudents = teacherAssignments.reduce((acc, a) => acc + (a.studentCount || 0), 0);
      const totalSubmissions = teacherAssignments.reduce((acc, a) => acc + (a.submissionsCount || 0), 0);
      const assignmentsCompletedByStudentsRate = totalAssignedStudents > 0
        ? Math.min(100, Math.round((totalSubmissions / totalAssignedStudents) * 100))
        : null;

      return {
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        department: teacher.department,
        classesConducted: conducted,
        classesScheduled: scheduled,
        totalStudentsHandled: teacher.totalStudentsHandled ?? null,
        attendanceCompletionRate: teacher.attendanceRate ?? null,
        assignmentsCreated: teacherAssignments.length,
        assignmentsCompletedByStudentsRate,
        coursesHandledCount: teacherCourses.length,
        liveClassesConducted: live,
        notesPublished: null,
        announcementsPublished: null,
        avgStudentRating: teacher.rating ?? null,
        activityTrend: [],
      };
    });
  },

  getPerformanceByTeacherId(teacherId: string): TeacherPerformance | undefined {
    const list = this.getAllPerformances();
    return list.find((p) => p.teacherId === teacherId);
  },
};
