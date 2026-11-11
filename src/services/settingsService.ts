import { supabaseAny as supabase } from '../lib/supabase';
import { writeFailure, writeResult } from '../lib/persist';
import { SystemSettings, AdminProfile } from '../types';

const DEFAULT_SETTINGS: SystemSettings = {
  platformName: 'DUDEx Smart Academy',
  supportEmail: 'support@dudex.academy',
  contactPhone: '',
  timezone: 'Asia/Kolkata',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '12h',
  theme: 'dark',
  sidebarDefaultCollapsed: false,
  attendanceMinThreshold: 75,
  defaultPassingMarks: 40,
};

let cachedSettings: SystemSettings = { ...DEFAULT_SETTINGS };

export const settingsService = {
  getSettings(): SystemSettings {
    return cachedSettings;
  },

  async fetchSettings(): Promise<SystemSettings> {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .maybeSingle();

      if (!error && data) {
        cachedSettings = {
          ...DEFAULT_SETTINGS,
          platformName: (data as any).platform_name || DEFAULT_SETTINGS.platformName,
          supportEmail: (data as any).support_email || DEFAULT_SETTINGS.supportEmail,
          contactPhone: (data as any).contact_phone || '',
          timezone: (data as any).timezone || DEFAULT_SETTINGS.timezone,
          dateFormat: (data as any).date_format || DEFAULT_SETTINGS.dateFormat,
          timeFormat: (data as any).time_format || DEFAULT_SETTINGS.timeFormat,
          theme: (data as any).theme || DEFAULT_SETTINGS.theme,
          sidebarDefaultCollapsed: (data as any).sidebar_default_collapsed ?? false,
          attendanceMinThreshold: (data as any).attendance_min_threshold ?? 75,
          defaultPassingMarks: (data as any).default_passing_marks ?? 40,
        };
      }
    } catch (err) {
      console.error('Failed to fetch platform settings from Supabase:', err);
    }
    return cachedSettings;
  },

  updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    cachedSettings = { ...cachedSettings, ...partial };

    supabase
      .from('platform_settings')
      .upsert({
        platform_name: cachedSettings.platformName,
        support_email: cachedSettings.supportEmail,
        contact_phone: cachedSettings.contactPhone,
        sidebar_default_collapsed: cachedSettings.sidebarDefaultCollapsed,
        attendance_min_threshold: cachedSettings.attendanceMinThreshold,
      })
      .then(writeResult('Saving the settings'), writeFailure('Saving the settings'));

    return cachedSettings;
  },

  getAdminProfile(): AdminProfile {
    return {
      id: '',
      name: 'Administrator',
      email: '',
      phone: '',
      role: 'Super Admin',
      department: 'Administration',
      joinedDate: '',
      lastLogin: '',
      twoFactorEnabled: false,
    };
  },

  updateAdminProfile(partial: Partial<AdminProfile>): AdminProfile {
    return { ...this.getAdminProfile(), ...partial };
  },
};

// Initial background fetch
settingsService.fetchSettings();
