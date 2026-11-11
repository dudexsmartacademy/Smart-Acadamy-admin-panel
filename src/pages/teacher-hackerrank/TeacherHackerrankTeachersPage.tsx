import {
  ArrowRight,
  Code2,
  Mail,
  Users,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import {
  hackerRankChallenges,
  hackerRankResults,
  hackerRankTeachers,
  useHackerRankData,
} from '../../data/teacherHackerrankDemo';

export default function TeacherHackerrankTeachersPage() {
  useHackerRankData();
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-[#0B0B0B] p-6 text-[#F5F0EA]">
      <div className="mx-auto max-w-7xl">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-6">

          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#3A2922] bg-[#171311] px-3 py-1 text-[11px] font-semibold text-[#D8C7B8]">
            <Code2 className="h-3 w-3 text-[#D97706]" />
            HackerRank Integration
          </div>

          <p className="text-xs font-medium uppercase tracking-wider text-[#8C7A6B]">
            Teacher Assessment Management
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#F5F0EA]">
            Teacher HackerRank
          </h1>

          <p className="mt-1 text-sm text-[#A89A91]">
            Select a teacher to manage their HackerRank coding
            challenges, MCQ assessments and student results.
          </p>

        </div>

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* TOTAL TEACHERS */}

          <div className="rounded-xl border border-[#3A2922] bg-[#171311] p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B]">
                  Total Teachers
                </p>

                <p className="mt-2 text-2xl font-bold text-[#F5F0EA]">
                  {hackerRankTeachers.length}
                </p>

              </div>

              <div className="rounded-lg border border-[#3A2922] bg-[#241A15] p-3 text-[#D97706]">
                <Users className="h-5 w-5" />
              </div>

            </div>

          </div>

          {/* TOTAL CHALLENGES */}

          <div className="rounded-xl border border-[#3A2922] bg-[#171311] p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B]">
                  Total Challenges
                </p>

                <p className="mt-2 text-2xl font-bold text-[#F5F0EA]">
                  {hackerRankChallenges.length}
                </p>

              </div>

              <div className="rounded-lg border border-[#3A2922] bg-[#241A15] p-3 text-[#C28E5C]">
                <Code2 className="h-5 w-5" />
              </div>

            </div>

          </div>

          {/* STUDENT RESULTS */}

          <div className="rounded-xl border border-[#3A2922] bg-[#171311] p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B]">
                  Student Results
                </p>

                <p className="mt-2 text-2xl font-bold text-[#F5F0EA]">
                  {hackerRankResults.length}
                </p>

              </div>

              <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/50 p-3 text-emerald-400">
                <Users className="h-5 w-5" />
              </div>

            </div>

          </div>

        </div>

        {/* =====================================================
            TEACHER LIST HEADER
        ===================================================== */}

        <div className="mb-3">

          <h2 className="text-sm font-bold text-[#F5F0EA]">
            Select Teacher
          </h2>

          <p className="mt-1 text-xs text-[#8C7A6B]">
            Click a teacher to open their HackerRank assessment workspace.
          </p>

        </div>

        {/* =====================================================
            TEACHER CARDS
        ===================================================== */}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

          {hackerRankTeachers.map((teacher) => {

            const teacherChallenges =
              hackerRankChallenges.filter(
                (challenge) =>
                  challenge.teacherId === teacher.id
              );

            const teacherResults =
              hackerRankResults.filter(
                (result) =>
                  result.teacherId === teacher.id
              );

            const publishedChallenges =
              teacherChallenges.filter(
                (challenge) =>
                  challenge.status === 'Published'
              ).length;

            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() =>
                  navigate(
                    `/admin/teachers/hackerrank/${teacher.id}`
                  )
                }
                className="group rounded-xl border border-[#3A2922] bg-[#171311] p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#946246] hover:bg-[#1E1714]"
              >

                {/* =================================================
                    TEACHER HEADER
                ================================================= */}

                <div className="flex items-start justify-between">

                  <div className="flex items-start gap-3">

                    {/* AVATAR / PROFILE PHOTO */}

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full overflow-hidden border border-[#3A2922] bg-[#241A15] text-sm font-bold text-[#E0A96D]">
                      {teacher.avatar ? (
                        <img
                          src={teacher.avatar}
                          alt={teacher.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        teacher.name
                          .split(' ')
                          .map((word) => word[0])
                          .slice(0, 2)
                          .join('')
                      )}
                    </div>

                    {/* TEACHER DETAILS */}

                    <div>

                      <p className="text-sm font-bold text-[#F5F0EA] group-hover:text-[#E0A96D] transition-colors">
                        {teacher.name}
                      </p>

                      <p className="mt-1 text-xs text-[#A89A91]">
                        {teacher.designation || 'Faculty Member'}
                      </p>

                      <p className="mt-0.5 text-xs text-[#8C7A6B]">
                        {teacher.department || 'Department'}
                      </p>

                    </div>

                  </div>

                  {/* ARROW */}

                  <div className="rounded-lg p-2 text-[#8C7A6B] transition group-hover:bg-[#2A1E18] group-hover:text-[#F5F0EA]">
                    <ArrowRight className="h-4 w-4" />
                  </div>

                </div>

                {/* =================================================
                    EMAIL
                ================================================= */}

                <div className="mt-4 flex items-center gap-2 border-t border-[#2A1E18] pt-4">

                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#8C7A6B]" />

                  <span className="truncate text-xs text-[#8C7A6B]">
                    {teacher.email || 'No email provided'}
                  </span>

                </div>

                {/* =================================================
                    STATS
                ================================================= */}

                <div className="mt-4 grid grid-cols-3 gap-2">

                  {/* CHALLENGES */}

                  <div className="rounded-lg border border-[#2A1E18] bg-[#140F0D] p-3">

                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C7A6B]">
                      Challenges
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#F5F0EA]">
                      {teacherChallenges.length}
                    </p>

                  </div>

                  {/* PUBLISHED */}

                  <div className="rounded-lg border border-[#2A1E18] bg-[#140F0D] p-3">

                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C7A6B]">
                      Published
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#F5F0EA]">
                      {publishedChallenges}
                    </p>

                  </div>

                  {/* RESULTS */}

                  <div className="rounded-lg border border-[#2A1E18] bg-[#140F0D] p-3">

                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C7A6B]">
                      Results
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#D97706]">
                      {teacherResults.length}
                    </p>

                  </div>

                </div>

                {/* =================================================
                    ACTION
                ================================================= */}

                <div className="mt-4 flex items-center justify-between border-t border-[#2A1E18] pt-4">

                  <span className="text-[10px] text-[#6E5D53] truncate max-w-[150px]">
                    Teacher ID: {teacher.id}
                  </span>

                  <span className="flex items-center gap-1 text-xs font-semibold text-[#C28E5C] group-hover:text-[#E0A96D] transition-colors">
                    Open HackerRank

                    <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                  </span>

                </div>

              </button>
            );
          })}

        </div>

        {/* =====================================================
            EMPTY STATE
        ===================================================== */}

        {hackerRankTeachers.length === 0 && (
          <div className="rounded-xl border border-[#3A2922] bg-[#171311] p-12 text-center">

            <Users className="mx-auto h-8 w-8 text-[#8C7A6B]" />

            <p className="mt-3 text-sm font-semibold text-[#F5F0EA]">
              No teachers available
            </p>

            <p className="mt-1 text-xs text-[#8C7A6B]">
              No teachers are currently configured for HackerRank.
            </p>

          </div>
        )}

      </div>
    </div>
  );
}
