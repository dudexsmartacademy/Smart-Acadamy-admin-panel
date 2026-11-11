export interface TeacherNoteAttachment {
  id: string;
  name: string;
  type: string;
  size?: string;
  url?: string;
}

export interface TeacherNote {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherDesignation: string;
  department: string;
  title: string;
  description: string;
  subject: string;
  topic: string;
  batch: string;
  noteDate: string;
  createdAt: string;
  updatedAt: string;
  status: 'Published' | 'Draft';
  attachments: TeacherNoteAttachment[];
}

export const teacherNotesDemo: TeacherNote[] = [];

export function getTeacherNotesDemo(teacherId?: string): TeacherNote[] {
  if (!teacherId) return teacherNotesDemo;
  return teacherNotesDemo.filter((n) => n.teacherId === teacherId);
}

export function getTeacherNoteDemo(id: string): TeacherNote | undefined {
  return teacherNotesDemo.find((n) => n.id === id);
}