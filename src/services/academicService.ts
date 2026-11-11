import { whenSignedIn } from '../lib/supabase';
import { supabaseAny as supabase } from '../lib/supabase';

export interface BatchConfig {
  id: string;
  name: string;
  studentLimit: number;
}

export interface AcademicCollege {
  id: string;
  collegeName: string;
  code: string;
  campusLocation?: string;
  establishedYear?: string;
  degrees: string[];
  specializations: string[];
  batches: BatchConfig[];
  batchLimit: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

const CHANGE_EVENT = 'dudex_academic_colleges_changed';

// Colleges come only from Supabase (no browser copy or demo college).
export const initialColleges: AcademicCollege[] = [];

let cachedColleges: AcademicCollege[] = [];

const batchNumber = (name: string) => {
  const match = /^batch\s+(\d+)$/i.exec(name.trim());
  return match ? Number(match[1]) : 0;
};
let tableAvailable = true;

function notifyChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function rowToCollege(row: any): AcademicCollege {
  const depts: any[] = row.departments || [];
  const specsSet = new Set<string>();
  const batchesList: BatchConfig[] = [];

  depts.forEach((d) => {
    (d.specializations || []).forEach((s: any) => {
      if (s.name) specsSet.add(s.name);
      (s.batches || []).forEach((b: any) => {
        if (b.name) {
          batchesList.push({
            id: b.id,
            name: b.name,
            studentLimit: b.student_limit || 60,
          });
        }
      });
    });
  });

  return {
    id: row.id,
    collegeName: row.name || 'College',
    code: row.code || '',
    campusLocation: row.city ? `${row.city}, ${row.state || ''}`.trim() : '',
    establishedYear: '',
    degrees: ['B.Tech', 'M.Tech'],
    specializations: specsSet.size > 0 ? Array.from(specsSet) : ['CSE', 'AI & DS', 'Information Technology'],
    batches: batchesList.length > 0 ? batchesList : [
      { id: 'b1', name: 'Batch 1', studentLimit: 60 },
      { id: 'b2', name: 'Batch 2', studentLimit: 60 },
    ],
    batchLimit: 60,
    status: 'Active',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export const fetchColleges = async (): Promise<AcademicCollege[]> => {
  if (!tableAvailable) return cachedColleges;

  try {
    const { data, error } = await supabase
      .from('colleges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist') || (error as any).status === 404 || (error as any).status === 400) {
        tableAvailable = false;
      }
    } else if (data && data.length > 0) {
      // Fetch departments optionally
      let departmentsList: any[] = [];
      try {
        const { data: depts } = await supabase.from('departments').select('*');
        if (depts) departmentsList = depts;
      } catch {}

      const mapped = data.map((col: any) => {
        const colDepts = departmentsList.filter((d: any) => d.college_id === col.id);
        const deptNames = colDepts.map((d: any) => d.name).filter(Boolean);

        return {
          id: col.id,
          collegeName: col.name || 'College',
          code: col.code || '',
          campusLocation: col.city ? `${col.city}, ${col.state || ''}`.trim() : '',
          establishedYear: '',
          // Degrees and batch names are stored on the college (migration 053).
          degrees: Array.isArray(col.degrees) ? col.degrees : [],
          specializations: deptNames,
          batches: (Array.isArray(col.batches) ? col.batches : []).map((name: string, i: number) => ({
            id: `b${i + 1}`,
            name,
            studentLimit: 60,
          })),
          batchLimit: 60,
          status: 'Active' as const,
          createdAt: col.created_at || new Date().toISOString(),
        };
      });

      // Only database colleges are kept: browser-only entries (non-UUID ids such
      // as COL-1234) were never saved and cannot be referenced by other tables.
      cachedColleges = mapped;
      notifyChange();
    }
  } catch {
    tableAvailable = false;
  }
  return cachedColleges;
};

// Initial background fetch (silent)
whenSignedIn(fetchColleges);

export const academicService = {
  fetchColleges,

  /** Batch numbers are global: the next batch after the highest one in any college. */
  nextBatchNumber(): number {
    const max = cachedColleges.reduce(
      (m, c) => Math.max(m, ...c.batches.map((b) => batchNumber(b.name)), 0),
      0
    );
    return max + 1;
  },

  /**
   * Gives every batch that is not already saved for this college the next
   * global number (Batch N), so two colleges never share a batch name.
   */
  numberBatches(batches: BatchConfig[], collegeId?: string | null): BatchConfig[] {
    const own = new Set(
      (collegeId ? cachedColleges.find((c) => c.id === collegeId)?.batches || [] : []).map((b) => b.name)
    );
    let next = this.nextBatchNumber();
    return batches.map((b) => (own.has(b.name) ? b : { ...b, name: `Batch ${next++}` }));
  },

  getColleges(): AcademicCollege[] {
    return cachedColleges;
  },

  getCollegeById(id: string): AcademicCollege | undefined {
    return cachedColleges.find((c) => c.id === id);
  },

  getCollegeByName(name: string): AcademicCollege | undefined {
    return cachedColleges.find(
      (c) => c.collegeName.toLowerCase().trim() === name.toLowerCase().trim()
    );
  },

  /**
   * Saves a college to Supabase first and only then adds it to the cache, so
   * every college in the UI has a real database id. Returns an error message
   * (e.g. a duplicate college code) instead of silently keeping a local copy.
   */
  async createCollege(
    collegeData: Omit<AcademicCollege, 'id' | 'createdAt'>
  ): Promise<{ college: AcademicCollege | null; error: string | null }> {
    const { data, error } = await supabase
      .from('colleges')
      .insert({
        name: collegeData.collegeName,
        code: collegeData.code,
        status: collegeData.status || 'Active',
        degrees: collegeData.degrees || [],
        batches: (collegeData.batches || []).map((b) => b.name).filter(Boolean),
      })
      .select()
      .single();

    if (error || !data?.id) {
      if ((error as any)?.code === '23505') {
        const existing = cachedColleges.find(
          (c) => c.code.toLowerCase() === String(collegeData.code).toLowerCase()
        );
        return {
          college: null,
          error: `College code "${collegeData.code}" is already used${existing ? ` by "${existing.collegeName}"` : ''}. Use a different code.`,
        };
      }
      return { college: null, error: error?.message || 'The college could not be saved.' };
    }

    const newCollege: AcademicCollege = {
      ...collegeData,
      id: data.id,
      createdAt: data.created_at || new Date().toISOString(),
    };
    cachedColleges = [newCollege, ...cachedColleges];
    notifyChange();

    if (Array.isArray(newCollege.specializations) && newCollege.specializations.length > 0) {
      const deptsToInsert = newCollege.specializations.map((spec) => ({
        college_id: data.id,
        name: spec,
        code: spec.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || spec.slice(0, 5),
      }));
      const { error: deptError } = await supabase.from('departments').insert(deptsToInsert);
      if (deptError) console.warn('departments insert notice:', deptError.message);
    }

    return { college: newCollege, error: null };
  },

  async updateCollege(
    id: string,
    updates: Partial<AcademicCollege>
  ): Promise<{ college: AcademicCollege | null; error: string | null }> {
    const index = cachedColleges.findIndex((c) => c.id === id);
    if (index === -1) return { college: null, error: 'The college was not found.' };

    const updatedCollege: AcademicCollege = { ...cachedColleges[index], ...updates };
    const { error } = await supabase
      .from('colleges')
      .update({
        name: updatedCollege.collegeName,
        code: updatedCollege.code,
        degrees: updatedCollege.degrees || [],
        batches: (updatedCollege.batches || []).map((b) => b.name).filter(Boolean),
      })
      .eq('id', id);
    if (error) {
      return {
        college: null,
        error:
          error.code === '23505' && /batch/i.test(error.message)
            ? error.message
            : error.code === '23505'
              ? `College code "${updatedCollege.code}" is already used by another college.`
              : error.message,
      };
    }

    cachedColleges[index] = updatedCollege;
    notifyChange();

    if (Array.isArray(updates.specializations) && updates.specializations.length > 0) {
      const deptsToInsert = updates.specializations.map((spec) => ({
        college_id: id,
        name: spec,
        code: spec.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || spec.slice(0, 5),
      }));
      const { error: deptError } = await supabase.from('departments').upsert(deptsToInsert, { onConflict: 'college_id,code' });
      if (deptError) console.warn('departments update notice:', deptError.message);
    }

    return { college: updatedCollege, error: null };
  },

  async deleteCollege(id: string): Promise<string | null> {
    const { error } = await supabase.from('colleges').delete().eq('id', id);
    if (error) return error.message;
    cachedColleges = cachedColleges.filter((c) => c.id !== id);
    notifyChange();
    return null;
  },

  getAllColleges(): string[] {
    const names = new Set<string>();
    cachedColleges.forEach((c) => {
      if (c.collegeName) names.add(c.collegeName.trim());
    });
    return Array.from(names);
  },

  getDegreesForCollege(collegeName?: string): string[] {
    const degrees = new Set<string>();
    if (collegeName) {
      const found = cachedColleges.find(
        (c) => c.collegeName.toLowerCase().trim() === collegeName.toLowerCase().trim()
      );
      if (found) {
        found.degrees.forEach((d) => degrees.add(d.trim()));
        return Array.from(degrees);
      }
    }
    cachedColleges.forEach((c) => {
      c.degrees.forEach((d) => degrees.add(d.trim()));
    });
    return Array.from(degrees);
  },

  getSpecializationsForCollege(collegeName?: string): string[] {
    const specs = new Set<string>();
    if (collegeName) {
      const found = cachedColleges.find(
        (c) => c.collegeName.toLowerCase().trim() === collegeName.toLowerCase().trim()
      );
      if (found) {
        found.specializations.forEach((s) => specs.add(s.trim()));
        return Array.from(specs);
      }
    }
    cachedColleges.forEach((c) => {
      c.specializations.forEach((s) => specs.add(s.trim()));
    });
    return Array.from(specs);
  },

  getBatchesForCollege(collegeName?: string): string[] {
    const batches = new Set<string>();
    if (collegeName) {
      const found = cachedColleges.find(
        (c) => c.collegeName.toLowerCase().trim() === collegeName.toLowerCase().trim()
      );
      if (found) {
        found.batches.forEach((b) => batches.add(b.name.trim()));
        return Array.from(batches);
      }
    }
    cachedColleges.forEach((c) => {
      c.batches.forEach((b) => batches.add(b.name.trim()));
    });
    return Array.from(batches);
  },

  getAllBatches(): string[] {
    const batches = new Set<string>();
    cachedColleges.forEach((c) => {
      c.batches.forEach((b) => batches.add(b.name.trim()));
    });
    return Array.from(batches);
  },

  getAvailableSeats(collegeName: string, batchName: string, currentCount: number): number {
    const college = this.getCollegeByName(collegeName);
    if (!college) return 0;
    const batch = college.batches.find(
      (b) => b.name.toLowerCase().trim() === batchName.toLowerCase().trim()
    );
    const limit = batch ? batch.studentLimit : college.batchLimit;
    return Math.max(0, limit - currentCount);
  },

  isBatchFull(collegeName: string, batchName: string, currentCount: number): boolean {
    return this.getAvailableSeats(collegeName, batchName, currentCount) <= 0;
  },

  onAcademicChange(callback: () => void): () => void {
    const handler = () => callback();
    if (typeof window !== 'undefined') {
      window.addEventListener(CHANGE_EVENT, handler);
      return () => window.removeEventListener(CHANGE_EVENT, handler);
    }
    return () => {};
  },
};
