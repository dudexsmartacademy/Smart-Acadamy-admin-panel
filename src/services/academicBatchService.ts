import { whenSignedIn } from '../lib/supabase';
import { writeFailure, writeResult } from '../lib/persist';
import { supabaseAny as supabase } from '../lib/supabase';
import { AcademicBatch } from '../types';
import { logActivity } from './activityService';
import { academicService } from './academicService';

let cachedBatches: AcademicBatch[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_academic_batches_changed'));
  }
}

// DDL: batches(id, college_id NOT NULL FK→colleges, name TEXT NOT NULL,
//       start_year INT NOT NULL, end_year INT NOT NULL, created_at, updated_at)
// Columns that do NOT exist: code, department, course_name, start_date, end_date,
//   is_active, specialization_id
function rowToBatch(row: any): AcademicBatch {
  const colleges = academicService.getColleges();
  const college = colleges.find((c) => c.id === row.college_id);
  const collegeName = row.colleges?.name || college?.collegeName || '';
  return {
    id: row.id,
    batchCode: row.name || row.id,
    name: row.name || 'Batch',
    courseId: row.college_id || '',
    courseName: collegeName,
    startDate: row.start_year ? `${row.start_year}-01-01` : new Date().toISOString().split('T')[0],
    endDate: row.end_year ? `${row.end_year}-12-31` : '',
    classroom: 'Main Lecture Hall',
    currentStudentsCount: Number(row.student_count) || 0,
    status: 'active',
  };
}

export const fetchAcademicBatches = async (): Promise<AcademicBatch[]> => {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      cachedBatches = data.map(rowToBatch);
      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch batches from Supabase:', err);
  }
  return cachedBatches;
};

// Initial background fetch
whenSignedIn(fetchAcademicBatches);

export const getAcademicBatches = (): AcademicBatch[] => {
  return cachedBatches;
};

export const getAcademicBatchById = (id: string): AcademicBatch | undefined => {
  return cachedBatches.find((b) => b.id === id || b.batchCode === id);
};

export const getAcademicBatchesByCourse = (courseId: string): AcademicBatch[] => {
  return cachedBatches.filter((b) => b.courseId === courseId);
};

export const createAcademicBatch = (data: Omit<AcademicBatch, 'id' | 'currentStudentsCount'>): AcademicBatch => {
  const id = crypto.randomUUID();
  const newBatch: AcademicBatch = {
    ...data,
    id,
    currentStudentsCount: 0,
  };

  cachedBatches = [newBatch, ...cachedBatches];
  notifyChange();

  // Parse start_year/end_year from the name (e.g. "2024-2028") or startDate
  const nameMatch = newBatch.name.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  const startYear = nameMatch ? parseInt(nameMatch[1]) : new Date(newBatch.startDate).getFullYear() || new Date().getFullYear();
  const endYear = nameMatch ? parseInt(nameMatch[2]) : startYear + 4;

  // Resolve college_id — use courseId if it looks like a UUID, otherwise get the first college
  (async () => {
    try {
      let collegeId = newBatch.courseId;
      if (!collegeId || !/^[0-9a-f-]{36}$/i.test(collegeId)) {
        const { data: col } = await supabase.from('colleges').select('id').limit(1).maybeSingle();
        collegeId = col?.id || null;
      }
      if (!collegeId) {
        console.warn('academicBatchService: no college found — cannot insert batch');
        return;
      }

      const { error } = await supabase
        .from('batches')
        .insert({
          college_id: collegeId,
          name: newBatch.name,
          start_year: startYear,
          end_year: endYear,
        })
        .select('id')
        .single();

      if (error) console.warn('academicBatchService: insert failed:', error.message);
    } catch (err) {
      console.warn('academicBatchService: insert failed:', err);
    }
  })();

  logActivity({
    action: 'Created Batch',
    user: 'Administrator',
    details: `Created batch ${newBatch.name} (${newBatch.batchCode})`,
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  return newBatch;
};

export const updateAcademicBatch = (id: string, updates: Partial<AcademicBatch>): AcademicBatch | null => {
  const idx = cachedBatches.findIndex((b) => b.id === id);
  if (idx === -1) return null;

  cachedBatches[idx] = { ...cachedBatches[idx], ...updates };
  const updated = cachedBatches[idx];
  notifyChange();

  // Parse years from name or dates
  const nameMatch = updated.name.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  const updatePayload: Record<string, unknown> = { name: updated.name };
  if (nameMatch) {
    updatePayload.start_year = parseInt(nameMatch[1]);
    updatePayload.end_year = parseInt(nameMatch[2]);
  }

  supabase
    .from('batches')
    .update(updatePayload)
    .eq('id', id)
    .then(writeResult('Updating the batch'), writeFailure('Updating the batch'));

  logActivity({
    action: 'Updated Batch',
    user: 'Administrator',
    details: `Updated batch ${updated.name}`,
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  return updated;
};

export const deleteAcademicBatch = (id: string): boolean => {
  const batch = cachedBatches.find(b => b.id === id);
  if (!batch) return false;

  cachedBatches = cachedBatches.filter((b) => b.id !== id);
  notifyChange();

  supabase.from('batches').delete().eq('id', id).then(writeResult('Deleting the batch'), writeFailure('Deleting the batch'));

  logActivity({
    action: 'Deleted Batch',
    user: 'Administrator',
    details: `Deleted batch: ${batch.name}`,
    timestamp: new Date().toISOString(),
    status: 'warning'
  });

  return true;
};

export const getBatches = getAcademicBatches;
export const getBatchById = getAcademicBatchById;
export const createBatch = createAcademicBatch;
export const updateBatch = updateAcademicBatch;
export const deleteBatch = deleteAcademicBatch;

export const academicBatchService = {
  getBatches: getAcademicBatches,
  fetchBatches: fetchAcademicBatches,
  getBatchById: getAcademicBatchById,
  createBatch: createAcademicBatch,
  updateBatch: updateAcademicBatch,
  deleteBatch: deleteAcademicBatch,
  getAcademicBatches,
  getAcademicBatchById,
  createAcademicBatch,
  updateAcademicBatch,
  deleteAcademicBatch,
};
