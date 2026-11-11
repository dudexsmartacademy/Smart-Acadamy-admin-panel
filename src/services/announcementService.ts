import { whenSignedIn } from '../lib/supabase';
import { supabaseAny as supabase } from '../lib/supabase';
import { Announcement, CentralNotification } from '../types';
import { logActivity } from './activityService';

let cachedAnnouncements: Announcement[] = [];
let cachedNotifications: CentralNotification[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_announcements_changed'));
  }
}

function normalizeAudience(raw?: string): string {
  if (!raw) return 'All Users';
  const l = raw.toLowerCase().trim();
  if (l === 'student' || l === 'students' || l === 'students only') return 'Students Only';
  if (l === 'teacher' || l === 'teachers' || l === 'teachers only') return 'Teachers Only';
  if (l === 'all' || l === 'all users') return 'All Users';
  return raw;
}

function rowToAnnouncement(row: any): Announcement {
  return {
    id: row.id,
    title: row.title || '',
    content: row.content || '',
    audience: normalizeAudience(row.target_role || row.scope || row.audience),
    courseName: row.course_name || undefined,
    batchName:
      (Array.isArray(row.batches) && row.batches.length ? row.batches.join(', ') : '') ||
      row.target_class ||
      row.batch_name ||
      undefined,
    section: row.section || undefined,
    priority: row.priority || 'Normal',
    publishDate: (row.date as string)?.split('T')[0] || (row.publish_date as string)?.split('T')[0] || (row.created_at as string)?.split('T')[0] || '',
    expiryDate: (row.expiry_date as string)?.split('T')[0] || (row.expires_at as string)?.split('T')[0] || '',
    status: row.status || 'Published',
    viewsCount: row.views_count || 0,
    author: row.sender_name || row.author || (row.sender_role ? `${row.sender_role}` : 'Administrator'),
  };
}

export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const [annRes, notifRes] = await Promise.all([
      supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('notifications')
        .select('title, message, read, read_at')
        .or('read.eq.true,read_at.not.is.null'),
    ]);

    const readNotifs = notifRes.data || [];

    if (!annRes.error && annRes.data) {
      cachedAnnouncements = annRes.data.map((row: any) => {
        const item = rowToAnnouncement(row);
        const cleanTitle = (item.title || '').trim().toLowerCase();
        let notifViews = 0;
        if (cleanTitle) {
          notifViews = readNotifs.filter((n: any) => {
            const nt = (n.title || '').replace(/^[\u{1F4E2}\s]+/u, '').trim().toLowerCase();
            return nt === cleanTitle || nt.includes(cleanTitle) || cleanTitle.includes(nt);
          }).length;
        }
        item.viewsCount = Math.max(Number(row.views_count) || 0, notifViews);
        return item;
      });
      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch announcements from Supabase:', err);
  }
  return cachedAnnouncements;
};

// Initial background fetch & Realtime subscription so teacher announcements appear instantly
whenSignedIn(() => {
  void fetchAnnouncements();
  try {
    supabase
      .channel('public:announcements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          void fetchAnnouncements();
        }
      )
      .subscribe();
  } catch (e) {
    console.error('Failed to subscribe to announcements realtime channel:', e);
  }
});

// Periodic fallback sync
if (typeof window !== 'undefined') {
  setInterval(() => {
    void fetchAnnouncements();
  }, 10000);
}

export function getAnnouncements(): Announcement[] {
  return cachedAnnouncements;
}

export function getAnnouncementById(id: string): Announcement | undefined {
  return cachedAnnouncements.find((a) => a.id === id);
}

/** Priority as stored in announcements (Urgent / High / Normal / Low). */
function toDbPriority(value?: string): string {
  const p = (value || 'normal').toLowerCase();
  return p === 'urgent' ? 'Urgent' : p === 'high' ? 'High' : p === 'low' ? 'Low' : 'Normal';
}

function toTargetRole(audience?: string): string {
  const a = (audience || 'all').toLowerCase();
  if (a.includes('teacher') || a.includes('faculty')) return 'teacher';
  if (a.includes('student') || a.includes('batch') || a.includes('course')) return 'student';
  return 'all';
}

