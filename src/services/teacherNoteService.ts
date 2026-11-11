import { whenSignedIn } from '../lib/supabase';
import { supabaseAny as supabase } from '../lib/supabase';
import { activityService } from './activityService';
import { teacherService } from './teacherService';

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

const STORAGE_KEY = 'dudex_teacher_notes_cache';

// Data comes only from Supabase; an older browser copy is discarded so stale
// or demo records never show before the live data loads.
function loadCachedNotes(): TeacherNote[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  return [];
}

let cachedNotes: TeacherNote[] = loadCachedNotes();
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_teacher_notes_changed'));
  }
}

function rowToNote(row: any): TeacherNote {
  const teacher = teacherService.getTeacherById(row.teacher_id);
  const teacherName = (row.teacher_profiles?.profiles as any)?.full_name || (row.profiles as any)?.full_name || teacher?.fullName || row.teacher_name || 'Faculty Instructor';
  const designation = teacher?.designation || 'Faculty Member';
  const department = teacher?.department || 'Academics';

  const attachments: TeacherNoteAttachment[] = (row.note_attachments || []).map((a: any) => ({
    id: a.id,
    name: a.file_name || 'Attachment',
    type: a.file_type || 'application/octet-stream',
    size: a.file_size ? `${(Number(a.file_size) / 1024).toFixed(1)} KB` : undefined,
    url: a.file_url || a.file_path || '',
  }));

  const createdDate = row.date || row.note_date || (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

  // Preserve actual subject; do not overwrite with classes.name unless subject is absent
  const subject = row.subject || (row.classes as any)?.name || 'General Subject';
  const batch = (Array.isArray(row.batches) && row.batches.length ? row.batches.join(', ') : '') || (row.classes as any)?.name || 'No batch';

  return {
    id: row.id,
    teacherId: row.teacher_id || teacher?.teacherId || teacher?.id || '',
    teacherName,
    teacherDesignation: designation,
    department,
    title: row.title || 'Untitled Note',
    description: row.description || '',
    subject,
    topic: row.topic || row.title || '',
    batch,
    noteDate: createdDate,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.created_at || new Date().toISOString(),
    status: row.is_published === false ? 'Draft' : 'Published',
    attachments,
  };
}

export const fetchTeacherNotes = async (): Promise<TeacherNote[]> => {
  try {
    let { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        classes (
          name
        ),
        note_attachments (
          *
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      const fbRes = await supabase
        .from('notes')
        .select('*, note_attachments(*)')
        .order('created_at', { ascending: false });
      if (!fbRes.error && fbRes.data) {
        data = fbRes.data;
        error = null;
      }
    }

    if (!error && data && Array.isArray(data)) {
      cachedNotes = data.map(rowToNote);
      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch notes from Supabase:', err);
  }
  return cachedNotes;
};

// Initial background fetch
whenSignedIn(fetchTeacherNotes);

export const teacherNoteService = {
  fetchTeacherNotes,

  getNotes(): TeacherNote[] {
    return cachedNotes;
  },

  getNotesByTeacherId(teacherId?: string): TeacherNote[] {
    if (!teacherId) return cachedNotes;
    const teacher = teacherService.getTeacherById(teacherId);
    const candidateIds = [teacherId, teacher?.id, teacher?.userId, teacher?.teacherId].filter(Boolean);
    return cachedNotes.filter((n) => {
      if (candidateIds.includes(n.teacherId)) return true;
      if (teacher?.fullName && n.teacherName && n.teacherName.trim().toLowerCase() === teacher.fullName.trim().toLowerCase()) return true;
      return false;
    });
  },

  getNoteById(id: string): TeacherNote | undefined {
    return cachedNotes.find((n) => n.id === id);
  },

  async fetchNoteById(id: string): Promise<TeacherNote | null> {
    const cached = cachedNotes.find((n) => n.id === id);
    if (cached) return cached;
    try {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          classes (
            name
          ),
          note_attachments (
            *
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const note = rowToNote(data);
        if (!cachedNotes.some((n) => n.id === note.id)) {
          cachedNotes.unshift(note);
          notifyChange();
        }
        return note;
      }

      // Fallback
      const fb = await supabase
        .from('notes')
        .select('*, note_attachments(*)')
        .eq('id', id)
        .maybeSingle();
      if (!fb.error && fb.data) {
        const note = rowToNote(fb.data);
        if (!cachedNotes.some((n) => n.id === note.id)) {
          cachedNotes.unshift(note);
          notifyChange();
        }
        return note;
      }
    } catch (err) {
      console.error('Failed to fetch note by id:', err);
    }
    return null;
  },

  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
    if (!filePath) return null;
    if (/^https?:\/\//i.test(filePath)) return filePath;
    try {
      const cleanPath = filePath.replace(/^\/+/, '');
      const { data, error } = await supabase.storage.from('notes').createSignedUrl(cleanPath, expiresIn);
      if (error) {
        console.error('Storage signed URL error:', error);
        return null;
      }
      return data?.signedUrl || null;
    } catch (err) {
      console.error('Failed to create signed url:', err);
      return null;
    }
  },

  onChange(cb: () => void): () => void {
    listeners.push(cb);
    return () => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  /**
   * Publishes a note for a teacher to the selected batches (one notes row with
   * a batch list). Files go to the private `notes` bucket and students of those
   * batches read them through signed URLs.
   */
  async createNote(data: {
    teacherId: string;
    batches: string[];
    title: string;
    subject: string;
    topic?: string;
    description: string;
    noteDate?: string;
    files?: File[];
  }): Promise<number> {
    const teacher = teacherService.getTeacherById(data.teacherId);
    const teacherUserId = teacher?.userId || '';
    if (!teacherUserId) throw new Error('This teacher has no linked login account, so notes cannot be published.');
    if (data.batches.length === 0) throw new Error('Select at least one batch.');

    const noteDate = data.noteDate || new Date().toISOString().split('T')[0];
    const uploaded: Array<{ path: string; name: string; type: string; size: number }> = [];
    for (const file of data.files || []) {
      const path = `admin/${teacherUserId}/${Date.now()}_${file.name.replace(/[^A-Za-z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from('notes').upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (error) {
        if (uploaded.length) await supabase.storage.from('notes').remove(uploaded.map((u) => u.path));
        throw new Error(`Could not upload ${file.name}: ${error.message}`);
      }
      uploaded.push({ path, name: file.name, type: file.type || 'application/octet-stream', size: file.size });
    }

    const firstPdf = uploaded.find((u) => u.type.includes('pdf')) || uploaded[0];
    const rows = [{
      teacher_id: teacherUserId,
      class_id: null,
      batches: data.batches,
      teacher_name: teacher?.fullName || 'Faculty Member',
      subject: data.subject.trim() || 'General',
      title: data.title.trim(),
      description: data.description.trim() || null,
      date: noteDate,
      pdf_url: firstPdf?.path || null,
      pdf_name: firstPdf?.name || null,
    }];
    const { data: inserted, error } = await supabase.from('notes').insert(rows).select('id');
    if (error || !inserted) {
      if (uploaded.length) await supabase.storage.from('notes').remove(uploaded.map((u) => u.path));
      throw new Error(`Could not publish the note: ${error?.message || 'no rows saved'}`);
    }

    if (uploaded.length) {
      const attachments = (inserted as Array<{ id: string }>).flatMap((note) =>
        uploaded.map((u) => ({
          note_id: note.id,
          file_url: u.path,
          file_name: u.name,
          file_type: u.type,
        })),
      );
      const { error: attError } = await supabase.from('note_attachments').insert(attachments);
      if (attError) throw new Error(`The note was published but its attachments could not be linked: ${attError.message}`);
    }

    activityService.log(
      'Teacher Note Created',
      'notes',
      data.title,
      `Published note "${data.title}" for ${teacher?.fullName || 'teacher'} to ${data.batches.join(', ')}`
    );
    await fetchTeacherNotes();
    return inserted.length;
  },

  async updateNote(id: string, updates: Partial<TeacherNote>): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.subject !== undefined) payload.subject = updates.subject;
    if (updates.noteDate) payload.date = updates.noteDate;
    const { data, error } = await supabase.from('notes').update(payload).eq('id', id).select('id');
    if (error) throw new Error(`Could not update the note: ${error.message}`);
    if (!data || data.length === 0) throw new Error('The note was not found.');
    await fetchTeacherNotes();
  },

  async deleteNote(id: string): Promise<boolean> {
    const note = cachedNotes.find((n) => n.id === id);
    const { data, error } = await supabase.from('notes').delete().eq('id', id).select('id');
    if (error) throw new Error(`Could not delete the note: ${error.message}`);
    if (!data || data.length === 0) throw new Error('The note was not found.');
    // Attachment files may be shared by the same note published to other batches.
    const paths = (note?.attachments || []).map((a) => a.url).filter((u): u is string => Boolean(u && !/^https?:/i.test(u)));
    const stillUsed = new Set(
      cachedNotes.filter((n) => n.id !== id).flatMap((n) => n.attachments.map((a) => a.url)),
    );
    const orphaned = paths.filter((p) => !stillUsed.has(p));
    if (orphaned.length) await supabase.storage.from('notes').remove(orphaned);
    cachedNotes = cachedNotes.filter((n) => n.id !== id);
    notifyChange();
    return true;
  },
};
