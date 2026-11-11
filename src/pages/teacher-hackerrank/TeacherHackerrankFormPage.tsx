import {
  ArrowLeft,
  CalendarDays,
  Code2,
  Clock3,
  FileText,
  Link2,
  Save,
  ChevronDown,
  Check,
  CheckSquare,
  Square,
} from 'lucide-react';

import { FormEvent, useState, useMemo, useEffect, useRef } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  addHackerRankChallenge,
  hackerRankChallenges,
  hackerRankTeachers,
  updateHackerRankChallenge,
  useHackerRankData,
} from '../../data/teacherHackerrankDemo';
import { getAcademicBatches } from '../../services/academicBatchService';

export default function TeacherHackerrankFormPage() {
  useHackerRankData();
  const navigate = useNavigate();

  const {
    teacherId,
    challengeId,
  } = useParams<{
    teacherId: string;
    challengeId?: string;
  }>();

  const teacher = hackerRankTeachers.find(
    (item) => item.id === teacherId
  );

  const editingChallenge = hackerRankChallenges.find(
    (challenge) =>
      challenge.id === challengeId &&
      challenge.teacherId === teacherId
  );

  const isEdit = Boolean(editingChallenge);

  const [title, setTitle] = useState(
    editingChallenge?.title || ''
  );

  const [format, setFormat] = useState<
    'Coding' | 'MCQ' | 'Coding + MCQ'
  >(
    editingChallenge?.type || 'Coding'
  );

  const [date, setDate] = useState(
    editingChallenge?.assessmentDate || new Date().toISOString().split('T')[0]
  );

  const [startTime, setStartTime] = useState(
    editingChallenge?.startTime || '10:00 AM'
  );

  const [duration, setDuration] = useState(
    String(editingChallenge?.duration || 60)
  );

  // Available batches
  const availableBatches = useMemo(() => {
    const list = getAcademicBatches().map((b) => b.name.replace(/\s*\([^)]*\)/g, '').trim());
    const defaults = ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'];
    return Array.from(new Set([...defaults, ...list])).filter(Boolean);
  }, []);

  // Multi-select batch state
  const initialBatches = useMemo(() => {
    if (!editingChallenge?.targetBatch) return ['All Batches'];
    if (editingChallenge.targetBatch === 'All Batches') return ['All Batches'];
    return editingChallenge.targetBatch.split(',').map((s) => s.trim()).filter(Boolean);
  }, [editingChallenge]);

  const [selectedBatches, setSelectedBatches] = useState<string[]>(initialBatches);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const batchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(e.target as Node)) {
        setIsBatchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleBatch = (batchName: string) => {
    if (batchName === 'All Batches') {
      if (selectedBatches.includes('All Batches')) {
        setSelectedBatches([]);
      } else {
        setSelectedBatches(['All Batches', ...availableBatches]);
      }
      return;
    }

    let next = selectedBatches.filter((b) => b !== 'All Batches');
    if (next.includes(batchName)) {
      next = next.filter((b) => b !== batchName);
    } else {
      next.push(batchName);
    }

    if (next.length === availableBatches.length) {
      setSelectedBatches(['All Batches', ...availableBatches]);
    } else {
      setSelectedBatches(next);
    }
  };

  const batchDisplayLabel = useMemo(() => {
    if (selectedBatches.includes('All Batches') || selectedBatches.length === availableBatches.length) {
      return `All Batches (${availableBatches.length})`;
    }
    if (selectedBatches.length === 0) {
      return 'Select target batches...';
    }
    return selectedBatches.join(', ');
  }, [selectedBatches, availableBatches]);

  const [url, setUrl] = useState(
    editingChallenge?.assessmentUrl ||
      'https://www.hackerrank.com/dudexai-coding-challenge-2'
  );

  const [description, setDescription] = useState(
    editingChallenge?.description || ''
  );

  if (!teacher) {
    return (
      <div className="p-6 bg-[#0B0B0B] min-h-screen text-[#F5F0EA]">
        <div className="rounded-2xl border border-[#3A2922] bg-[#171311] p-10 text-center text-[#A89A91]">
          Teacher not found.
        </div>
      </div>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      alert('Challenge title is required.');
      return;
    }

    const targetBatchString =
      selectedBatches.length === 0
        ? 'All Batches'
        : selectedBatches.includes('All Batches')
        ? 'All Batches'
        : selectedBatches.join(', ');

    if (isEdit && editingChallenge) {
      updateHackerRankChallenge(
        editingChallenge.id,
        {
          title,
          type: format,
          assessmentDate: date,
          startTime,
          duration: Number(duration),
          targetBatch: targetBatchString,
          assessmentUrl: url,
          description,
        }
      );
    } else {
      const nextNumber = hackerRankChallenges.length + 1;

      addHackerRankChallenge({
        id: `HR-${String(nextNumber).padStart(3, '0')}`,
        teacherId: teacher.id,
        title,
        type: format,
        subject:
          format === 'MCQ'
            ? 'General Programming'
            : 'Programming',
        difficulty: 'Medium',
        questions:
          format === 'MCQ' ? 20 : 5,
        duration: Number(duration),
        totalMarks: 30,
        status: 'Published',
        createdAt: new Date()
          .toISOString()
          .slice(0, 10),

        assessmentDate: date,
        startTime,
        targetBatch: targetBatchString,
        assessmentUrl: url,
        description,
      });
    }

    navigate(
      `/admin/teachers/hackerrank/${teacher.id}`
    );
  };

  return (
    <div className="min-h-full bg-[#0B0B0B] text-[#F5F0EA] p-4 sm:p-6 lg:p-8">

      <div className="mx-auto max-w-4xl">

        {/* BACK */}
        <button
          type="button"
          onClick={() =>
            navigate(
              `/admin/teachers/hackerrank/${teacher.id}`
            )
          }
          className="mb-5 flex items-center gap-2 text-xs font-semibold text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to HackerRank
        </button>

        {/* TEACHER INFO CARD */}
        <div className="mb-6 rounded-2xl border border-[#3A2922] bg-[#171311] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#2A1D17] to-[#140F0D] border border-[#946246]/40 font-bold text-[#D78B55] shadow-sm">
              {teacher.name
                .split(' ')
                .map((word) => word[0])
                .slice(0, 2)
                .join('')}
            </div>

            <div>
              <p className="text-xs font-semibold text-[#D78B55] uppercase tracking-wider">
                Teacher HackerRank
              </p>

              <h1 className="text-lg font-bold text-[#F5F0EA]">
                {teacher.name}
              </h1>

              <p className="text-xs text-[#A89A91]">
                {teacher.designation} · {teacher.department}
              </p>
            </div>
          </div>
        </div>

        {/* FORM */}
        <form
          onSubmit={submit}
          className="overflow-hidden rounded-2xl border border-[#3A2922] bg-[#171311] shadow-2xl"
        >

          {/* HEADER */}
          <div className="border-b border-[#3A2922] bg-[#140F0D] p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#2A1710] border border-[#946246]/40 p-2 text-[#D78B55]">
                <Code2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#F5F0EA]">
                  {isEdit
                    ? 'Edit HackerRank Challenge'
                    : 'Create New HackerRank Challenge'}
                </h2>

                <p className="mt-0.5 text-xs text-[#A89A91]">
                  Enter details, schedule and provide the HackerRank link.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">

            {/* TITLE */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                Challenge Title *
              </label>

              <input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="e.g. DudeXAI Coding Challenge 2"
                className="h-11 w-full rounded-xl border border-[#3A2922] bg-[#140F0D] px-4 text-sm text-[#F5F0EA] placeholder-[#5A453D] outline-none transition focus:border-[#946246] focus:ring-1 focus:ring-[#946246]"
              />
            </div>

            {/* FORMAT */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                Assessment Format
              </label>

              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    'Coding',
                    'MCQ',
                    'Coding + MCQ',
                  ] as const
                ).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setFormat(item)
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition cursor-pointer ${
                      format === item
                        ? 'border-[#946246] bg-[#946246] text-[#F5F0EA] shadow-md'
                        : 'border-[#3A2922] bg-[#140F0D] text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#1E1815]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* DATE / TIME */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                  Assessment Date *
                </label>

                <div className="relative">
                  <CalendarDays className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89A91] pointer-events-none" />

                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-[#3A2922] bg-[#140F0D] pl-10 pr-4 text-sm text-[#F5F0EA] outline-none transition focus:border-[#946246] focus:ring-1 focus:ring-[#946246] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                  Start Time *
                </label>

                <div className="relative">
                  <Clock3 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89A91] pointer-events-none" />

                  <input
                    value={startTime}
                    onChange={(event) =>
                      setStartTime(event.target.value)
                    }
                    placeholder="10:00 AM"
                    className="h-11 w-full rounded-xl border border-[#3A2922] bg-[#140F0D] pl-10 pr-4 text-sm text-[#F5F0EA] outline-none transition focus:border-[#946246] focus:ring-1 focus:ring-[#946246]"
                  />
                </div>
              </div>
            </div>

            {/* DURATION */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                Total Duration *
              </label>

              <div className="flex flex-wrap gap-2.5">
                {['30', '45', '60', '90', '120'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDuration(value)}
                    className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
                      duration === value
                        ? 'border-[#946246] bg-[#946246] text-[#F5F0EA] shadow-md'
                        : 'border-[#3A2922] bg-[#140F0D] text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#1E1815]'
                    }`}
                  >
                    {value} Mins
                  </button>
                ))}

                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    className="h-10 w-24 rounded-xl border border-[#3A2922] bg-[#140F0D] px-3 text-center text-sm text-[#F5F0EA] outline-none transition focus:border-[#946246]"
                  />
                  <span className="ml-2 text-xs text-[#A89A91]">Mins</span>
                </div>
              </div>
            </div>

            {/* TARGET BATCHES MULTI-SELECT DROPDOWN */}
            <div className="relative" ref={batchDropdownRef}>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                Target Batches (Multiple Select)
              </label>

              <button
                type="button"
                onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
                className="h-11 w-full rounded-xl border border-[#3A2922] bg-[#140F0D] px-4 text-left text-sm text-[#F5F0EA] flex items-center justify-between outline-none transition focus:border-[#946246] focus:ring-1 focus:ring-[#946246] cursor-pointer"
              >
                <span className="truncate">{batchDisplayLabel}</span>
                <ChevronDown
                  className={`h-4 w-4 text-[#A89A91] transition-transform duration-200 ${
                    isBatchDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isBatchDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl border border-[#3A2922] bg-[#1C1715] p-2 shadow-2xl backdrop-blur-md max-h-60 overflow-y-auto animate-in fade-in duration-150">
                  {/* Option: All Batches */}
                  <button
                    type="button"
                    onClick={() => handleToggleBatch('All Batches')}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold hover:bg-[#2A1E19] text-[#F5F0EA] transition-colors cursor-pointer"
                  >
                    {selectedBatches.includes('All Batches') || selectedBatches.length === availableBatches.length ? (
                      <CheckSquare className="h-4 w-4 text-[#946246] shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-[#A89A91] shrink-0" />
                    )}
                    <span>All Batches</span>
                  </button>

                  <div className="my-1 border-t border-[#2A1E19]" />

                  {/* Individual Batches */}
                  {availableBatches.map((bName) => {
                    const isChecked =
                      selectedBatches.includes('All Batches') || selectedBatches.includes(bName);
                    return (
                      <button
                        key={bName}
                        type="button"
                        onClick={() => handleToggleBatch(bName)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-medium hover:bg-[#2A1E19] text-[#F5F0EA] transition-colors cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-[#946246] shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-[#A89A91] shrink-0" />
                        )}
                        <span>{bName}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* URL */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                HackerRank / Assessment URL Link *
              </label>

              <div className="relative">
                <Link2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89A91] pointer-events-none" />

                <input
                  value={url}
                  onChange={(event) =>
                    setUrl(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-[#3A2922] bg-[#140F0D] pl-10 pr-4 text-sm text-[#F5F0EA] placeholder-[#5A453D] outline-none transition focus:border-[#946246] focus:ring-1 focus:ring-[#946246]"
                />
              </div>

              <p className="mt-2 text-[10px] text-[#A89A91]">
                Students will be redirected to this test URL when they click "Open Challenge".
              </p>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <FileText className="h-3.5 w-3.5 text-[#946246]" />
                Description / Instructions
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={4}
                placeholder="Provide test instructions, problem topics, or passing requirements..."
                className="w-full rounded-xl border border-[#3A2922] bg-[#140F0D] p-4 text-sm text-[#F5F0EA] placeholder-[#5A453D] outline-none transition focus:border-[#946246] focus:ring-1 focus:ring-[#946246]"
              />
            </div>

          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-end gap-3 border-t border-[#3A2922] bg-[#140F0D] p-5">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/admin/teachers/hackerrank/${teacher.id}`
                )
              }
              className="rounded-xl border border-[#3A2922] bg-[#171311] px-5 py-2.5 text-xs font-semibold text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#1E1815] transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-[#946246] hover:bg-[#7A4930] px-5 py-2.5 text-xs font-bold text-[#F5F0EA] transition shadow-md active:scale-95 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {isEdit
                ? 'Save Changes'
                : 'Create & Display'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
