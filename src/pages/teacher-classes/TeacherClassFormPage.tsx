import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Save,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface Teacher {
  id: string;
  name: string;
  designation: string;
  department: string;
  facultyId?: string;
}


const TeacherHeader: React.FC<{ teacher: Teacher }> = ({ teacher }) => {
  const initials = teacher.name
    .replace('Dr. ', '')
    .replace('Prof. ', '')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className="
        rounded-xl
        border border-[#4b392e]
        bg-[#241f1c]
        px-5 py-4
        shadow-sm
      "
    >
      <div className="flex items-center gap-4">
        <div
          className="
            flex h-12 w-12 shrink-0 items-center justify-center
            rounded-full
            border border-[#d9b58f]
            bg-[#f5eadc]
            text-sm font-semibold
            text-[#8b4f2b]
          "
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#bda894]">
            Faculty
          </div>

          <h1 className="text-base font-semibold text-[#f8f1e8]">
            {teacher.name}
          </h1>

          <p className="mt-0.5 text-xs text-[#b9aaa0]">
            {teacher.designation}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="
                rounded-full
                border border-[#5b3d2b]
                bg-[#30231d]
                px-2.5 py-1
                text-[10px] font-medium
                text-[#d7a477]
              "
            >
              {teacher.department}
            </span>

            <span
              className="
                rounded-full
                border border-[#6b5749]
                bg-[#2b2724]
                px-2.5 py-1
                text-[10px] font-medium
                text-[#d8ccc3]
              "
            >
              {teacher.facultyId || teacher.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

import { teacherService } from '../../services/teacherService';
import { teacherClassService, type LiveSessionInput } from '../../services/teacherClassService';
import { BatchChecklist } from '../../components/common/BatchChecklist';

const TeacherClassesFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { teacherId, classId } = useParams<{
    teacherId: string;
    classId?: string;
  }>();

  const isEdit = Boolean(classId);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [teacherUserId, setTeacherUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [batches, setBatches] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [classDate, setClassDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        await Promise.all([
          teacherService.fetchTeachers(),
          teacherClassService.fetchClasses(),
        ]);
        if (!active) return;

        const loadedTeacher = teacherId
          ? teacherService.getTeacherById(teacherId)
          : undefined;
        if (!loadedTeacher) {
          setTeacher(null);
          setLoadError('The requested teacher profile was not found in the database.');
          return;
        }

        const formattedTeacher = {
          id: loadedTeacher.id,
          name: loadedTeacher.fullName,
          designation: loadedTeacher.designation || '',
          department: loadedTeacher.department || '',
          facultyId: loadedTeacher.teacherId,
        };
        setTeacher(formattedTeacher);

        // live_classes.teacher_id is the teacher's auth user id.
        setTeacherUserId(loadedTeacher.userId || '');

        if (classId) {
          const loadedClass = teacherClassService
            .getClassesByTeacherId(teacherId || '')
            .find((item) => item.id === classId);
          if (!loadedClass) {
            setLoadError('The requested class was not found for this teacher.');
            return;
          }
          setTitle(loadedClass.title);
          setBatches(loadedClass.batches || []);
          setSubject(loadedClass.subject);
          setClassDate(loadedClass.date || '');
          setStartTime(loadedClass.startTime || '');
          setEndTime(loadedClass.endTime || '');
          setMeetingUrl(loadedClass.meetLink || '');
          setDescription(loadedClass.topic && loadedClass.topic !== loadedClass.subject ? loadedClass.topic : '');
        }

      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load class data.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [teacherId, classId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmissionError('');

    if (!teacher || !teacherUserId) {
      setSubmissionError('This teacher has no linked login account, so live classes cannot be scheduled.');
      return;
    }
    if (batches.length === 0) {
      setSubmissionError('Select at least one batch.');
      return;
    }
    if (!startTime || !endTime || endTime <= startTime) {
      setSubmissionError('Enter a start time and an end time after it.');
      return;
    }
    if (!/^https?:\/\//i.test(meetingUrl.trim())) {
      setSubmissionError('Enter the meeting link (starting with https://).');
      return;
    }

    const input: LiveSessionInput = {
      batches,
      teacherUserId,
      teacherName: teacher.name,
      title,
      subject,
      topic: description,
      date: classDate,
      startTime,
      endTime,
      meetLink: meetingUrl,
      platform: /zoom\./i.test(meetingUrl) ? 'Zoom' : /teams\./i.test(meetingUrl) ? 'Microsoft Teams' : 'Google Meet',
    };

    setSaving(true);
    try {
      if (isEdit && classId) {
        await teacherClassService.updateClass(classId, input);
      } else {
        await teacherClassService.createClass(input);
      }
      navigate(`/admin/teachers/classes/${teacher.id}`);
    } catch (err) {
      setSubmissionError(err instanceof Error ? err.message : 'Failed to save class.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(teacher ? `/admin/teachers/classes/${teacher.id}` : '/admin/teachers/classes');
  };

  if (loading) {
    return <div className="min-h-screen bg-[#191715] p-8 text-center text-[#f8f1e8]">Loading teacher profile…</div>;
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-[#191715] p-8 text-center text-[#f8f1e8]">
        <p>{loadError || 'Teacher profile is unavailable.'}</p>
        <button type="button" onClick={handleCancel} className="mt-4 rounded-lg bg-[#6E351D] px-4 py-2 text-sm">
          Back to Classes
        </button>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#191715] p-8 text-center text-[#f8f1e8]">
        <p>{loadError}</p>
        <button type="button" onClick={handleCancel} className="mt-4 rounded-lg bg-[#6E351D] px-4 py-2 text-sm">
          Back to Classes
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#191715] text-[#201b18]">
      <main className="mx-auto w-full max-w-[930px] px-6 py-6">
        {/* Back */}
        <button
          type="button"
          onClick={handleCancel}
          className="
            mb-5 inline-flex items-center gap-2
            text-xs font-medium
            text-[#c9b9aa]
            transition-colors
            hover:text-[#e5c09d]
          "
        >
          <ArrowLeft size={14} />
          Back to Classes
        </button>

        {/* Teacher */}
        <TeacherHeader teacher={teacher} />

        {submissionError && (
          <div role="alert" className="mt-3 rounded-lg border border-red-700/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {submissionError}
          </div>
        )}

        {/* Form Card */}
        <div
          className="
            mt-3
            overflow-hidden
            rounded-xl
            border border-[#dfd4c7]
            bg-[#f7f2ea]
            shadow-sm
          "
        >
          {/* Header */}
          <div className="border-b border-[#e1d7cc] px-6 py-4">
            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-9 w-9 items-center justify-center
                  rounded-lg
                  bg-[#eee3d5]
                  text-[#8b4f2b]
                "
              >
                <Building2 size={17} />
              </div>

              <div>
                <h2 className="text-base font-semibold text-[#211d1a]">
                  {isEdit ? 'Edit Class' : 'Create New Class'}
                </h2>

                <p className="mt-0.5 text-xs text-[#756a62]">
                  {isEdit
                    ? 'Update class information and schedule'
                    : 'Configure details and schedule for a new class section'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5">
              {/* Class Name */}
              <div>
                <label className="mb-2 block text-xs font-medium text-[#3d352f]">
                  Class Name / Title *
                </label>

                <input
                  required
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="e.g. Advanced Machine Learning"
                  className="
                    h-10 w-full rounded-lg
                    border border-[#d8cec2]
                    bg-[#fffdfa]
                    px-3
                    text-sm text-[#28221e]
                    outline-none
                    placeholder:text-[#a69a90]
                    focus:border-[#9a6744]
                    focus:ring-2 focus:ring-[#9a6744]/10
                  "
                />
              </div>

              {/* Batch + Subject */}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#3d352f]">
                    Batches *
                  </label>

                  <BatchChecklist values={batches} onChange={setBatches} />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-[#3d352f]">
                    Subject *
                  </label>

                  <input
                    required
                    value={subject}
                    onChange={(event) =>
                      setSubject(event.target.value)
                    }
                    placeholder="e.g. Python Programming"
                    className="
                      h-10 w-full rounded-lg
                      border border-[#d8cec2]
                      bg-[#fffdfa]
                      px-3
                      text-sm text-[#28221e]
                      outline-none
                      placeholder:text-[#a69a90]
                      focus:border-[#9a6744]
                      focus:ring-2 focus:ring-[#9a6744]/10
                    "
                  />
                </div>
              </div>

              {/* Date + Schedule */}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#3d352f]">
                    Select Date *
                  </label>

                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={classDate}
                    onChange={(event) =>
                      setClassDate(event.target.value)
                    }
                    className="
                      h-10 w-full rounded-lg
                      border border-[#d8cec2]
                      bg-[#fffdfa]
                      px-3
                      text-sm text-[#28221e]
                      outline-none
                      focus:border-[#9a6744]
                      focus:ring-2 focus:ring-[#9a6744]/10
                      cursor-pointer
                    "
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-[#3d352f]">
                    Start Time – End Time *
                  </label>

                  <div className="flex items-center gap-2">
                    {[
                      { value: startTime, set: setStartTime, label: 'Start time' },
                      { value: endTime, set: setEndTime, label: 'End time' },
                    ].map((field) => (
                      <input
                        key={field.label}
                        type="time"
                        required
                        aria-label={field.label}
                        value={field.value}
                        onChange={(event) => field.set(event.target.value)}
                        className="
                          h-10 w-full rounded-lg
                          border border-[#d8cec2]
                          bg-[#fffdfa]
                          px-3
                          text-sm text-[#28221e]
                          outline-none
                          focus:border-[#9a6744]
                          focus:ring-2 focus:ring-[#9a6744]/10
                        "
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Meeting URL */}
              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-[#3d352f]">
                  Meet Link / Online Class URL *
                </label>

                <input
                  type="url"
                  required
                  value={meetingUrl}
                  onChange={(event) =>
                    setMeetingUrl(event.target.value)
                  }
                  placeholder="e.g. https://meet.google.com/abc-defg-hij or Zoom link"
                  className="
                    h-10 w-full rounded-lg
                    border border-[#d8cec2]
                    bg-[#fffdfa]
                    px-3
                    text-sm text-[#28221e]
                    outline-none
                    placeholder:text-[#a69a90]
                    focus:border-[#9a6744]
                    focus:ring-2 focus:ring-[#9a6744]/10
                  "
                />
              </div>

              {/* Description */}
              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-[#3d352f]">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Provide a brief overview of course objectives and syllabus..."
                  className="
                    w-full resize-none rounded-lg
                    border border-[#d8cec2]
                    bg-[#fffdfa]
                    px-3 py-2.5
                    text-sm text-[#28221e]
                    outline-none
                    placeholder:text-[#a69a90]
                    focus:border-[#9a6744]
                    focus:ring-2 focus:ring-[#9a6744]/10
                  "
                />
              </div>
            </div>

            {/* Footer */}
            <div
              className="
                flex items-center justify-end gap-3
                border-t border-[#e1d7cc]
                px-6 py-4
              "
            >
              <button
                type="button"
                onClick={handleCancel}
                className="
                  rounded-lg
                  border border-[#d4c8bb]
                  bg-[#fffdfa]
                  px-4 py-2
                  text-xs font-medium
                  text-[#514840]
                  transition-colors
                  hover:bg-[#f1e9df]
                "
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="
                  inline-flex items-center gap-2
                  rounded-lg
                  bg-[#1f2020]
                  px-4 py-2
                  text-xs font-semibold
                  text-white
                  transition-colors
                  hover:bg-[#302f2d]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <Save size={14} />
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Class'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default TeacherClassesFormPage;
