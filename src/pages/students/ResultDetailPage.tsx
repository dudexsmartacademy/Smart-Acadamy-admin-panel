import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Calendar,
  Eye,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  X,
  GraduationCap,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';
import { getResultsByStudent, getResults, fetchResults } from '../../services/resultService';
import { getStudentById, getStudents, fetchStudents } from '../../services/studentService';
import {
  getStudentCollege,
  getStudentDegree,
  getStudentSpecialization,
  getStudentBatch,
} from './StudentListPage';
import { StudentResult, Student } from '../../types';

export const ResultDetailPage: React.FC = () => {
  const { studentId, resultId } = useParams<{ studentId: string; resultId?: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [assessments, setAssessments] = useState<StudentResult[]>([]);
  const [selectedAssessmentModal, setSelectedAssessmentModal] = useState<StudentResult | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      let s: Student | undefined;
      if (studentId) {
        s =
          getStudentById(studentId) ||
          getStudents().find(
            (item) => item.id === studentId || item.studentId === studentId || item.userId === studentId
          );
      } else {
        s = getStudents()[0];
      }

      if (!s) {
        await fetchStudents();
        if (!active) return;
        s =
          getStudentById(studentId || '') ||
          getStudents().find(
            (item) => item.id === studentId || item.studentId === studentId || item.userId === studentId
          );
      }

      if (!active) return;
      setStudent(s || null);

      await fetchResults();
      if (!active) return;

      if (s) {
        let studentAssessments = getResultsByStudent(s.id, s.fullName, s.studentId);
        if (studentAssessments.length === 0 && s.userId && s.userId !== s.id) {
          studentAssessments = getResultsByStudent(s.userId, s.fullName, s.studentId);
        }
        setAssessments(studentAssessments);
        if (resultId) {
          const target = studentAssessments.find((r) => r.id === resultId);
          if (target) setSelectedAssessmentModal(target);
        }
      } else {
        setAssessments([]);
      }
    };

    loadData();

    const handleChanged = () => {
      loadData();
    };
    window.addEventListener('dudex_results_changed', handleChanged);
    window.addEventListener('dudex_students_changed', handleChanged);

    return () => {
      active = false;
      window.removeEventListener('dudex_results_changed', handleChanged);
      window.removeEventListener('dudex_students_changed', handleChanged);
    };
  }, [studentId, resultId]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (assessments.length === 0) {
      return {
        placementIndex: '0.0',
        highestScore: '0.00%',
        evaluationsCompleted: '0 Completed',
      };
    }
    const pcts = assessments.map((a) => a.percentage);
    const avg = pcts.reduce((acc, curr) => acc + curr, 0) / pcts.length;
    const highest = Math.max(...pcts);
    return {
      placementIndex: avg.toFixed(1),
      highestScore: `${highest.toFixed(2)}%`,
      evaluationsCompleted: `${assessments.length} Completed`,
    };
  }, [assessments]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fadeIn font-sans">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/admin/students/results')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to All Results</span>
        </button>
      </div>

      {/* Student Profile Info Header */}
      {student && (
        <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {student.avatar ? (
                <img
                  src={student.avatar}
                  alt={student.fullName}
                  className="w-16 h-16 rounded-full object-cover border border-[#5A321F]"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#2A1E19] border border-[#5A321F] flex items-center justify-center text-xl font-bold text-[#F5F0EA]">
                  {student.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-[#F5F0EA] leading-tight">
                  {student.fullName}
                </h1>
                <p className="text-xs text-[#A89A91] mt-1 font-medium">
                  {getStudentCollege(student)} • {getStudentDegree(student)} •{' '}
                  {getStudentSpecialization(student)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#140F0D] border border-[#3A2922] text-xs font-semibold text-[#F5F0EA]">
                    {getStudentBatch(student)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 text-xs font-semibold">
                    Active Student
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Aggregate KPI */}
            <div className="flex items-center gap-6 sm:border-l sm:border-[#3A2922] sm:pl-6">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                  Average Score
                </div>
                <div className="text-3xl font-extrabold text-[#C49B7B] tracking-tight mt-0.5">
                  {stats.placementIndex}%
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                  Highest Score
                </div>
                <div className="text-3xl font-extrabold text-emerald-400 tracking-tight mt-0.5">
                  {stats.highestScore}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Assessments Table Card (matching Screenshot 5) */}
      <div className="bg-[#171311] border border-[#3A2922] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#3A2922] bg-[#140F0D] flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F0EA]">
            Attended Assessments & Submissions ({assessments.length})
          </h2>
          <span className="text-xs text-[#A89A91]">
            Detailed breakdown of scores, percentages, and faculty remarks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#140F0D] text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <th className="py-3.5 px-5">Assessment</th>
                <th className="py-3.5 px-3 text-center">Attempt</th>
                <th className="py-3.5 px-4 text-center">Score</th>
                <th className="py-3.5 px-4 text-center">Percentage</th>
                <th className="py-3.5 px-3 text-center">Grade</th>
                <th className="py-3.5 px-4">Submitted At</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1E19]/80">
              {assessments.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#1E1815]/70 transition-colors group"
                >
                  {/* Assessment Title */}
                  <td className="py-4 px-5 font-bold text-[#F5F0EA] text-xs">
                    {item.examTitle}
                  </td>

                  {/* Attempt */}
                  <td className="py-4 px-3 text-center font-mono font-semibold text-[#F5F0EA]">
                    {item.attemptNumber || 1}
                  </td>

                  {/* Score */}
                  <td className="py-4 px-4 text-center font-mono font-bold text-[#F5F0EA]">
                    {item.marksObtained}/{item.maxMarks}
                  </td>

                  {/* Percentage */}
                  <td className="py-4 px-4 text-center font-mono font-bold text-emerald-400">
                    {Number(item.percentage).toFixed(2)}%
                  </td>

                  {/* Grade */}
                  <td className="py-4 px-3 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2A1E19] border border-[#5A321F] text-[11px] font-bold text-[#F5F0EA]">
                      {item.grade}
                    </span>
                  </td>

                  {/* Submitted At */}
                  <td className="py-4 px-4 font-mono text-[11px] text-[#A89A91]">
                    {item.submittedAt || `${item.publishedDate} 10:20 AM`}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#1B2920] border border-emerald-900/60 text-emerald-400">
                      Submitted
                    </span>
                  </td>

                  {/* Action View Button */}
                  <td className="py-4 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedAssessmentModal(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#231A16] hover:bg-[#2F211B] border border-[#3A2922] hover:border-[#5A321F] text-xs font-semibold text-[#F5F0EA] transition-all cursor-pointer shadow-sm"
                      title="View Assessment Scorecard"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C49B7B]" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL: Assessment Details & Student's Uploaded Scorecard Screenshot */}
      {selectedAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#171311] border border-[#3A2922] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#140F0D] border-b border-[#3A2922] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#231A16] border border-[#5A321F] flex items-center justify-center">
                  <Award className="w-5 h-5 text-[#C49B7B]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F5F0EA]">
                    {selectedAssessmentModal.examTitle}
                  </h3>
                  <div className="text-xs text-[#A89A91] flex items-center gap-2 mt-0.5">
                    <span>
                      {student?.fullName || selectedAssessmentModal.studentName}
                    </span>
                    <span>•</span>
                    <span className="font-mono">
                      {selectedAssessmentModal.assessmentType || 'Evaluation'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAssessmentModal(null)}
                className="w-8 h-8 rounded-lg bg-[#231A16] hover:bg-[#2F211B] border border-[#3A2922] text-[#A89A91] hover:text-[#F5F0EA] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Score Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[#140F0D] border border-[#2A1E19] rounded-xl text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#A89A91]">
                    Score
                  </div>
                  <div className="text-lg font-extrabold text-[#F5F0EA] font-mono mt-0.5">
                    {selectedAssessmentModal.marksObtained} /{' '}
                    {selectedAssessmentModal.maxMarks}
                  </div>
                </div>

                <div className="p-3.5 bg-[#140F0D] border border-[#2A1E19] rounded-xl text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#A89A91]">
                    Percentage
                  </div>
                  <div className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5">
                    {Number(selectedAssessmentModal.percentage).toFixed(2)}%
                  </div>
                </div>

                <div className="p-3.5 bg-[#140F0D] border border-[#2A1E19] rounded-xl text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#A89A91]">
                    Grade
                  </div>
                  <div className="text-lg font-extrabold text-amber-300 font-mono mt-0.5">
                    {selectedAssessmentModal.grade}
                  </div>
                </div>

                <div className="p-3.5 bg-[#140F0D] border border-[#2A1E19] rounded-xl text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#A89A91]">
                    Submission Date
                  </div>
                  <div className="text-xs font-semibold text-[#F5F0EA] mt-1 font-mono">
                    {selectedAssessmentModal.submittedAt ||
                      selectedAssessmentModal.publishedDate}
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {selectedAssessmentModal.feedback && (
                <div className="p-4 bg-[#140F0D] border border-[#2A1E19] rounded-xl">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#A89A91] mb-1">
                    Faculty Remarks & Feedback
                  </div>
                  <p className="text-xs text-[#F5F0EA]/90 leading-relaxed">
                    {selectedAssessmentModal.feedback}
                  </p>
                </div>
              )}

              {/* Verification Screenshot */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C49B7B]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F5F0EA]">
                    Student Uploaded Result Verification Screenshot
                  </span>
                </div>

                <div className="rounded-xl overflow-hidden border border-[#3A2922] bg-[#140F0D]">
                  <img
                    src={
                      selectedAssessmentModal.resultScreenshotUrl ||
                      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=900'
                    }
                    alt="Assessment Result Proof"
                    className="w-full h-auto object-cover max-h-96"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
