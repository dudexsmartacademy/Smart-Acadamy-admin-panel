import {
  BarChart3,
  CalendarDays,
  Code2,
  Copy,
  Edit3,
  ExternalLink,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Users,
  Clock3,
  CheckCircle2,
  FileCode2,
  ListFilter,
} from 'lucide-react';

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  hackerRankChallenges,
  hackerRankResults,
  hackerRankTeachers,
  useHackerRankData,
} from '../../data/teacherHackerrankDemo';

export default function TeacherHackerrankPage() {
  useHackerRankData();
  const navigate = useNavigate();

  const { teacherId } = useParams<{
    teacherId: string;
  }>();

  const teacher = hackerRankTeachers.find(
    (item) => item.id === teacherId
  );

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Formats');
  const [batchFilter, setBatchFilter] = useState('All Batches');

  if (!teacher) {
    return (
      <div className="min-h-full bg-[#0B0B0B] text-[#F5F0EA] p-6">
        <div className="rounded-2xl border border-[#3A2922] bg-[#171311] p-10 text-center">
          <Code2 className="mx-auto h-10 w-10 text-[#A89A91]" />

          <h1 className="mt-4 text-xl font-bold text-[#F5F0EA]">
            Teacher Not Found
          </h1>

          <p className="mt-2 text-sm text-[#A89A91]">
            The selected teacher could not be found.
          </p>
        </div>
      </div>
    );
  }

  const teacherChallenges = hackerRankChallenges.filter(
    (challenge) => challenge.teacherId === teacher.id
  );

  const teacherResults = hackerRankResults.filter(
    (result) => result.teacherId === teacher.id
  );

  const filteredChallenges = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teacherChallenges.filter((challenge) => {
      const matchesSearch =
        !query ||
        challenge.title.toLowerCase().includes(query) ||
        challenge.subject.toLowerCase().includes(query);

      const matchesType =
        typeFilter === 'All Formats' ||
        challenge.type === typeFilter;

      const matchesBatch =
        batchFilter === 'All Batches' ||
        challenge.targetBatch.includes(batchFilter);

      return matchesSearch && matchesType && matchesBatch;
    });
  }, [
    teacherChallenges,
    search,
    typeFilter,
    batchFilter,
  ]);

  const codingCount = teacherChallenges.filter(
    (challenge) => challenge.type === 'Coding'
  ).length;

  const mcqCount = teacherChallenges.filter(
    (challenge) => challenge.type === 'MCQ'
  ).length;

  const activeCount = teacherChallenges.filter(
    (challenge) => challenge.status === 'Published'
  ).length;

  const batches = [
    'All Batches',
    'Batch 1',
    'Batch 2',
    'Batch 3',
    'Batch 4',
    'Batch 5',
  ];

  const createChallenge = () => {
    navigate(
      `/admin/teachers/hackerrank/${teacher.id}/create`
    );
  };

  const editChallenge = (challengeId: string) => {
    navigate(
      `/admin/teachers/hackerrank/${teacher.id}/edit/${challengeId}`
    );
  };

  const viewResults = (challengeId: string) => {
    navigate(
      `/admin/teachers/hackerrank/${teacher.id}/results/${challengeId}`
    );
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Demo-only fallback.
    }
  };

  return (
    <div className="min-h-full bg-[#0B0B0B] text-[#F5F0EA] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#2A1710] border border-[#946246]/40 px-3 py-1 text-[11px] font-semibold text-[#D78B55]">
              <Code2 className="h-3.5 w-3.5" />
              HackerRank Integration
            </div>

            <p className="text-xs text-[#A89A91]">
              Assessment Management
            </p>

            <h1 className="mt-1 text-2xl font-bold text-[#F5F0EA]">
              HackerRank Coding & MCQ Challenges
            </h1>

            <p className="mt-1 text-sm text-[#A89A91]">
              Create, schedule, and distribute HackerRank coding
              challenges and MCQ assessments to your students.
            </p>

            <div className="mt-3 text-sm font-semibold text-[#D78B55]">
              {teacher.name}
              <span className="ml-2 font-normal text-[#A89A91]">
                · {teacher.department}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={createChallenge}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#946246] hover:bg-[#7A4930] px-5 py-3 text-xs font-bold text-[#F5F0EA] shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create New Challenge
          </button>
        </div>

        {/* STATISTICS */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="TOTAL CHALLENGES"
            value={teacherChallenges.length}
            icon={<Code2 className="h-5 w-5" />}
          />

          <StatCard
            label="CODING TESTS"
            value={codingCount}
            icon={<FileCode2 className="h-5 w-5" />}
          />

          <StatCard
            label="MCQ TESTS"
            value={mcqCount}
            icon={<ListFilter className="h-5 w-5" />}
          />

          <StatCard
            label="ACTIVE / UPCOMING"
            value={activeCount}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
        </div>

        {/* SEARCH / FILTERS */}
        <div className="mb-6 rounded-2xl border border-[#3A2922] bg-[#171311] p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89A91]" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search challenges by title, format, batch..."
                className="h-11 w-full rounded-xl border border-[#3A2922] bg-[#140F0D] pl-10 pr-4 text-xs text-[#F5F0EA] placeholder-[#5A453D] outline-none transition focus:border-[#946246]"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A89A91]" />

                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-[#3A2922] bg-[#140F0D] pl-10 pr-8 text-xs font-medium text-[#F5F0EA] outline-none transition focus:border-[#946246] cursor-pointer"
                >
                  <option>All Formats</option>
                  <option>Coding</option>
                  <option>MCQ</option>
                  <option>Coding + MCQ</option>
                </select>
              </div>

              <select
                value={batchFilter}
                onChange={(event) =>
                  setBatchFilter(event.target.value)
                }
                className="h-11 rounded-xl border border-[#3A2922] bg-[#140F0D] px-4 text-xs font-medium text-[#F5F0EA] outline-none transition focus:border-[#946246] cursor-pointer"
              >
                {batches.map((batch) => (
                  <option key={batch}>{batch}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION TITLE */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#F5F0EA]">
            Created Challenges & Tests ({filteredChallenges.length})
          </h2>

          <span className="text-xs text-[#A89A91]">
            Click "Open Challenge" to launch or copy link to share with students
          </span>
        </div>

        {/* CHALLENGE CARDS */}
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredChallenges.map((challenge) => {
            const resultCount = teacherResults.filter(
              (result) =>
                result.challengeId === challenge.id
            ).length;

            return (
              <div
                key={challenge.id}
                className="rounded-2xl border border-[#3A2922] bg-[#171311] p-5 shadow-sm transition hover:border-[#946246]/60 flex flex-col justify-between"
              >
                <div>
                  {/* BADGES */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-lg bg-[#2A1710] border border-[#946246]/40 px-2.5 py-1 text-[10px] font-bold text-[#D78B55]">
                        {challenge.type.toUpperCase()}
                      </span>

                      <span className="rounded-lg bg-[#140F0D] border border-[#3A2922] px-2.5 py-1 text-[10px] font-semibold text-[#A89A91]">
                        {challenge.targetBatch}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          editChallenge(challenge.id)
                        }
                        className="rounded-lg p-1.5 text-[#A89A91] hover:bg-[#2A1E19] hover:text-[#F5F0EA] transition cursor-pointer"
                        title="Edit Challenge"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* TITLE */}
                  <h3 className="text-sm font-bold text-[#F5F0EA]">
                    {challenge.title}
                  </h3>

                  <p className="mt-1 min-h-[36px] text-xs leading-5 text-[#A89A91] line-clamp-2">
                    {challenge.description || 'No specific instructions provided.'}
                  </p>

                  {/* DATE & DURATION */}
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-[#3A2922] bg-[#140F0D] p-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] text-[#A89A91]">
                        <CalendarDays className="h-3 w-3 text-[#D78B55]" />
                        Date
                      </p>

                      <p className="mt-1 text-xs font-bold text-[#F5F0EA]">
                        {challenge.assessmentDate}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] text-[#A89A91]">
                        <Clock3 className="h-3 w-3 text-[#D78B55]" />
                        Duration
                      </p>

                      <p className="mt-1 text-xs font-bold text-[#F5F0EA]">
                        {challenge.duration} Mins
                      </p>
                    </div>
                  </div>

                  {/* LINK */}
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#3A2922] bg-[#140F0D] px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-[10px] text-[#A89A91]">
                      {challenge.assessmentUrl}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        copyLink(challenge.assessmentUrl)
                      }
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-[#3A2922] bg-[#1C1715] px-2.5 py-1 text-[10px] font-semibold text-[#F5F0EA] hover:bg-[#2A1E19] transition cursor-pointer"
                    >
                      <Copy className="h-3 w-3 text-[#D78B55]" />
                      Copy
                    </button>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        challenge.assessmentUrl,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#946246] hover:bg-[#7A4930] py-2.5 text-xs font-bold text-[#F5F0EA] transition cursor-pointer shadow-sm active:scale-95"
                  >
                    Open Challenge
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      viewResults(challenge.id)
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3A2922] bg-[#140F0D] py-2.5 text-xs font-semibold text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#1E1815] transition cursor-pointer"
                  >
                    <BarChart3 className="h-3.5 w-3.5 text-[#D78B55]" />
                    View Result
                    {resultCount > 0 && (
                      <span className="text-[#A89A91]">
                        ({resultCount})
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredChallenges.length === 0 && (
          <div className="rounded-2xl border border-[#3A2922] bg-[#171311] p-12 text-center">
            <Code2 className="mx-auto h-8 w-8 text-[#A89A91]" />

            <p className="mt-3 text-sm font-semibold text-[#F5F0EA]">
              No challenges found
            </p>

            <p className="mt-1 text-xs text-[#A89A91]">
              Try changing the search query or format filter.
            </p>
          </div>
        )}

        {/* TEACHER INFORMATION */}
        <div className="mt-6 rounded-2xl border border-[#3A2922] bg-[#171311] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2A1D17] to-[#140F0D] border border-[#946246]/40 font-bold text-[#D78B55]">
              {teacher.name
                .split(' ')
                .map((word) => word[0])
                .slice(0, 2)
                .join('')}
            </div>

            <div>
              <p className="text-sm font-bold text-[#F5F0EA]">
                {teacher.name}
              </p>

              <p className="text-xs text-[#A89A91]">
                {teacher.designation} · {teacher.department}
              </p>

              <p className="text-[10px] text-[#5A453D]">
                {teacher.email}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#3A2922] bg-[#171311] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-[#A89A91] uppercase">
            {label}
          </p>

          <p className="mt-2 text-2xl font-extrabold text-[#F5F0EA]">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-[#2A1710] border border-[#946246]/40 p-3 text-[#D78B55]">
          {icon}
        </div>
      </div>
    </div>
  );
}
