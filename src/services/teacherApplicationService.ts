import { whenSignedIn } from '../lib/supabase';
import { writeFailure, writeResult } from '../lib/persist';
import { supabaseAny } from '../lib/supabase';
import { TeacherApplication, ApplicationStatus, Teacher } from '../types';
import { activityService } from './activityService';
import { teacherService } from './teacherService';

let cachedApplications: TeacherApplication[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_teacher_applications_changed'));
  }
}

function rowToApplication(row: any): TeacherApplication {
  return {
    id: row.id,
    applicationNumber: row.application_number || `TAPP-${row.id?.substring(0, 8)}`,
    fullName: row.full_name || row.name || 'Applicant',
    email: row.email || '',
    phone: row.phone || '',
    dob: row.dob || row.date_of_birth || undefined,
    gender: row.gender || undefined,
    address: row.address || undefined,
    department: row.department || '',
    qualification: row.qualification || '',
    experienceYears: Number(row.experience_years || 0),
    requestedSubject: row.requested_subject || row.subject || '',
    skills: Array.isArray(row.skills) ? row.skills : (row.skills ? [row.skills] : []),
    resumeUrl: row.resume_url || undefined,
    portfolioUrl: row.portfolio_url || undefined,
    coverLetter: row.cover_letter || undefined,
    status: (row.status as ApplicationStatus) || 'pending',
    appliedDate: row.applied_date || row.created_at?.split('T')[0] || '',
    reviewedDate: row.reviewed_at || row.reviewed_date || undefined,
    reviewerNotes: row.reviewer_notes || undefined,
    convertedTeacherId: row.converted_teacher_id || undefined,
  };
}

export const fetchTeacherApplications = async (): Promise<TeacherApplication[]> => {
  try {
    const { data, error } = await supabaseAny
      .from('teacher_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      cachedApplications = data.map(rowToApplication);
      notifyChange();
    } else if (error) {
      console.warn('teacherApplicationService: Could not fetch teacher_applications:', error.message);
    }
  } catch (err) {
    console.error('Failed to fetch teacher applications from Supabase:', err);
  }
  return cachedApplications;
};

// Initial background fetch
whenSignedIn(fetchTeacherApplications);

export const subscribeTeacherApplications = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const teacherApplicationService = {
  getApplications(): TeacherApplication[] {
    return cachedApplications;
  },

  fetchApplications: fetchTeacherApplications,

  getApplicationById(id: string): TeacherApplication | undefined {
    return cachedApplications.find((a) => a.id === id || a.applicationNumber === id);
  },

  createApplication(data: Partial<TeacherApplication>): TeacherApplication {
    const count = cachedApplications.length + 1;
    const year = new Date().getFullYear();
    const newApp: TeacherApplication = {
      id: crypto.randomUUID(),
      applicationNumber: `TAPP-${year}-${String(count).padStart(3, '0')}`,
      fullName: data.fullName || 'New Applicant',
      email: data.email || '',
      phone: data.phone || '',
      department: data.department || '',
      qualification: data.qualification || '',
      experienceYears: data.experienceYears || 0,
      requestedSubject: data.requestedSubject || '',
      skills: data.skills || [],
      status: 'pending',
      appliedDate: new Date().toISOString().split('T')[0],
      ...data,
    };

    cachedApplications = [newApp, ...cachedApplications];
    notifyChange();

    supabaseAny
      .from('teacher_applications')
      .insert({
        id: newApp.id,
        application_number: newApp.applicationNumber,
        full_name: newApp.fullName,
        email: newApp.email,
        phone: newApp.phone,
        department: newApp.department,
        qualification: newApp.qualification,
        experience_years: newApp.experienceYears,
        requested_subject: newApp.requestedSubject,
        skills: newApp.skills,
        cover_letter: newApp.coverLetter || null,
        portfolio_url: newApp.portfolioUrl || null,
        status: 'pending',
      })
      .then(writeResult('Saving the teacher application'), (err: any) => {
        console.warn('teacherApplicationService: insert failed:', err?.message);
      });

    activityService.log(
      'Application Submitted',
      'applications',
      newApp.fullName,
      `New teacher application from ${newApp.fullName} for ${newApp.department}`
    );

    return newApp;
  },

  updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    reviewerNotes?: string
  ): TeacherApplication | null {
    const index = cachedApplications.findIndex((a) => a.id === id || a.applicationNumber === id);
    if (index === -1) return null;

    const current = cachedApplications[index];
    const updated: TeacherApplication = {
      ...current,
      status,
      reviewedDate: new Date().toISOString(),
      reviewerNotes: reviewerNotes || current.reviewerNotes,
    };

    cachedApplications[index] = updated;
    notifyChange();

    supabaseAny
      .from('teacher_applications')
      .update({
        status,
        reviewer_notes: reviewerNotes || null,
      })
      .eq('id', current.id)
      .then(writeResult('Updating the teacher application'), (err: any) => {
        console.warn('teacherApplicationService: update failed:', err?.message);
      });

    activityService.log(
      `Application Status ${status.toUpperCase()}`,
      'applications',
      updated.fullName,
      `Updated application ${updated.applicationNumber} for ${updated.fullName} to "${status}"`
    );

    return updated;
  },

  async convertToTeacher(
    applicationId: string,
    additionalDetails?: Partial<Teacher>
  ): Promise<{ teacher: Teacher; application: TeacherApplication } | null> {
    const app = this.getApplicationById(applicationId);
    if (!app) return null;

    const newTeacherId = teacherService.generateNextTeacherId();
    const createdTeacher = await teacherService.createTeacher({
      teacherId: newTeacherId,
      fullName: app.fullName,
      email: app.email,
      phone: app.phone,
      dob: app.dob || '1990-01-01',
      gender: app.gender || 'male',
      address: app.address || 'Campus Faculty Residence',
      department: app.department,
      designation: 'Assistant Professor',
      qualification: app.qualification,
      experienceYears: app.experienceYears,
      joiningDate: new Date().toISOString().split('T')[0],
      employmentType: 'full-time',
      primarySubject: app.requestedSubject,
      skills: app.skills || [],
      bio: app.coverLetter || '',
      portfolioUrl: app.portfolioUrl,
      loginEmail: app.email,
      status: 'active',
      ...additionalDetails,
    });

    const updatedApp = this.updateApplicationStatus(app.id, 'converted', `Converted to faculty account (${newTeacherId})`);

    activityService.log(
      'Applicant Converted to Faculty',
      'applications',
      app.fullName,
      `Converted application ${app.applicationNumber} to Faculty ${createdTeacher.fullName} (${newTeacherId})`
    );

    return { teacher: createdTeacher, application: updatedApp || app };
  },

  deleteApplication(id: string): boolean {
    const target = cachedApplications.find(a => a.id === id);
    if (!target) return false;

    cachedApplications = cachedApplications.filter((a) => a.id !== id);
    notifyChange();

    supabaseAny.from('teacher_applications').delete().eq('id', id).then(writeResult('Deleting the teacher application'), writeFailure('Deleting the teacher application'));
    return true;
  },

  subscribe: subscribeTeacherApplications,
};