/**
 * Publishes an announcement. "Specific Batch" targets the chosen global
 * batches; students of those batches see it (migration 060). Each recipient
 * also gets a notification row.
 */
export async function createAnnouncement(
  data: Omit<Announcement, 'id' | 'viewsCount'> & { batches?: string[] }
): Promise<Announcement> {
  const targetRole = toTargetRole(data.audience);
  const batches = data.batches || [];
  const { data: authResult } = await supabase.auth.getUser();

  const { data: row, error } = await supabase
    .from('announcements')
    .insert({
      sender_id: authResult?.user?.id || null,
      sender_name: 'Administrator',
      sender_role: 'Admin',
      title: data.title.trim(),
      content: data.content.trim(),
      priority: toDbPriority(data.priority),
      target_class: batches.length ? batches.join(', ') : data.courseName || 'All Students',
      target_role: targetRole,
      target_class_id: null,
      batches,
      date: data.publishDate ? new Date(data.publishDate).toISOString() : new Date().toISOString(),
      expiry_date: data.expiryDate ? new Date(data.expiryDate).toISOString() : null,
    })
    .select('*')
    .single();
  if (error || !row) throw new Error(`Could not publish the announcement: ${error?.message || 'no row saved'}`);

  // Notification rows for the recipients (students of the batches, or the role).
  let recipients: string[] = [];
  if (batches.length > 0) {
    const { data: students } = await supabase.from('student_profiles').select('user_id').in('batch_name', batches);
    recipients = (students || []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
  } else {
    const roles = targetRole === 'all' ? ['teacher', 'student'] : [targetRole];
    const { data: users } = await supabase.from('profiles').select('id').in('role', roles);
    recipients = (users || []).map((u: { id: string }) => u.id);
  }
  if (recipients.length > 0) {
    const { error: notifError } = await supabase.from('notifications').insert(
      recipients.map((userId) => ({
        user_id: userId,
        title: `📢 ${data.title.trim()}`,
        message: data.content.trim().substring(0, 500),
        type: 'announcement',
        audience: targetRole,
        priority: toDbPriority(data.priority),
        read: false,
        created_by: authResult?.user?.id || null,
      }))
    );
    if (notifError) console.error('Announcement saved, but notifications failed:', notifError.message);
  }

  logActivity({
    actor: data.author || 'Administrator',
    role: 'Super Admin',
    module: 'announcements',
    action: 'CREATE',
    entity: 'Announcement',
    description: `Published announcement "${data.title}" to [${batches.length ? batches.join(', ') : data.audience}]`,
  });

  await fetchAnnouncements();
  return rowToAnnouncement(row);
}

export async function updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.priority !== undefined) payload.priority = toDbPriority(updates.priority);
  if (updates.audience !== undefined) payload.target_role = toTargetRole(updates.audience);
  if (updates.expiryDate !== undefined) payload.expiry_date = updates.expiryDate ? new Date(updates.expiryDate).toISOString() : null;

  const { data, error } = await supabase.from('announcements').update(payload).eq('id', id).select('*');
  if (error) throw new Error(`Could not update the announcement: ${error.message}`);
  if (!data || data.length === 0) throw new Error('The announcement was not found.');

  logActivity({
    actor: 'Administrator',
    role: 'Super Admin',
    module: 'announcements',
    action: 'UPDATE',
    entity: 'Announcement',
    description: `Updated announcement: "${updates.title || data[0].title}"`,
  });
  await fetchAnnouncements();
  return rowToAnnouncement(data[0]);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const ann = cachedAnnouncements.find((a) => a.id === id);
  const { data, error } = await supabase.from('announcements').delete().eq('id', id).select('id');
  if (error) throw new Error(`Could not delete the announcement: ${error.message}`);
  if (!data || data.length === 0) throw new Error('The announcement was not found.');

  logActivity({
    actor: 'Administrator',
    role: 'Super Admin',
    module: 'announcements',
    action: 'DELETE',
    entity: 'Announcement',
    description: `Deleted announcement: "${ann?.title || id}"`,
  });
  await fetchAnnouncements();
}

export const announcementService = {
  getAnnouncements,
  fetchAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  onChange(cb: () => void): () => void {
    listeners.push(cb);
    return () => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
};
