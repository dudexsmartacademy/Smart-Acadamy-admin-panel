import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Save,
  X,
} from 'lucide-react';

import { useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  hackerRankChallenges,
  hackerRankResults,
  hackerRankTeachers,
  useHackerRankData,
} from '../../data/teacherHackerrankDemo';

export default function TeacherHackerrankStudentResultPage() {
  useHackerRankData();
  const navigate = useNavigate();

  const {
    teacherId,
    challengeId,
    resultId,
  } = useParams<{
    teacherId: string;
    challengeId: string;
    resultId: string;
  }>();

  const teacher = hackerRankTeachers.find(
    (item) => item.id === teacherId
  );

  const challenge = hackerRankChallenges.find(
    (item) =>
      item.id === challengeId &&
      item.teacherId === teacherId
  );

  const result = hackerRankResults.find(
    (item) =>
      item.id === resultId &&
      item.teacherId === teacherId &&
      item.challengeId === challengeId
  );

  const [remarks, setRemarks] = useState(
    result?.facultyRemarks || ''
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!teacher || !challenge || !result) {
    return (
      <div className="min-h-full bg-[#0B0B0B] p-6 text-[#F5F0EA]">
        <div className="rounded-xl border border-[#3A2922] bg-[#171311] p-10 text-center text-[#A89A91]">
          Result not found.
        </div>
      </div>
    );
  }

  const saveRemarks = () => {
    result.facultyRemarks = remarks;
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="min-h-full bg-[#0B0B0B] p-6 text-[#F5F0EA]">

      <div className="mx-auto max-w-3xl">

        {/* BACK */}

        <button
          type="button"
          onClick={() =>
            navigate(
              `/admin/teachers/hackerrank/${teacher.id}/results/${challenge.id}`
            )
          }
          className="mb-4 flex items-center gap-2 text-sm text-[#A89A91] hover:text-[#F5F0EA] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Results
        </button>

        {/* RESULT CARD */}

        <div className="overflow-hidden rounded-xl border border-[#3A2922] bg-[#171311] shadow-sm">

          {/* HEADER */}

          <div className="flex items-center justify-between border-b border-[#3A2922] p-5">

            <div className="flex items-center gap-3">

              <div className="rounded-lg border border-[#3A2922] bg-[#241A15] p-2 text-[#D97706]">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-sm font-bold text-[#F5F0EA]">
                  {result.studentName} — {challenge.title}
                </h1>

                <p className="mt-1 text-[10px] text-[#8C7A6B]">
                  Registration: {result.registerNumber} ·{' '}
                  {result.className}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/admin/teachers/hackerrank/${teacher.id}/results/${challenge.id}`
                )
              }
              className="rounded-full p-1.5 text-[#8C7A6B] hover:bg-[#201814] hover:text-[#F5F0EA] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

          </div>

          {/* SCORE SUMMARY */}

          <div className="grid gap-3 p-5 sm:grid-cols-4">

            <InfoCard
              label="Assessment"
              value={challenge.title}
            />

            <InfoCard
              label="Submitted At"
              value={result.submittedAt}
            />

            <InfoCard
              label="Student Score"
              value={`${result.score} / ${result.totalMarks}`}
            />

            <InfoCard
              label="Obtained %"
              value={`${result.percentage.toFixed(1)}% (${result.grade})`}
            />

          </div>

          {/* UPLOADED RESULT */}

          <div className="mx-5 overflow-hidden rounded-lg border border-[#3A2922] bg-[#0E0B0A]">

            <div className="flex items-center justify-between border-b border-[#2A1E18] px-4 py-2">

              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D8C7B8]">
                STUDENT UPLOADED RESULT SCREENSHOT & VERIFIED SCORECARD
              </span>

              <button
                type="button"
                className="rounded border border-[#3A2922] bg-[#1F1713] px-3 py-1 text-[10px] font-semibold text-[#D8C7B8] hover:text-[#F5F0EA] transition-colors"
              >
                Full Screen
              </button>

            </div>

            <div className="flex h-48 items-center justify-center px-6">

              <div className="w-full max-w-md rounded-full border border-[#3A2922] bg-[#140F0D] px-5 py-2 text-center text-xs text-[#F5F0EA]">
                {result.studentName} Result Scorecard
              </div>

            </div>

            <div className="flex items-center justify-between border-t border-[#2A1E18] px-4 py-2 text-[10px]">

              <span className="text-[#8C7A6B]">
                ✓ Uploaded on {result.submittedAt}
              </span>

              <span className="font-semibold text-emerald-400">
                Status: Self-Submitted & Verified
              </span>

            </div>

          </div>

          {/* STUDENT REMARKS */}

          <div className="mx-5 mt-4 rounded-lg border border-[#523A25] bg-[#22170F] p-4">

            <p className="text-xs font-semibold text-[#E0A96D]">
              Student Remarks / Submission Memo:
            </p>

            <p className="mt-2 text-xs text-[#D8C7B8]">
              {result.studentRemarks ||
                'Completed the assessment and submitted the result screenshot.'}
            </p>

          </div>

          {/* FACULTY REMARKS */}

          <div className="m-5 rounded-lg border border-[#3A2922] bg-[#140F0D] p-4">

            <label className="text-xs font-bold text-[#D8C7B8] uppercase tracking-wider">
              FACULTY VERIFICATION & REMARKS
            </label>

            <textarea
              value={remarks}
              onChange={(event) =>
                setRemarks(event.target.value)
              }
              rows={4}
              placeholder="Enter remarks or verified comments for this student's result..."
              className="mt-3 w-full rounded-lg border border-[#3A2922] bg-[#100D0B] p-3 text-sm text-[#F5F0EA] placeholder-[#6E5D53] outline-none focus:border-[#946246]"
            />

            <div className="mt-3 flex items-center justify-between">

              <p className="text-[10px] text-[#8C7A6B]">
                {savedSuccess ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Remarks saved successfully!
                  </span>
                ) : (
                  'Result verified against student test submission log.'
                )}
              </p>

              <button
                type="button"
                onClick={saveRemarks}
                className="flex items-center gap-2 rounded-lg bg-[#946246] hover:bg-[#83543B] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                Save Remarks
              </button>

            </div>

          </div>

          {/* FOOTER */}

          <div className="flex items-center justify-between border-t border-[#3A2922] bg-[#120E0C] p-4">

            <button
              type="button"
              className="text-xs font-medium text-[#8C7A6B] hover:text-[#F5F0EA] transition-colors"
            >
              View Full Academic Profile & All Test History ↗
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/admin/teachers/hackerrank/${teacher.id}/results/${challenge.id}`
                )
              }
              className="rounded-lg border border-[#3A2922] bg-[#140F0D] px-4 py-2 text-xs font-semibold text-[#D8C7B8] hover:text-[#F5F0EA] hover:border-[#946246] transition-colors"
            >
              Close
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#3A2922] bg-[#140F0D] p-3">

      <p className="text-[9px] font-bold uppercase tracking-wider text-[#8C7A6B]">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-[#F5F0EA]">
        {value}
      </p>

    </div>
  );
}
