import { whenSignedIn } from '../lib/supabase';
import { supabaseAny as supabase } from '../lib/supabase';
import { CalendarEvent } from '../types';

let cachedEvents: CalendarEvent[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_calendar_events_changed'));
  }
}

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  try {
    // 1. Pull custom calendar events from public.calendar_events
    const { data: customEvents, error: calErr } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_date', { ascending: true });

    if (!calErr && customEvents) {
      customEvents.forEach((e: any) => {
        const rawDate = (e.start_date || e.date || '').split('T')[0];
        events.push({
          id: e.id,
          title: e.title || 'Event',
          type: (e.type || e.event_type || 'Event') as CalendarEvent['type'],
          startDate: rawDate || '',
          endDate: e.end_date ? String(e.end_date).split('T')[0] : undefined,
          startTime: e.start_time || undefined,
          endTime: e.end_time || undefined,
          location: e.location || e.room || undefined,
          courseName: e.course_name || undefined,
          batchName: e.batch_name || undefined,
          description: e.description || undefined,
          targetLink: e.target_link || undefined,
        });
      });
    }

    // 2. Pull live classes as Class events
    const { data: classes } = await supabase
      .from('live_classes')
      .select('id, title, scheduled_date, date, start_time, end_time, status, room, location, platform')
      .order('scheduled_date', { ascending: true })
      .limit(100);

    (classes || []).forEach((c: any) => {
      const classDate = (c.scheduled_date || c.date || '').split('T')[0];
      events.push({
        id: `lc-${c.id}`,
        title: c.title || 'Live Class',
        type: 'Class',
        startDate: classDate || '',
        startTime: c.start_time || undefined,
        endTime: c.end_time || undefined,
        location: c.location || c.room || c.platform || undefined,
        description: c.status || '',
      });
    });

    // 3. Pull assessments as Exam events
    const { data: assessments } = await supabase
      .from('assessments')
      .select('id, title, start_date, end_date, status')
      .order('created_at', { ascending: false })
      .limit(100);

    (assessments || []).forEach((a: any) => {
      const startTime = a.start_date || a.start_at || '';
      const endTime = a.end_date || a.end_at || '';
      events.push({
        id: `ass-${a.id}`,
        title: a.title || 'Assessment',
        type: 'Exam',
        startDate: startTime.split('T')[0] || '',
        endDate: endTime.split('T')[0] || undefined,
        startTime: startTime.includes('T') ? startTime.split('T')[1].slice(0, 5) : undefined,
      });
    });

    cachedEvents = events.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    notifyChange();
  } catch (err) {
    console.error('Failed to fetch calendar events from Supabase:', err);
  }

  return cachedEvents;
}

// Initial background fetch & Realtime subscription
whenSignedIn(() => {
  void fetchCalendarEvents();

  try {
    supabase
      .channel('public:calendar_events_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        () => {
          void fetchCalendarEvents();
        }
      )
      .subscribe();
  } catch (e) {
    console.error('Failed to subscribe to calendar_events realtime:', e);
  }
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'dudex_calendar_sync') {
      void fetchCalendarEvents();
    }
  });
}

export function getCalendarEvents(): CalendarEvent[] {
  return cachedEvents;
}

export async function createCalendarEvent(data: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const newId = crypto.randomUUID();
  const newEvent: CalendarEvent = { ...data, id: newId };
  cachedEvents = [newEvent, ...cachedEvents].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  notifyChange();

  try {
    const { data: authResult } = await supabase.auth.getUser();
    const payload = {
      id: newId,
      title: data.title.trim(),
      description: data.description || null,
      type: data.type,
      event_type: data.type.toLowerCase(),
      start_date: data.startDate,
      end_date: data.endDate || data.startDate,
      start_time: data.startTime || null,
      end_time: data.endTime || null,
      location: data.location || null,
      room: data.location || null,
      course_name: data.courseName || null,
      batch_name: data.batchName || null,
      target_link: data.targetLink || null,
      target_role: 'all',
      created_by: authResult?.user?.id || null,
    };

    const { error } = await supabase.from('calendar_events').insert(payload);
    if (error) {
      console.warn('Could not persist calendar_event to Supabase:', error.message);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('dudex_calendar_events_changed'));
      try {
        localStorage.setItem('dudex_calendar_sync', Date.now().toString());
      } catch {}
    }
  } catch (err) {
    console.error('Failed to create calendar event in Supabase:', err);
  }

  return newEvent;
}

export async function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
  const idx = cachedEvents.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  cachedEvents[idx] = { ...cachedEvents[idx], ...updates };
  notifyChange();

  try {
    const payload: Record<string, any> = {};
    if (updates.title) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.type) {
      payload.type = updates.type;
      payload.event_type = updates.type.toLowerCase();
    }
    if (updates.startDate) payload.start_date = updates.startDate;
    if (updates.endDate !== undefined) payload.end_date = updates.endDate;
    if (updates.startTime !== undefined) payload.start_time = updates.startTime;
    if (updates.endTime !== undefined) payload.end_time = updates.endTime;
    if (updates.location !== undefined) {
      payload.location = updates.location;
      payload.room = updates.location;
    }
    if (updates.courseName !== undefined) payload.course_name = updates.courseName;
    if (updates.batchName !== undefined) payload.batch_name = updates.batchName;

    await supabase.from('calendar_events').update(payload).eq('id', id);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('dudex_calendar_events_changed'));
      try {
        localStorage.setItem('dudex_calendar_sync', Date.now().toString());
      } catch {}
    }
  } catch (err) {
    console.error('Failed to update calendar event in Supabase:', err);
  }

  return cachedEvents[idx];
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  const initialLen = cachedEvents.length;
  cachedEvents = cachedEvents.filter((e) => e.id !== id);
  if (cachedEvents.length !== initialLen) {
    notifyChange();
  }

  try {
    await supabase.from('calendar_events').delete().eq('id', id);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('dudex_calendar_events_changed'));
      try {
        localStorage.setItem('dudex_calendar_sync', Date.now().toString());
      } catch {}
    }
  } catch (err) {
    console.error('Failed to delete calendar event in Supabase:', err);
  }

  return true;
}

export const calendarService = {
  getCalendarEvents,
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  onChange(cb: () => void): () => void {
    listeners.push(cb);
    return () => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
};
