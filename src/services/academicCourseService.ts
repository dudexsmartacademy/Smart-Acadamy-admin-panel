import { whenSignedIn } from '../lib/supabase';
import { supabaseAny as supabase } from '../lib/supabase';
import { AcademicCourse } from '../types';
import { logActivity } from './activityService';

let cachedCourses: AcademicCourse[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_academic_courses_changed'));
  }
}

function rowToCourse(row: any): AcademicCourse {
  return {
    id: row.id,
    courseCode: row.code || row.id,
    code: row.code || row.id,
    name: row.name || 'Course',
    category: 'Core Curriculum',
    description: row.description || '',
    credits: 3,
    status: row.status === 'inactive' ? 'Inactive' : 'Active',
    duration: '4 Months',
    durationMonths: 4,
    enrolledStudentsCount: 0,
    createdAt: row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
  };
}

export const fetchAcademicCourses = async (): Promise<AcademicCourse[]> => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      cachedCourses = data.map(rowToCourse);
      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch academic courses from Supabase:', err);
  }
  return cachedCourses;
};

// Initial background fetch
whenSignedIn(fetchAcademicCourses);

export const getAcademicCourses = (): AcademicCourse[] => {
  return cachedCourses;
};

export const getAcademicCourseById = (id: string): AcademicCourse | undefined => {
  return cachedCourses.find((c) => c.id === id || c.courseCode === id);
};

export const createAcademicCourse = (courseData: Omit<AcademicCourse, 'id' | 'createdAt' | 'enrolledStudentsCount'>): AcademicCourse => {
  const id = crypto.randomUUID();
  const newCourse: AcademicCourse = {
    ...courseData,
    id,
    enrolledStudentsCount: 0,
    createdAt: new Date().toISOString().split('T')[0],
  };

  cachedCourses = [newCourse, ...cachedCourses];
  notifyChange();

  logActivity({
    action: 'Created Course',
    user: 'Administrator',
    details: `Created new course: ${newCourse.name} (${newCourse.courseCode})`,
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  return newCourse;
};

export const updateAcademicCourse = (id: string, updates: Partial<AcademicCourse>): AcademicCourse | null => {
  const idx = cachedCourses.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  cachedCourses[idx] = { ...cachedCourses[idx], ...updates };
  notifyChange();

  logActivity({
    action: 'Updated Course',
    user: 'Administrator',
    details: `Updated course: ${cachedCourses[idx].name}`,
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  return cachedCourses[idx];
};

export const deleteAcademicCourse = (id: string): boolean => {
  const course = cachedCourses.find(c => c.id === id);
  if (!course) return false;

  cachedCourses = cachedCourses.filter((c) => c.id !== id);
  notifyChange();

  logActivity({
    action: 'Deleted Course',
    user: 'Administrator',
    details: `Deleted course: ${course.name}`,
    timestamp: new Date().toISOString(),
    status: 'warning'
  });

  return true;
};

export const getCourses = getAcademicCourses;
export const getCourseById = getAcademicCourseById;
export const createCourse = createAcademicCourse;
export const updateCourse = updateAcademicCourse;
export const deleteCourse = deleteAcademicCourse;

export const academicCourseService = {
  getCourses: getAcademicCourses,
  fetchCourses: fetchAcademicCourses,
  getCourseById: getAcademicCourseById,
  createCourse: createAcademicCourse,
  updateCourse: updateAcademicCourse,
  deleteCourse: deleteAcademicCourse,
  getAcademicCourses,
  getAcademicCourseById,
  createAcademicCourse,
  updateAcademicCourse,
  deleteAcademicCourse,
};
