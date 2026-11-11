import { teacherService } from '../services/teacherService';
import { teacherClassService } from '../services/teacherClassService';

export interface TeacherClass {
  id: string;
  teacherId: string;
  title: string;
  batch: string;
  subject: string;
  students: number | null;
  schedule: string;
  meetLink: string;
  description: string;
  status: 'Active' | 'Upcoming' | 'Completed' | 'Cancelled' | 'Unknown';
  date: string;
  /** classes.id for older class-targeted sessions. */
  classId: string;
  /** Batches whose students see the session. */
  batches: string[];
}

export interface TeacherClassTeacher {
  id: string;
  name: string;
  designation: string;
  department: string;
  facultyId: string;
  totalClasses: number;
  avatar?: string;
}

export function getTeacherClassesTeachers(): TeacherClassTeacher[] {
  const teachers = teacherService.getTeachers();
  const classes = teacherClassService.getClasses();
  return teachers.map((t) => {
    const candidateIds = [t.id, t.userId, t.teacherId].filter(Boolean).map((s) => s?.toLowerCase());
    const tClasses = classes.filter(
      (c) =>
        (c.teacherId && candidateIds.includes(c.teacherId.toLowerCase())) ||
        (t.fullName && c.teacherName && c.teacherName.trim().toLowerCase() === t.fullName.trim().toLowerCase())
    );
    return {
      id: t.id,
      name: t.fullName,
      designation: t.designation || '',
      department: t.department || '',
      facultyId: t.teacherId || t.id,
      totalClasses: tClasses.length,
      avatar: t.avatar,
    };
  });
}

export const teacherClassTeachers: TeacherClassTeacher[] = [];

export function getTeacherClassesDemo(teacherId?: string): TeacherClass[] {
  return teacherId ? getClassesByTeacherId(teacherId) : [];
}

export function getClassesByTeacherId(teacherId: string): TeacherClass[] {
  const list = teacherClassService.getClassesByTeacherId(teacherId);
  return list.map((c) => ({
    id: c.id,
    teacherId: c.teacherId,
    title: c.title,
    batch: (c.batches || []).join(', ') || c.batch,
    subject: c.subject,
    students: c.studentCount,
    schedule: c.startTime && c.endTime ? `${c.startTime} - ${c.endTime}` : '',
    meetLink: c.meetLink || '',
    description: c.topic && c.topic !== c.subject ? c.topic : '',
    status:
      c.status === 'live'
        ? 'Active'
        : c.status === 'completed'
          ? 'Completed'
          : c.status === 'upcoming'
            ? 'Upcoming'
            : c.status === 'cancelled'
              ? 'Cancelled'
              : 'Unknown',
    date: c.date,
    classId: c.classId || '',
    batches: c.batches || [],
  }));
}

export function getTeacherById(id: string): TeacherClassTeacher | undefined {
  const t = teacherService.getTeacherById(id);
  if (!t) return undefined;
  const classes = getClassesByTeacherId(t.id);
  return {
    id: t.id,
    name: t.fullName,
    designation: t.designation || '',
    department: t.department || '',
    facultyId: t.teacherId || t.id,
    totalClasses: classes.length,
  };
}