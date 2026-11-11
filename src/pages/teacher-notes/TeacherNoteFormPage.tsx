import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Paperclip,
  Save,
  Upload,
  X,
} from 'lucide-react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import { teacherService } from '../../services/teacherService';
import { teacherNoteService } from '../../services/teacherNoteService';
import { BatchChecklist } from '../../components/common/BatchChecklist';

const TeacherNoteForm: React.FC = () => {
  const { teacherId, noteId } = useParams();
  const navigate = useNavigate();

  const isEditMode = Boolean(noteId);

  const teacher = useMemo(() => {
    return teacherId ? teacherService.getTeacherById(teacherId) : undefined;
  }, [teacherId]);

  const existingNote = useMemo(
    () => noteId ? teacherNoteService.getNoteById(noteId) : undefined,
    [noteId]
  );

  const [noteDate, setNoteDate] = useState(existingNote?.noteDate || new Date().toISOString().split('T')[0]);
  const [batches, setBatches] = useState<string[]>([]);
  const [title, setTitle] = useState(existingNote?.title || '');
  const [subject, setSubject] = useState(existingNote?.subject || '');
  const [topic, setTopic] = useState(existingNote?.topic || '');
  const [description, setDescription] = useState(existingNote?.description || '');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Subjects this teacher already used, offered as suggestions.
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    teacherNoteService.getNotesByTeacherId(teacherId).forEach((n) => n.subject && set.add(n.subject));
    return Array.from(set);
  }, [teacherId]);

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles((previous) => [...previous, ...selectedFiles]);
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!noteDate || !title.trim() || !subject.trim() || !description.trim()) {
      setError('Please complete all required fields.');
      return;
    }
    if (!isEditMode && batches.length === 0) {
      setError('Select at least one batch.');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && noteId) {
        await teacherNoteService.updateNote(noteId, { title, subject, topic, description, noteDate });
      } else {
        await teacherNoteService.createNote({
          teacherId: teacherId || '',
          batches,
          title,
          subject,
          topic,
          description,
          noteDate,
          files,
        });
      }
      navigate(`/admin/teachers/notes/${teacherId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the note.');
    } finally {
      setSaving(false);
    }
  };

  if (!teacher) {
    return (
      <div className="min-h-full bg-[#151515] p-8 text-[#F5F0EA]">
        Teacher not found.
      </div>
    );
  }

  const effectiveTeacherId = teacher.teacherId || teacher.id;

  return (
    <div className="min-h-full bg-[#F7F3EC] px-6 py-6">
      {/* TOP */}
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(`/admin/teachers/notes/${effectiveTeacherId}`)}
          className="flex items-center gap-2 text-sm text-[#7A4930] hover:text-[#946246]"
        >
          <ArrowLeft size={16} />
          Back to Notes
        </button>
      </div>

      {/* PAGE TITLE */}
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#946246]">
          Teacher Notes
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#171717]">
          {isEditMode ? 'Edit Note' : 'Create Note'}
        </h1>
        <p className="mt-1 text-sm text-[#756E67]">
          {isEditMode
            ? 'Update the note details and attachments.'
            : 'Create a note for an authorized batch and subject.'}
        </p>
      </div>

      {/* TEACHER IDENTIFICATION */}
      <div className="mb-5 rounded-xl border border-[#D8CFC3] bg-[#EFE9E0] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#756E67]">
          Faculty
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="font-semibold text-[#171717]">
            {teacher.fullName}
          </span>
          <span className="rounded-full bg-[#F1E4D8] px-3 py-1 text-xs font-medium text-[#8B4A27]">
            {teacher.department || 'Academics'}
          </span>
          <span className="rounded-full border border-[#D8CFC3] bg-white px-3 py-1 text-xs text-[#756E67]">
            {effectiveTeacherId}
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-5 rounded-lg border border-[#E3B5AB] bg-[#F9E6E1] px-4 py-3 text-sm text-[#A33A2B]">
          {error}
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-[#D8CFC3] bg-[#F7F3EC] p-6"
      >
        {/* DATE + BATCH */}
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#49433E]">
              Note Date
            </label>
            <div className="relative">
              <CalendarDays
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#756E67]"
              />
              <input
                type="date"
                value={noteDate}
                onChange={(event) => setNoteDate(event.target.value)}
                className="w-full rounded-lg border border-[#D8CFC3] bg-white px-3 py-2.5 text-sm text-[#171717] outline-none focus:border-[#8B4A27] focus:ring-1 focus:ring-[#8B4A27]"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#49433E]">
              Batch
            </label>
            {isEditMode ? (
              <input
                value={existingNote?.batch || ''}
                disabled
                className="w-full rounded-lg border border-[#D8CFC3] bg-[#EFE9E0] px-3 py-2.5 text-sm text-[#756E67]"
              />
            ) : (
              <BatchChecklist values={batches} onChange={setBatches} />
            )}
          </div>
        </div>

        {/* TITLE */}
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-[#49433E]">
            Title
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter note title"
            className="w-full rounded-lg border border-[#D8CFC3] bg-white px-3 py-2.5 text-sm text-[#171717] outline-none placeholder:text-[#9B938B] focus:border-[#8B4A27] focus:ring-1 focus:ring-[#8B4A27]"
            required
          />
        </div>

        {/* SUBJECT + TOPIC */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#49433E]">
              Subject
            </label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              list="note-subjects"
              placeholder="Select or type a subject"
              className="w-full rounded-lg border border-[#D8CFC3] bg-white px-3 py-2.5 text-sm text-[#171717] outline-none placeholder:text-[#9B938B] focus:border-[#8B4A27]"
              required
            />
            <datalist id="note-subjects">
              {availableSubjects.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#49433E]">
              Topic
            </label>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Enter topic"
              className="w-full rounded-lg border border-[#D8CFC3] bg-white px-3 py-2.5 text-sm text-[#171717] outline-none placeholder:text-[#9B938B] focus:border-[#8B4A27] focus:ring-1 focus:ring-[#8B4A27]"
            />
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-[#49433E]">
            Description
          </label>
          <textarea
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Enter note description"
            className="w-full resize-none rounded-lg border border-[#D8CFC3] bg-white px-3 py-3 text-sm text-[#171717] outline-none placeholder:text-[#9B938B] focus:border-[#8B4A27] focus:ring-1 focus:ring-[#8B4A27]"
            required
          />
        </div>

        {/* ATTACHMENTS */}
        {!isEditMode && <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-[#49433E]">
            Attachments
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#CBBDAF] bg-white px-6 py-10 transition hover:border-[#8B4A27] hover:bg-[#FBF8F3]">
            <Upload size={24} className="text-[#8B4A27]" />
            <p className="mt-3 text-sm font-medium text-[#49433E]">
              Upload PDF, documents, or images
            </p>
            <p className="mt-1 text-xs text-[#756E67]">
              Multiple PDFs, documents, or images can be attached
            </p>
            <span className="mt-4 rounded-lg border border-[#D8CFC3] bg-white px-4 py-2 text-xs font-medium text-[#49433E]">
              Choose Files
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={handleFiles}
              className="hidden"
            />
          </label>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-[#D8CFC3] bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Paperclip size={16} className="text-[#8B4A27]" />
                    <div>
                      <p className="text-sm font-medium text-[#171717]">
                        {file.name}
                      </p>
                      {file.size > 0 && (
                        <p className="text-xs text-[#756E67]">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="rounded-md p-1.5 text-[#756E67] hover:bg-[#F7E0DC] hover:text-[#A33A2B]"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>}

        {/* ACTIONS */}
        <div className="mt-6 flex justify-end gap-3 border-t border-[#D8CFC3] pt-5">
          <button
            type="button"
            onClick={() => navigate(`/admin/teachers/notes/${effectiveTeacherId}`)}
            className="rounded-lg border border-[#D8CFC3] bg-white px-5 py-2.5 text-sm font-medium text-[#49433E] hover:bg-[#EFE9E0]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#7A4930] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#946246] disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? 'Saving…' : isEditMode ? 'Save Changes' : batches.length > 1 ? `Publish to ${batches.length} Batches` : 'Save Note'}
          </button>
        </div>
      </form>
    </div>
  );
};

/** Loads the teacher list and notes first, so the form also works on a direct page load. */
const TeacherNoteFormPage: React.FC = () => {
  const { teacherId, noteId } = useParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([teacherService.fetchTeachers(), teacherNoteService.fetchTeacherNotes()]).finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return <div className="min-h-full bg-[#F7F3EC] p-8 text-sm text-[#756E67]">Loading…</div>;
  }
  return <TeacherNoteForm key={`${teacherId}-${noteId || 'new'}`} />;
};

export default TeacherNoteFormPage;
