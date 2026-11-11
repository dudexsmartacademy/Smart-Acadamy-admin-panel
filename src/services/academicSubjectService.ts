import { whenSignedIn } from '../lib/supabase';
import { writeFailure, writeResult } from '../lib/persist';
import { supabaseAny as supabase } from '../lib/supabase';
import { AcademicSubject } from '../types';
import { logActivity } from './activityService';

let cachedSubjects: AcademicSubject[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_academic_subjects_changed'));
  }
}

function rowToSubject(row: any): AcademicSubject {
  return {
    id: row.id,
    subjectCode: row.code || row.id,
    code: row.code || row.id,
    name: row.name || 'Subject',
    courseId: row.department_id || '',
    courseName: '',
    credits: row.credits || 3,
    description: row.description || '',
    status: row.is_active ? 'Active' : 'Inactive',
  };
}

export const fetchAcademicSubjects = async (): Promise<AcademicSubject[]> => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      cachedSubjects = data.map(rowToSubject);
      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch subjects from Supabase:', err);
  }
  return cachedSubjects;
};

// Initial background fetch
whenSignedIn(fetchAcademicSubjects);

export const getAcademicSubjects = (): AcademicSubject[] => {
  return cachedSubjects;
};

export const getAcademicSubjectById = (id: string): AcademicSubject | undefined => {
  return cachedSubjects.find((s) => s.id === id || s.subjectCode === id);
};

export const getAcademicSubjectsByCourse = (courseId: string): AcademicSubject[] => {
  return cachedSubjects.filter((s) => s.courseId === courseId);
};

export const createAcademicSubject = (data: Omit<AcademicSubject, 'id'>): AcademicSubject => {
  const id = crypto.randomUUID();
  const newSubj: AcademicSubject = {
    ...data,
    id,
  };

  cachedSubjects = [newSubj, ...cachedSubjects];
  notifyChange();

  supabase
    .from('subjects')
    .insert({
      name: newSubj.name,
      code: newSubj.subjectCode || newSubj.code,
      department: newSubj.department || '',
      credits: newSubj.credits,
    })
    .then(writeResult('Saving the subject'), writeFailure('Saving the subject'));

  logActivity({
    action: 'Created Subject',
    user: 'Administrator',
    details: `Added new subject: ${newSubj.name} (${newSubj.subjectCode})`,
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  return newSubj;
};

export const updateAcademicSubject = (id: string, updates: Partial<AcademicSubject>): AcademicSubject | null => {
  const idx = cachedSubjects.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  cachedSubjects[idx] = { ...cachedSubjects[idx], ...updates };
  notifyChange();

  supabase
    .from('subjects')
    .update({
      name: cachedSubjects[idx].name,
      code: cachedSubjects[idx].code,
    })
    .eq('id', id)
    .then(writeResult('Updating the subject'), writeFailure('Updating the subject'));

  logActivity({
    action: 'Updated Subject',
    user: 'Administrator',
    details: `Updated subject: ${cachedSubjects[idx].name}`,
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  return cachedSubjects[idx];
};

export const deleteAcademicSubject = (id: string): boolean => {
  const subj = cachedSubjects.find(s => s.id === id);
  if (!subj) return false;

  cachedSubjects = cachedSubjects.filter((s) => s.id !== id);
  notifyChange();

  supabase.from('subjects').delete().eq('id', id).then(writeResult('Deleting the subject'), writeFailure('Deleting the subject'));

  logActivity({
    action: 'Deleted Subject',
    user: 'Administrator',
    details: `Deleted subject: ${subj.name}`,
    timestamp: new Date().toISOString(),
    status: 'warning'
  });

  return true;
};

export const getSubjects = getAcademicSubjects;
export const getSubjectById = getAcademicSubjectById;
export const createSubject = createAcademicSubject;
export const updateSubject = updateAcademicSubject;
export const deleteSubject = deleteAcademicSubject;

export const academicSubjectService = {
  getSubjects: getAcademicSubjects,
  fetchSubjects: fetchAcademicSubjects,
  getSubjectById: getAcademicSubjectById,
  createSubject: createAcademicSubject,
  updateSubject: updateAcademicSubject,
  deleteSubject: deleteAcademicSubject,
  getAcademicSubjects,
  getAcademicSubjectById,
  getAcademicSubjectsByCourse,
  createAcademicSubject,
  updateAcademicSubject,
  deleteAcademicSubject,
};
