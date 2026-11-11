import { whenSignedIn } from '../lib/supabase';
import { isSupabaseConfigured, supabaseAny as supabase } from '../lib/supabase';
import { Teacher, TeacherStatus } from '../types';
import { activityService } from './activityService';
import {
  teacherInvitationService,
  toAccessDelivery,
  type TeacherAccessDelivery,
} from './teacherInvitationService';

let cachedTeachers: Teacher[] = [];
const listeners: Array<() => void> = [];

function clearLegacyFacultyCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'dudex_faculty_creds=; path=/; max-age=0; SameSite=Lax';
}

clearLegacyFacultyCookie();

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_teachers_changed'));
  }
}

function isUuid(value?: string): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function rowToTeacher(row: any): Teacher {
  const prof = row.profiles || {};
  const rawStatus = typeof row.status === 'string' ? row.status.toLowerCase() : '';
  const status: TeacherStatus =
    rawStatus === 'active' || rawStatus === 'on-leave' || rawStatus === 'suspended'
      ? rawStatus
      : 'unknown';

  return {
    id: row.id,
    userId: row.user_id || prof.id,
    teacherId: row.faculty_id || row.id || '',
    fullName: prof.full_name || '',
    avatar: prof.avatar_url || undefined,
    email: prof.email || '',
    phone: prof.phone || '',
    dob: row.date_of_birth || undefined,
    gender: row.gender || undefined,
    address: row.address || undefined,
    department: row.department || '',
    designation: row.designation || '',
    qualification: row.qualification || '',
    experienceYears: typeof row.experience_years === 'number' ? row.experience_years : undefined,
    joiningDate: row.joining_date || undefined,
    employmentType: row.employment_type || undefined,
    primarySubject: row.primary_subject || undefined,
    skills: Array.isArray(row.skills) ? row.skills : undefined,
    bio: row.bio || undefined,
    linkedinUrl: row.linkedin_url || undefined,
    githubUrl: row.github_url || undefined,
    portfolioUrl: row.portfolio_url || undefined,
    notes: row.notes || undefined,
    loginEmail: prof.email || '',
    status,
    assignedCourseIds: [],
    assignedClassIds: [],
    totalStudentsHandled: typeof row.total_students_handled === 'number' ? row.total_students_handled : undefined,
    attendanceRate: typeof row.attendance_rate === 'number' ? row.attendance_rate : undefined,
    rating: typeof row.rating === 'number' ? row.rating : undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export const fetchTeachers = async (): Promise<Teacher[]> => {
  try {
    const { data, error } = await supabase
      .from('teacher_profiles')
      .select(`
        *,
        profiles(full_name, email, phone, avatar_url)
      `)
      .order('updated_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      const remoteTeachers = data.map(rowToTeacher);
      cachedTeachers = remoteTeachers;
      notifyChange();
    } else {
      cachedTeachers = [];
      notifyChange();
      if (error) console.error('Failed to fetch teachers from Supabase:', error.message);
    }
  } catch (err) {
    cachedTeachers = [];
    notifyChange();
    console.error('Failed to fetch teachers from Supabase:', err);
  }
  return cachedTeachers;
};

// Initial background fetch
whenSignedIn(fetchTeachers);

export const getTeachers = (): Teacher[] => cachedTeachers;

export const teacherService = {
  fetchTeachers,

  getTeachers(): Teacher[] {
    return cachedTeachers;
  },

  getTeacherById(id: string): Teacher | undefined {
    if (!id) return undefined;
    const clean = id.trim().toLowerCase();
    return cachedTeachers.find(
      (t) =>
        t.id?.toLowerCase() === clean ||
        t.teacherId?.toLowerCase() === clean ||
        t.userId?.toLowerCase() === clean ||
        t.tempId?.toLowerCase() === clean
    );
  },

  async createTeacher(
    data: Pick<
      Teacher,
      'teacherId' | 'fullName' | 'email' | 'department' | 'designation' | 'qualification'
    > &
      Partial<Pick<Teacher, 'phone' | 'avatar'>> & { departmentId?: string }
  ): Promise<Teacher & { access: TeacherAccessDelivery }> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    const email = data.email.trim().toLowerCase();
    const { data: account, error: accountError } = await supabase
      .from('profiles')
      .select('id, role')
      .ilike('email', email)
      .maybeSingle();
    if (accountError) {
      throw new Error(`Could not look up the teacher account: ${accountError.message}`);
    }
    if (account?.role === 'admin') {
      throw new Error('An administrator account cannot be provisioned as a teacher.');
    }

    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .select('id, name, code');
    if (departmentsError) {
      throw new Error(`Could not load departments: ${departmentsError.message}`);
    }
    const normalizedDepartment = data.department.trim().toLowerCase();
    const matches = (departments || []).filter(
      (department: { id: string; name: string; code?: string | null }) =>
        data.departmentId
          ? department.id === data.departmentId
          : department.name.trim().toLowerCase() === normalizedDepartment ||
            department.code?.trim().toLowerCase() === normalizedDepartment
    );
    if (matches.length !== 1) {
      throw new Error(
        matches.length === 0
          ? 'The selected department is not configured in the database.'
          : 'The department matches multiple colleges. Select a unique department before provisioning.'
      );
    }

    const invitation = await teacherInvitationService.inviteTeacher({
      email,
      full_name: data.fullName.trim(),
      faculty_id: data.teacherId.trim(),
      department_id: matches[0].id,
      designation: data.designation.trim(),
      phone: data.phone?.trim() || null,
      qualification: data.qualification.trim() || null,
      avatar_url: data.avatar?.startsWith('data:') ? null : data.avatar || null,
    });
    if (!invitation.teacher_profile_id) {
      throw new Error('Teacher was invited, but the Edge Function returned no teacher profile ID.');
    }

    const { data: createdRow, error: createdReadError } = await supabase
      .from('teacher_profiles')
      .select(`
        *,
        profiles(full_name, email, phone, avatar_url)
      `)
      .eq('id', invitation.teacher_profile_id)
      .maybeSingle();
    if (createdReadError || !createdRow) {
      throw new Error(
        `Teacher account was provisioned, but its database record could not be loaded: ${
          createdReadError?.message || 'No teacher record was returned.'
        }`
      );
    }

    if (data.avatar?.startsWith('data:') && createdRow.user_id) {
      const { error: avatarError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.avatar })
        .eq('id', createdRow.user_id);
      if (avatarError) {
        throw new Error(
          `Teacher account was invited and provisioned, but the profile photo could not be saved: ${avatarError.message}`
        );
      }
    }

    const newTeacher = rowToTeacher(createdRow);
    if (data.avatar?.startsWith('data:')) {
      newTeacher.avatar = data.avatar;
    }
    cachedTeachers = [newTeacher, ...cachedTeachers.filter((teacher) => teacher.id !== newTeacher.id)];
    notifyChange();

    activityService.log(
      'Teacher Created',
      'teachers',
      newTeacher.fullName,
      `Added new faculty member ${newTeacher.fullName} (${newTeacher.teacherId}) to ${newTeacher.department}`
    );

    return { ...newTeacher, access: toAccessDelivery(email, invitation) };
  },

  async resendTeacherSetupEmail(email: string): Promise<TeacherAccessDelivery> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    return teacherInvitationService.resendSetupEmail(email);
  },

  updateTeacherLocal(id: string, updates: Partial<Teacher>): Teacher | null {
    const index = cachedTeachers.findIndex((t) => t.id === id || t.teacherId === id);
    if (index === -1) return null;

    const updatedTeacher: Teacher = {
      ...cachedTeachers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    cachedTeachers[index] = updatedTeacher;
    notifyChange();

    activityService.log(
      'Teacher Updated',
      'teachers',
      updatedTeacher.fullName,
      `Updated faculty profile details for ${updatedTeacher.fullName} (${updatedTeacher.teacherId})`
    );

    return updatedTeacher;
  },

  async updateTeacherRecord(
    id: string,
    updates: Partial<Teacher>
  ): Promise<Teacher | null> {
    const index = cachedTeachers.findIndex((teacher) => teacher.id === id || teacher.teacherId === id);
    if (index === -1) return null;

    const currentTeacher = cachedTeachers[index];
    const updatedTeacher: Teacher = {
      ...currentTeacher,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (
      updates.email !== undefined &&
      updates.email.trim().toLowerCase() !== currentTeacher.email.trim().toLowerCase()
    ) {
      throw new Error(
        'Email changes must use a verified Supabase Auth update flow; the profile email was not changed.'
      );
    }

    const teacherPayload: {
      designation?: string;
      department?: string;
      qualification?: string;
      status?: 'active' | 'on-leave' | 'suspended';
    } = {};
    if (updates.designation !== undefined) teacherPayload.designation = updates.designation;
    if (updates.department !== undefined) teacherPayload.department = updates.department;
    if (updates.qualification !== undefined) {
      teacherPayload.qualification = updates.qualification;
    }
    if (updates.status !== undefined) {
      if (
        updates.status !== 'active' &&
        updates.status !== 'on-leave' &&
        updates.status !== 'suspended'
      ) {
        throw new Error('The selected teacher status is not supported by the database.');
      }
      teacherPayload.status = updates.status;
    }

    const profilePayload: {
      full_name?: string;
      phone?: string | null;
      avatar_url?: string | null;
    } = {};
    if (updates.fullName !== undefined) profilePayload.full_name = updates.fullName;
    if (updates.phone !== undefined) profilePayload.phone = updates.phone || null;
    if (updates.avatar !== undefined) profilePayload.avatar_url = updates.avatar || null;

    const hasTeacherUpdates = Object.keys(teacherPayload).length > 0;
    const hasProfileUpdates = Object.keys(profilePayload).length > 0;
    if (!hasTeacherUpdates && !hasProfileUpdates) {
      return this.updateTeacherLocal(id, updates);
    }
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured; teacher changes were not saved.');
    }

    const targetId = isUuid(id)
      ? id
      : isUuid(updatedTeacher.id)
        ? updatedTeacher.id
        : updatedTeacher.userId;
    const profileUserId = isUuid(updatedTeacher.userId)
      ? updatedTeacher.userId
      : null;
    if ((hasTeacherUpdates && !isUuid(targetId)) ||
        (hasProfileUpdates && !profileUserId)) {
      throw new Error('This teacher is not linked to a database account and cannot be updated.');
    }

    if (hasTeacherUpdates) {
      const { data, error } = await supabase
        .from('teacher_profiles')
        .update(teacherPayload)
        .or(`id.eq.${targetId},user_id.eq.${targetId}`)
        .select('id')
        .maybeSingle();
      if (error) throw new Error(`Could not save teacher details: ${error.message}`);
      if (!data) throw new Error('The teacher record was not updated. Reload and try again.');
    }

    if (hasProfileUpdates) {
      if (!profileUserId) {
        throw new Error('This teacher is not linked to a database account and cannot be updated.');
      }
      const { data, error } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', profileUserId)
        .select('id')
        .maybeSingle();
      if (error) {
        throw new Error(
          hasTeacherUpdates
            ? `Teacher details were saved, but account profile changes failed: ${error.message}. Reload before retrying.`
            : `Could not save account profile changes: ${error.message}`
        );
      }
      if (!data) {
        throw new Error(
          hasTeacherUpdates
            ? 'Teacher details were saved, but the account profile was not updated. Reload before retrying.'
            : 'The account profile was not updated. Reload and try again.'
        );
      }
    }

    cachedTeachers[index] = updatedTeacher;
    notifyChange();
    activityService.log(
      'Teacher Updated',
      'teachers',
      updatedTeacher.fullName,
      `Updated faculty profile details for ${updatedTeacher.fullName} (${updatedTeacher.teacherId})`
    );
    return updatedTeacher;
  },

  async setTeacherStatus(
    id: string,
    status: TeacherStatus
  ): Promise<Teacher | null> {
    return this.updateTeacherRecord(id, { status });
  },

  generateNextTeacherId(): string {
    const count = cachedTeachers.length + 1;
    const year = new Date().getFullYear();
    return `TCH-${year}-${String(count).padStart(3, '0')}`;
  },

  onTeachersChange(cb: () => void): () => void {
    listeners.push(cb);
    return () => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  onChange(cb: () => void): () => void {
    return this.onTeachersChange(cb);
  },
};
