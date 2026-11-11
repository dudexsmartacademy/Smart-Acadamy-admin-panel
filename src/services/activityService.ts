import { whenSignedIn } from '../lib/supabase';
import { supabaseAny } from '../lib/supabase';
import { ActivityLog } from '../types';

let cachedLogs: ActivityLog[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_activity_logs_changed'));
  }
}

export const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
  try {
    const { data, error } = await supabaseAny
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      cachedLogs = data.map((row: any) => ({
        id: row.id,
        timestamp: row.created_at || new Date().toISOString(),
        adminName: row.actor_name || row.user_id || 'Administrator',
        action: row.action || row.operation || '',
        module: (row.table_name || row.module || 'system') as ActivityLog['module'],
        entity: row.entity || row.record_id || '',
        description: row.description || row.action || '',
        ipAddress: row.ip_address || '',
      }));
      notifyChange();
    }
  } catch (err) {
    console.error('Failed to fetch activity logs from Supabase:', err);
  }
  return cachedLogs;
};

// Initial background fetch
whenSignedIn(fetchActivityLogs);

export const getActivityLogs = (): ActivityLog[] => {
  return cachedLogs;
};

export const logActivity = (params: {
  action: string;
  module?: string;
  user?: string;
  actor?: string;
  entity?: string;
  details?: string;
  description?: string;
  timestamp?: string;
  status?: string;
  role?: string;
}): ActivityLog => {
  const newLog: ActivityLog = {
    id: crypto.randomUUID(),
    timestamp: params.timestamp || new Date().toISOString(),
    adminName: params.actor || params.user || 'Administrator',
    action: params.action,
    module: (params.module as any) || 'system',
    entity: params.entity || params.action,
    description: params.details || params.description || params.action,
    ipAddress: '',
  };

  cachedLogs = [newLog, ...cachedLogs];
  notifyChange();

  // Async persist to Supabase (silently skips if table doesn't exist)
  supabaseAny
    .from('activity_logs')
    .insert({
      action: params.action,
      entity: params.entity || params.action,
      description: params.details || params.description || params.action,
      module: params.module || 'system',
    })
    .then(null, () => { /* silently ignore - table may not exist */ });

  return newLog;
};

export const activityService = {
  getLogs: getActivityLogs,
  fetchLogs: fetchActivityLogs,
  log(
    action: string,
    module: ActivityLog['module'],
    entity: string,
    description: string,
    adminName = 'Administrator'
  ): ActivityLog {
    return logActivity({
      action,
      module,
      user: adminName,
      details: description,
    });
  },
  clearLogs(): void {
    cachedLogs = [];
    notifyChange();
  },
  onChange(cb: () => void): () => void {
    listeners.push(cb);
    return () => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
};
