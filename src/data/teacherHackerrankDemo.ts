import { teacherService } from '../services/teacherService';
import { useEffect, useState } from 'react';
import { supabaseAny as supabase } from '../lib/supabase';

// Admin view of teachers' HackerRank challenges. Challenges are `assessments`
// rows with provider = 'hackerrank'; results are students' self-reported
// submissions (external_assessment_submissions) as verified by the teacher.
// The exported arrays are filled in place from Supabase by
// loadHackerRankData(); pages call useHackerRankData() to load and re-render.

export type HackerRankTeacher = {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  avatar?: string;
};

export type HackerRankChallenge = {
  id: string;
  teacherId: string;
  title: string;
  type: 'Coding' | 'MCQ' | 'Coding + MCQ';
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: number;
  duration: number;
  totalMarks: number;
  status: 'Draft' | 'Published' | 'Closed';
  createdAt: string;
  assessmentDate: string;
  startTime: string;
  targetBatch: string;
  assessmentUrl: string;
  description: string;
};

export type HackerRankResult = {
  id: string;
  challengeId: string;
  teacherId: string;
  studentName: string;
  registerNumber: string;
  className: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  status: 'Completed' | 'In Progress' | 'Not Attempted' | 'Submitted';
  submittedAt: string;
  attempt: number;
  batch: string;
  studentRemarks?: string;
  facultyRemarks?: string;
};

export const hackerRankTeachers: HackerRankTeacher[] = [];
export const hackerRankChallenges: HackerRankChallenge[] = [];
export const hackerRankResults: HackerRankResult[] = [];

const TYPE_FROM_DB: Record<string, HackerRankChallenge['type']> = { Coding: 'Coding', MCQ: 'MCQ', Hybrid: 'Coding + MCQ' };
const TYPE_TO_DB: Record<HackerRankChallenge['type'], string> = { Coding: 'Coding', MCQ: 'MCQ', 'Coding + MCQ': 'Hybrid' };
const gradeFor = (pct: number) =>
  pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
const replaceAll = <T,>(target: T[], items: T[]) => target.splice(0, target.length, ...items);

let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function loadHackerRankData(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const [{ data: teachers }, { data: challenges }] = await Promise.all([
      supabase.from('teacher_profiles').select('user_id, designation, department, profiles:user_id(full_name, email, avatar_url)'),
      supabase
        .from('assessments')
        .select('id, teacher_id, created_by, title, type, subject, description, duration_minutes, max_marks, total_questions, status, published, created_at, start_date, end_date, target_batch, external_url')
        .eq('provider', 'hackerrank')
        .neq('status', 'archived')
        .order('start_date', { ascending: false }),
    ]);

    const svcTeachers = teacherService.getTeachers();
    const avatarMap = new Map<string, string>();
    svcTeachers.forEach((st) => {
      if (st.avatar) {
        if (st.userId) avatarMap.set(st.userId.toLowerCase(), st.avatar);
        if (st.id) avatarMap.set(st.id.toLowerCase(), st.avatar);
        if (st.email) avatarMap.set(st.email.toLowerCase(), st.avatar);
      }
    });

    replaceAll(
      hackerRankTeachers,
      (teachers || []).map((t: any) => {
        const userId = (t.user_id || '').toLowerCase();
        const email = (t.profiles?.email || '').toLowerCase();
        const fallbackAvatar = avatarMap.get(userId) || avatarMap.get(email) || '';
        return {
          id: t.user_id,
          name: t.profiles?.full_name || 'Faculty Member',
          designation: t.designation || '',
          department: t.department || '',
          email: t.profiles?.email || '',
          avatar: t.profiles?.avatar_url || fallbackAvatar,
        };
      }),
    );

    const now = Date.now();
    replaceAll(
      hackerRankChallenges,
      (challenges || []).map((a: any) => {
        const start = a.start_date ? new Date(a.start_date) : null;
        const closed = ['closed', 'completed'].includes(String(a.status).toLowerCase()) || (a.end_date && now > new Date(a.end_date).getTime());
        return {
          id: a.id,
          teacherId: a.teacher_id || a.created_by || '',
          title: a.title || '',
          type: TYPE_FROM_DB[a.type] || 'Coding',
          subject: a.subject || '',
          difficulty: 'Medium',
          questions: a.total_questions || 0,
          duration: a.duration_minutes || 60,
          totalMarks: a.max_marks || 100,
          status: closed ? 'Closed' : a.published ? 'Published' : 'Draft',
          createdAt: (a.created_at || '').split('T')[0],
          assessmentDate: start ? start.toISOString().split('T')[0] : '',
          startTime: start ? start.toTimeString().slice(0, 5) : '',
          targetBatch: a.target_batch || '',
          assessmentUrl: a.external_url || '',
          description: a.description || '',
        };
      }),
    );

    const ids = hackerRankChallenges.map((c) => c.id);
    const { data: subs } = ids.length
      ? await supabase
          .from('external_assessment_submissions')
          .select('id, assessment_id, student_id, reported_score, status, verified_score, review_note, submitted_at, profiles:student_id(full_name)')
          .in('assessment_id', ids)
      : { data: [] };
    const studentIds = [...new Set((subs || []).map((s: any) => s.student_id))];
    const { data: sps } = studentIds.length
      ? await supabase.from('student_profiles').select('user_id, register_number, roll_number, batch_name, section').in('user_id', studentIds)
      : { data: [] };
    const spOf = new Map((sps || []).map((s: any) => [s.user_id, s]));

    replaceAll(
      hackerRankResults,
      (subs || []).map((s: any) => {
        const challenge = hackerRankChallenges.find((c) => c.id === s.assessment_id);
        const sp: any = spOf.get(s.student_id) || {};
        const score = Number(s.verified_score ?? s.reported_score) || 0;
        const total = challenge?.totalMarks || 100;
        const pct = Math.round((score / total) * 10000) / 100;
        return {
          id: s.id,
          challengeId: s.assessment_id,
          teacherId: challenge?.teacherId || '',
          studentName: s.profiles?.full_name || 'Student',
          registerNumber: sp.register_number || sp.roll_number || '',
          className: challenge?.targetBatch || '',
          score,
          totalMarks: total,
          percentage: pct,
          grade: gradeFor(pct),
          status: s.status === 'Verified' ? 'Completed' : s.status === 'Pending' ? 'Submitted' : 'Not Attempted',
          submittedAt: s.submitted_at || '',
          attempt: 1,
          batch: sp.batch_name || '',
          facultyRemarks: s.review_note || (s.status === 'Rejected' ? 'Rejected by teacher' : undefined),
        };
      }),
    );
  })().finally(() => {
    loading = null;
    listeners.forEach((cb) => cb());
  });
  return loading;
}

