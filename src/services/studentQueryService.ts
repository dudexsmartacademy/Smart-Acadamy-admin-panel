import { supabaseAny, whenSignedIn } from '../lib/supabase';
import { writeResult } from '../lib/persist';
import { StudentQuery, StudentQueryStatus } from '../types';
import { activityService } from './activityService';

export const initialStudentQueries: StudentQuery[] = [];

let cachedQueries: StudentQuery[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_student_queries_changed'));
  }
}

export const subscribeStudentQueries = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

function mapRowToQuery(row: any): StudentQuery {
  let mappedStatus: StudentQueryStatus = 'Pending';
  const rawStatus = (row.status || '').toLowerCase();
  if (rawStatus === 'resolved' || rawStatus === 'closed') {
    mappedStatus = 'Resolved';
  } else if (rawStatus === 'in_progress' || rawStatus === 'in_review') {
    mappedStatus = 'In Review';
  } else if (rawStatus === 'rejected') {
    mappedStatus = 'Rejected';
  } else {
    mappedStatus = 'Pending';
  }

  return {
    id: row.id,
    queryCode: row.query_code || `QRY-${row.id.slice(0, 6).toUpperCase()}`,
    studentId: row.student_id || '',
    studentName: row.student_name || 'Student',
    studentAvatar: row.student_avatar || undefined,
    studentEmail: row.student_email || '',
    studentPhone: row.student_phone || undefined,
    batch: row.batch_name || 'General',
    category: row.category || 'General Inquiry',
    subject: row.subject || row.category || '',
    description: row.description || row.message || '',
    priority: (row.priority as any) || 'medium',
    status: mappedStatus,
    submittedAt: row.created_at ? new Date(row.created_at).toLocaleString() : new Date().toLocaleString(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toLocaleString() : undefined,
    assignedFaculty: row.assigned_faculty || undefined,
    adminResponse: row.admin_response || undefined,
    attachmentUrl: row.attachment_url || undefined,
  };
}

export const fetchStudentQueries = async (): Promise<StudentQuery[]> => {
  try {
    const { data, error } = await supabaseAny
      .from('student_queries')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      cachedQueries = data.map(mapRowToQuery);
      notifyChange();
    }
  } catch (err) {
    console.warn('Failed to fetch student queries from Supabase:', err);
  }
  return cachedQueries;
};

whenSignedIn(fetchStudentQueries);

export const getStudentQueries = (): StudentQuery[] => {
  return cachedQueries;
};

export const getStudentQueryById = (id: string): StudentQuery | undefined => {
  return cachedQueries.find((q) => q.id === id || q.queryCode === id);
};

export const getStudentQueriesByStudent = (studentId: string): StudentQuery[] => {
  return cachedQueries.filter((q) => q.studentId === studentId);
};

export const createStudentQuery = (
  data: Omit<StudentQuery, 'id' | 'queryCode' | 'submittedAt'> & {
    id?: string;
    queryCode?: string;
  }
): StudentQuery => {
  const count = cachedQueries.length + 1;
  const year = new Date().getFullYear();

  const newQuery: StudentQuery = {
    id: data.id || crypto.randomUUID(),
    queryCode: data.queryCode || `QRY-${year}-${String(count).padStart(3, '0')}`,
    submittedAt: new Date().toLocaleString(),
    ...data,
  };

  cachedQueries = [newQuery, ...cachedQueries];
  notifyChange();

  // Async save to Supabase
  supabaseAny
    .from('student_queries')
    .insert({
      id: newQuery.id,
      query_code: newQuery.queryCode,
      student_id: newQuery.studentId,
      student_name: newQuery.studentName,
      student_email: newQuery.studentEmail,
      student_phone: newQuery.studentPhone || null,
      batch_name: newQuery.batch,
      category: newQuery.category,
      subject: newQuery.subject || newQuery.category,
      description: newQuery.description,
      message: newQuery.description,
      status: 'open',
    })
    .then(writeResult('Saving the student query'), (err: any) => {
      console.warn('studentQueryService insert error:', err?.message);
    });

  activityService.log(
    'Student Query Submitted',
    'students',
    newQuery.studentName,
    `New query submitted: "${newQuery.subject || newQuery.category}" by ${newQuery.studentName}`
  );

  return newQuery;
};

export const updateStudentQuery = (
  id: string,
  updates: Partial<StudentQuery>
): StudentQuery | null => {
  const index = cachedQueries.findIndex((q) => q.id === id || q.queryCode === id);
  if (index === -1) return null;

  const current = cachedQueries[index];
  const isResolving = (updates.status === 'Resolved' || updates.status === 'resolved') && !current.resolvedAt;

  const updatedItem: StudentQuery = {
    ...current,
    ...updates,
    ...(isResolving ? { resolvedAt: new Date().toLocaleString() } : {}),
  };

  cachedQueries[index] = updatedItem;
  notifyChange();

  let dbStatus = 'open';
  const lowerStatus = (updatedItem.status || '').toLowerCase();
  if (lowerStatus === 'resolved' || lowerStatus === 'closed') dbStatus = 'resolved';
  else if (lowerStatus === 'in review' || lowerStatus === 'in_progress' || lowerStatus === 'in_review') dbStatus = 'in_progress';
  else if (lowerStatus === 'rejected') dbStatus = 'closed';

  supabaseAny
    .from('student_queries')
    .update({
      status: dbStatus,
      admin_response: updatedItem.adminResponse || null,
      resolved_at: isResolving ? new Date().toISOString() : undefined,
    })
    .eq('id', current.id)
    .then(writeResult('Updating the student query'), (err: any) => {
      console.warn('studentQueryService update error:', err?.message);
    });

  activityService.log(
    'Student Query Updated',
    'students',
    updatedItem.studentName,
    `Updated query [${updatedItem.queryCode}] status to "${updatedItem.status}" for ${updatedItem.studentName}`
  );

  return updatedItem;
};

export const deleteStudentQuery = (id: string): boolean => {
  const target = cachedQueries.find((q) => q.id === id || q.queryCode === id);
  if (!target) return false;

  cachedQueries = cachedQueries.filter((q) => q.id !== id && q.queryCode !== id);
  notifyChange();

  supabaseAny
    .from('student_queries')
    .delete()
    .eq('id', target.id)
    .then(writeResult('Deleting the student query'), (err: any) => {
      console.warn('studentQueryService delete error:', err?.message);
    });

  activityService.log(
    'Student Query Removed',
    'students',
    target.studentName,
    `Removed query [${target.queryCode}] for ${target.studentName}`
  );

  return true;
};

export const studentQueryService = {
  fetchStudentQueries,
  getStudentQueries,
  getStudentQueryById,
  getStudentQueriesByStudent,
  createStudentQuery,
  updateStudentQuery,
  deleteStudentQuery,
  subscribe: subscribeStudentQueries,
};
