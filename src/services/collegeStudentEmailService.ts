import { isSupabaseConfigured, supabaseAny as supabase } from '../lib/supabase';

export interface CollegeStudentEmail {
  id: string;
  collegeId: string;
  collegeName: string;
  email: string;
  studentName?: string;
  studentId?: string;
  department?: string;
  batchName?: string;
  uploadedAt: string;
  sourceFileName?: string;
  status: 'Active' | 'Inactive' | 'Verified' | 'Pending';
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface RosterRow {
  id: string;
  college_id: string;
  college_name: string;
  email: string;
  student_name: string | null;
  student_id: string | null;
  department: string | null;
  batch_name?: string | null;
  source_file_name: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

function mapRosterRow(row: RosterRow): CollegeStudentEmail {
  return {
    id: row.id,
    collegeId: row.college_id,
    collegeName: row.college_name,
    email: row.email,
    studentName: row.student_name || undefined,
    studentId: row.student_id || undefined,
    department: row.department || undefined,
    batchName: row.batch_name || undefined,
    uploadedAt: row.created_at,
    sourceFileName: row.source_file_name || undefined,
    status: row.status === 'active' ? 'Active' : 'Inactive',
  };
}

function assertConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set the required Vite environment variables.');
  }
}

// Roster rows reference colleges.id, so only colleges saved in Supabase work.
function assertSavedCollege(collegeId: string): void {
  if (!UUID_PATTERN.test(collegeId)) {
    throw new Error(
      'This college is not saved in the database yet. Re-create it under Academic Setup with a unique college code, then try again.',
    );
  }
}

async function fetchRosterRows(
  query: PromiseLike<{ data: RosterRow[] | null; error: { message: string } | null }>,
): Promise<CollegeStudentEmail[]> {
  const { data, error } = await query;
  if (error) {
    throw new Error(`Could not load the student email roster: ${error.message}`);
  }
  return (data || []).map((row: RosterRow) => mapRosterRow(row));
}

export const collegeStudentEmailService = {
  async getAllEmails(): Promise<CollegeStudentEmail[]> {
    assertConfigured();
    return fetchRosterRows(
      supabase.from('student_email_roster').select('*').order('created_at', { ascending: false }),
    );
  },

  async getEmailsByCollege(
    collegeId: string,
    _collegeName?: string,
  ): Promise<CollegeStudentEmail[]> {
    assertConfigured();
    if (!UUID_PATTERN.test(collegeId)) return [];
    const query = supabase
      .from('student_email_roster')
      .select('*')
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });
    return fetchRosterRows(query);
  },

  async isEmailRegistered(email: string): Promise<boolean> {
    assertConfigured();
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) return false;

    const { data, error } = await supabase
      .from('student_email_roster')
      .select('id')
      .eq('email', cleanEmail)
      .eq('status', 'active')
      .maybeSingle();
    if (error) {
      throw new Error(`Could not check the student email roster: ${error.message}`);
    }
    return Boolean(data);
  },

  async addEmails(
    collegeId: string,
    collegeName: string,
    items: {
      email: string;
      studentName?: string;
    }[],
    sourceFileName = 'Uploaded File',
    batchName?: string,
  ): Promise<{
    addedCount: number;
    duplicateCount: number;
    invalidCount: number;
    newRecords: CollegeStudentEmail[];
  }> {
    assertConfigured();
    assertSavedCollege(collegeId);
    const validByEmail = new Map<string, (typeof items)[number]>();
    let duplicateCount = 0;
    let invalidCount = 0;

    for (const item of items) {
      const email = item.email.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) {
        invalidCount++;
      } else if (validByEmail.has(email)) {
        duplicateCount++;
      } else {
        validByEmail.set(email, item);
      }
    }

    const emails = [...validByEmail.keys()];
    const existingEmails = new Set<string>();
    for (let index = 0; index < emails.length; index += 500) {
      const chunk = emails.slice(index, index + 500);
      const { data, error } = await supabase
        .from('student_email_roster')
        .select('email')
        .in('email', chunk);
      if (error) {
        throw new Error(`Could not check for existing roster entries: ${error.message}`);
      }
      for (const row of data || []) existingEmails.add(row.email);
    }

    const newRows = emails
      .filter((email) => !existingEmails.has(email))
      .map((email) => {
        const item = validByEmail.get(email)!;
        return {
          college_id: collegeId,
          college_name: collegeName.trim(),
          email,
          student_name: item.studentName?.trim() || null,
          // Student ID and department are entered by the student at registration.
          student_id: null,
          department: null,
          // Batch is assigned by the admin; registration uses it as-is.
          batch_name: batchName?.trim() || null,
          source_file_name: sourceFileName,
          status: 'active',
        };
      });
    duplicateCount += emails.length - newRows.length;

    const insertedRows: RosterRow[] = [];
    for (let index = 0; index < newRows.length; index += 500) {
      const { data, error } = await supabase
        .from('student_email_roster')
        .insert(newRows.slice(index, index + 500))
        .select('*');
      if (error) {
        throw new Error(`Could not save student email roster entries: ${error.message}`);
      }
      insertedRows.push(...(data || []));
    }

    return {
      addedCount: insertedRows.length,
      duplicateCount,
      invalidCount,
      newRecords: insertedRows.map((row) => mapRosterRow(row)),
    };
  },

  async addSingleEmail(
    collegeId: string,
    collegeName: string,
    email: string,
    studentName?: string,
    batchName?: string,
  ): Promise<{ success: boolean; message: string; record?: CollegeStudentEmail }> {
    const result = await this.addEmails(
      collegeId,
      collegeName,
      [{ email, studentName }],
      'Manual Entry',
      batchName,
    );
    if (result.newRecords[0]) {
      return {
        success: true,
        message: 'Student mail ID added successfully.',
        record: result.newRecords[0],
      };
    }
    if (result.duplicateCount > 0) {
      return { success: false, message: 'This email is already registered.' };
    }
    return { success: false, message: 'Invalid email address format.' };
  },

  async deleteEmail(id: string): Promise<void> {
    assertConfigured();
    const { error } = await supabase.from('student_email_roster').delete().eq('id', id);
    if (error) throw new Error(`Could not delete the roster entry: ${error.message}`);
  },

  async deleteEmails(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    assertConfigured();
    const { error } = await supabase.from('student_email_roster').delete().in('id', ids);
    if (error) throw new Error(`Could not delete the selected roster entries: ${error.message}`);
  },

  async clearEmailsByCollege(collegeId: string): Promise<void> {
    assertConfigured();
    assertSavedCollege(collegeId);
    const { error } = await supabase
      .from('student_email_roster')
      .delete()
      .eq('college_id', collegeId);
    if (error) throw new Error(`Could not clear the college roster: ${error.message}`);
  },

  async exportToCSV(collegeId: string): Promise<string> {
    const list = await this.getEmailsByCollege(collegeId);
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const headers = ['Email', 'Student Name', 'Batch', 'Uploaded Date', 'Status'];
    const rows = list.map((item) => [
      item.email,
      item.studentName || '',
      item.batchName || '',
      new Date(item.uploadedAt).toLocaleDateString(),
      item.status,
    ]);
    return [headers, ...rows].map((row) => row.map(quote).join(',')).join('\n');
  },
};