/** Loads HackerRank data from Supabase on mount and re-renders when it arrives. */
export function useHackerRankData(): void {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const cb = () => setVersion((v) => v + 1);
    listeners.add(cb);
    void loadHackerRankData();
    return () => {
      listeners.delete(cb);
    };
  }, []);
}

export function getChallengesByTeacher(teacherId: string): HackerRankChallenge[] {
  return hackerRankChallenges.filter((c) => c.teacherId === teacherId);
}

export function getResultsByChallenge(challengeId: string): HackerRankResult[] {
  return hackerRankResults.filter((r) => r.challengeId === challengeId);
}

function toRow(c: Partial<HackerRankChallenge>) {
  const start = c.assessmentDate ? new Date(`${c.assessmentDate}T${c.startTime || '09:00'}:00`) : null;
  const duration = c.duration || 60;
  return {
    ...(c.title !== undefined ? { title: c.title } : {}),
    ...(c.type !== undefined ? { type: TYPE_TO_DB[c.type] } : {}),
    ...(c.subject !== undefined ? { subject: c.subject } : {}),
    ...(c.description !== undefined ? { description: c.description || null } : {}),
    ...(c.duration !== undefined ? { duration_minutes: duration } : {}),
    ...(c.totalMarks !== undefined ? { max_marks: c.totalMarks, total_marks: c.totalMarks } : {}),
    ...(c.questions !== undefined ? { total_questions: c.questions } : {}),
    ...(c.targetBatch !== undefined ? { target_batch: c.targetBatch } : {}),
    ...(c.assessmentUrl !== undefined ? { external_url: c.assessmentUrl } : {}),
    ...(c.status !== undefined
      ? { published: c.status === 'Published', status: c.status === 'Closed' ? 'closed' : c.status === 'Draft' ? 'draft' : 'scheduled' }
      : {}),
    ...(start && !Number.isNaN(start.getTime())
      ? { start_date: start.toISOString(), start_time: c.startTime || null, end_date: new Date(start.getTime() + duration * 60000).toISOString() }
      : {}),
  };
}

export function addHackerRankChallenge(challenge: HackerRankChallenge): HackerRankChallenge {
  hackerRankChallenges.unshift(challenge);
  void supabase
    .from('assessments')
    .insert({
      ...toRow(challenge),
      provider: 'hackerrank',
      teacher_id: challenge.teacherId || null,
      created_by: challenge.teacherId || null,
    })
    .then(({ error }: any) => {
      if (error) console.warn('HackerRank challenge insert failed:', error.message);
      return loadHackerRankData();
    });
  return challenge;
}

export function updateHackerRankChallenge(id: string, updates: Partial<HackerRankChallenge>): HackerRankChallenge | null {
  const idx = hackerRankChallenges.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  hackerRankChallenges[idx] = { ...hackerRankChallenges[idx], ...updates };
  void supabase
    .from('assessments')
    .update(toRow({ ...hackerRankChallenges[idx], ...updates }))
    .eq('id', id)
    .then(({ error }: any) => {
      if (error) console.warn('HackerRank challenge update failed:', error.message);
      return loadHackerRankData();
    });
  return hackerRankChallenges[idx];
}
