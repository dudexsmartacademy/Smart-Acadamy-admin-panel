import {
  ArrowLeft,
  Eye,
  Search,
  Users,
  CheckCircle2,
  Clock3,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

import { useMemo, useState } from 'react';
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
import { getAcademicBatches } from '../../services/academicBatchService';

export default function TeacherHackerrankResultsPage() {
  useHackerRankData();
  const navigate = useNavigate();

  const {
    teacherId,
    challengeId,
  } = useParams<{
    teacherId: string;
    challengeId: string;
  }>();

  const teacher = hackerRankTeachers.find(
    (item) => item.id === teacherId
  );

  const challenge = hackerRankChallenges.find(
    (item) =>
      item.id === challengeId &&
      item.teacherId === teacherId
  );

  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState('All Batches');

  const availableBatches = useMemo(() => {
    const list = getAcademicBatches().map((b) => b.name.replace(/\s*\([^)]*\)/g, '').trim());
    const defaults = ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'];
    return Array.from(new Set([...defaults, ...list])).filter(Boolean);
  }, []);

  if (!teacher || !challenge) {
    return (
      <div className="min-h-full bg-[#0B0B0B] p-6 text-[#F5F0EA]">
        <div className="rounded-xl border border-[#3A2922] bg-[#171311] p-10 text-center text-[#A89A91]">
          Result information not found.
        </div>
      </div>
    );
  }

  const results = hackerRankResults.filter(
    (result) =>
      result.teacherId === teacher.id &&
      result.challengeId === challenge.id
  );

  const filteredResults = useMemo(() => {
    const query = search.toLowerCase().trim();

    return results.filter((result) => {
      const matchesSearch =
        !query ||
        result.studentName
          .toLowerCase()
          .includes(query) ||
        result.registerNumber
          .toLowerCase()
          .includes(query);

      const matchesBatch =
        batch === 'All Batches' ||
        result.batch === batch;

      return matchesSearch && matchesBatch;
    });
  }, [results, search, batch]);

  const submitted = results.filter(
    (result) =>
      result.status === 'Submitted' ||
      result.status === 'Completed'
  ).length;

  const attempted = results.length;

  const average =
    results.length > 0
      ? results.reduce(
          (sum, result) =>
            sum + result.percentage,
          0
        ) / results.length
      : 0;

  const highest =
    results.length > 0
      ? Math.max(
          ...results.map(
            (result) => result.percentage
          )
        )
      : 0;

  const lowest =
    results.length > 0
      ? Math.min(
          ...results.map(
            (result) => result.percentage
          )
        )
      : 0;

  const passPercentage =
    results.length > 0
      ? (results.filter(
          (result) => result.percentage >= 40
        ).length /
          results.length) *
        100
      : 0;

  return (
    <div className="min-h-full bg-[#0B0B0B] p-6 text-[#F5F0EA]">

      <div className="mx-auto max-w-7xl">

        {/* BACK */}

        <button
          type="button"
          onClick={() =>
            navigate(
              `/admin/teachers/hackerrank/${teacher.id}`
            )
          }
          className="mb-4 flex items-center gap-2 text-sm text-[#A89A91] hover:text-[#F5F0EA] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Challenges
        </button>

        {/* TITLE */}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

          <div>
            <p className="text-xs font-medium tracking-wide uppercase text-[#8C7A6B]">
              Viewing submissions for:
            </p>

            <h1 className="mt-1 text-2xl font-bold text-[#F5F0EA]">
              Results
            </h1>

            <p className="mt-1 text-sm text-[#A89A91]">
              {challenge.title}
            </p>

            <p className="mt-1 text-xs font-semibold text-[#C28E5C]">
              {teacher.name}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setBatch('All Batches');
            }}
            className="self-start rounded-lg border border-[#3A2922] bg-[#140F0D] px-4 py-2 text-xs font-semibold text-[#A89A91] hover:text-[#F5F0EA] hover:border-[#946246]/40 transition-colors"
          >
            Clear Assessment Filter
          </button>

        </div>

        {/* TOP STATS */}

        <div className="grid gap-4 md:grid-cols-4">

          <ResultStat
            label="Number Assigned"
            value={results.length + 2}
            icon={<Users className="h-4 w-4" />}
          />

          <ResultStat
            label="Number Attempted"
            value={attempted}
            icon={<Clock3 className="h-4 w-4" />}
          />

          <ResultStat
            label="Number Submitted"
            value={submitted}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />

          <ResultStat
            label="Average"
            value={`${average.toFixed(2)}%`}
            icon={<BarChart3 className="h-4 w-4" />}
          />

        </div>

        {/* SECOND STATS */}

        <div className="mt-4 grid gap-4 md:grid-cols-3">

          <ResultStat
            label="Highest"
            value={`${highest.toFixed(2)}%`}
            icon={<TrendingUp className="h-4 w-4" />}
          />

          <ResultStat
            label="Lowest"
            value={`${lowest.toFixed(2)}%`}
            icon={<TrendingDown className="h-4 w-4" />}
          />

          <ResultStat
            label="Pass Percentage"
            value={`${passPercentage.toFixed(2)}%`}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />

        </div>

        {/* SEARCH / FILTER */}

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#3A2922] bg-[#171311] p-3 md:flex-row">

          <div className="relative flex-1">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search student, RRN, or assessment..."
              className="h-10 w-full rounded-lg border border-[#3A2922] bg-[#140F0D] pl-9 pr-3 text-sm text-[#F5F0EA] placeholder-[#6E5D53] outline-none focus:border-[#946246]"
            />

          </div>

          <select
            value={batch}
            onChange={(event) =>
              setBatch(event.target.value)
            }
            className="h-10 rounded-lg border border-[#3A2922] bg-[#140F0D] px-4 text-sm text-[#F5F0EA] outline-none focus:border-[#946246]"
          >
            <option value="All Batches">All Batches</option>
            {availableBatches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

        </div>

        {/* TABLE */}

        <div className="mt-4 overflow-hidden rounded-xl border border-[#3A2922] bg-[#171311] shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1000px]">

              <thead className="border-b border-[#3A2922] bg-[#120E0C]">

                <tr>

                  {[
                    'STUDENT',
                    'BATCH',
                    'ASSESSMENT',
                    'ATTEMPT',
                    'SCORE',
                    'PERCENTAGE',
                    'GRADE',
                    'SUBMITTED AT',
                    'STATUS',
                    'ACTION',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left text-[10px] font-bold tracking-wide text-[#8C7A6B]"
                    >
                      {heading}
                    </th>
                  ))}

                </tr>

              </thead>

              <tbody>

                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-[#8C7A6B]">
                      No submission results found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((result) => (

                    <tr
                      key={result.id}
                      className="border-b border-[#2A1E18] last:border-0 hover:bg-[#1E1714] transition-colors"
                    >

                      <td className="px-4 py-4">

                        <p className="text-xs font-bold text-[#F5F0EA]">
                          {result.studentName}
                        </p>

                        <p className="mt-1 text-[10px] text-[#8C7A6B]">
                          {result.registerNumber} · {result.className}
                        </p>

                      </td>

                      <td className="px-4 py-4">

                        <span className="rounded border border-[#3A2922] bg-[#241A15] px-2 py-1 text-[10px] font-semibold text-[#D8C7B8]">
                          {result.batch}
                        </span>

                      </td>

                      <td className="px-4 py-4 text-xs text-[#A89A91]">
                        {challenge.title}
                      </td>

                      <td className="px-4 py-4 text-xs text-[#A89A91]">
                        {result.attempt}
                      </td>

                      <td className="px-4 py-4 text-xs font-semibold text-[#F5F0EA]">
                        {result.score}/{result.totalMarks}
                      </td>

                      <td className="px-4 py-4 text-xs font-semibold text-[#D97706]">
                        {result.percentage.toFixed(2)}%
                      </td>

                      <td className="px-4 py-4">

                        <span className="rounded-full border border-[#3A2922] bg-[#241A15] px-2.5 py-1 text-[10px] font-bold text-[#C28E5C]">
                          {result.grade}
                        </span>

                      </td>

                      <td className="px-4 py-4 text-xs text-[#8C7A6B]">
                        {result.submittedAt}
                      </td>

                      <td className="px-4 py-4">

                        <span className="rounded-full border border-emerald-800/50 bg-emerald-950/60 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                          Submitted
                        </span>

                      </td>

                      <td className="px-4 py-4">

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/admin/teachers/hackerrank/${teacher.id}/results/${challenge.id}/student/${result.id}`
                            )
                          }
                          className="flex items-center gap-1 rounded-lg border border-[#3A2922] bg-[#140F0D] px-3 py-1.5 text-[10px] font-semibold text-[#D8C7B8] hover:border-[#946246] hover:bg-[#201814] hover:text-[#F5F0EA] transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>

                      </td>

                    </tr>

                  ))
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </div>
  );
}

function ResultStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#3A2922] bg-[#171311] p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-[10px] font-bold tracking-wider uppercase text-[#8C7A6B]">
            {label}
          </p>

          <p className="mt-2 text-xl font-bold text-[#F5F0EA]">
            {value}
          </p>
        </div>

        <div className="rounded-lg border border-[#3A2922] bg-[#241A15] p-3 text-[#D97706]">
          {icon}
        </div>

      </div>

    </div>
  );
}
