import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { teacherService } from '../../services/teacherService';
import { teacherNoteService, TeacherNote } from '../../services/teacherNoteService';
import { Teacher } from '../../types';

const TeacherNotesDetailPage: React.FC = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState<Teacher | null>(() => {
    return teacherId ? teacherService.getTeacherById(teacherId) || null : null;
  });
  const [notes, setNotes] = useState<TeacherNote[]>(() => {
    return teacherId ? teacherNoteService.getNotesByTeacherId(teacherId) : [];
  });
  const [search, setSearch] = useState('');

  const refreshData = async () => {
    if (!teacherId) return;
    await teacherService.fetchTeachers();
    const t = teacherService.getTeacherById(teacherId);
    if (t) setTeacher(t);

    await teacherNoteService.fetchTeacherNotes();
    setNotes(teacherNoteService.getNotesByTeacherId(teacherId));
  };

  useEffect(() => {
    refreshData();

    const unsubT = teacherService.onChange(() => {
      if (teacherId) {
        const t = teacherService.getTeacherById(teacherId);
        if (t) setTeacher(t);
      }
    });

    const unsubN = teacherNoteService.onChange(() => {
      if (teacherId) {
        setNotes(teacherNoteService.getNotesByTeacherId(teacherId));
      }
    });

    const handler = () => refreshData();
    window.addEventListener('dudex_teachers_changed', handler);
    window.addEventListener('dudex_teacher_notes_changed', handler);

    return () => {
      unsubT();
      unsubN();
      window.removeEventListener('dudex_teachers_changed', handler);
      window.removeEventListener('dudex_teacher_notes_changed', handler);
    };
  }, [teacherId]);

  const filteredNotes = notes.filter((note) => {
    const query = search.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.subject.toLowerCase().includes(query) ||
      note.topic.toLowerCase().includes(query) ||
      note.batch.toLowerCase().includes(query)
    );
  });

  const getInitials = (name: string) =>
    name
      .replace(/^Dr\. |^Prof\. /, '')
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const handleDelete = async (noteId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this note?'
    );
    if (!confirmed) return;

    try {
      await teacherNoteService.deleteNote(noteId);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the note.');
      return;
    }
    if (teacherId) {
      setNotes(teacherNoteService.getNotesByTeacherId(teacherId));
    }
  };

  if (!teacher) {
    return (
      <div className="min-h-full bg-[#151515] p-8 text-[#F5F0EA]">
        <h1 className="text-xl font-semibold">Teacher not found</h1>
        <button
          onClick={() => navigate('/admin/teachers/notes')}
          className="mt-4 text-[#C07A4D] hover:underline"
        >
          Back to Teachers
        </button>
      </div>
    );
  }

  const effectiveTeacherId = teacher.teacherId || teacher.id;

  return (
    <div className="min-h-full bg-[#151515] px-6 py-6">
      {/* BACK */}
      <button
        type="button"
        onClick={() => navigate('/admin/teachers/notes')}
        className="mb-5 flex items-center gap-2 text-sm text-[#C07A4D] hover:text-[#D89A70]"
      >
        <ArrowLeft size={16} />
        Back to Teachers
      </button>

      {/* TEACHER HEADER */}
      <section className="rounded-xl border border-[#D8CFC3] bg-[#F7F3EC] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#D8CFC3] bg-[#F1E5D8] font-bold text-[#7A4930]">
              {getInitials(teacher.fullName)}
            </div>

            <div>
              <h1 className="text-xl font-semibold text-[#171717]">
                {teacher.fullName}
              </h1>
              <p className="mt-1 text-sm text-[#756E67]">
                {teacher.designation || 'Faculty Member'}
              </p>
              <div className="mt-2 flex gap-2">
                <span className="rounded-full bg-[#F1E4D8] px-3 py-1 text-xs font-medium text-[#8B4A27]">
                  {teacher.department || 'Academics'}
                </span>
                <span className="rounded-full border border-[#D8CFC3] bg-white px-3 py-1 text-xs text-[#756E67]">
                  {effectiveTeacherId}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-[#756E67]">Total Notes</p>
            <p className="mt-1 text-2xl font-semibold text-[#171717]">
              {notes.length}
            </p>
          </div>
        </div>
      </section>

      {/* NOTES HEADER */}
      <div className="mt-6 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F0EA]">Notes</h2>
          <p className="mt-1 text-sm text-[#A89A91]">
            Notes uploaded by {teacher.fullName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/admin/teachers/notes/${effectiveTeacherId}/new`)}
          className="flex items-center gap-2 rounded-lg bg-[#7A4930] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#946246]"
        >
          <Plus size={16} />
          Create Note
        </button>
      </div>

      {/* SEARCH */}
      <div className="mt-4 rounded-xl border border-[#D8CFC3] bg-[#F7F3EC] p-4">
        <div className="relative max-w-[460px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8178]"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes..."
            className="w-full rounded-lg border border-[#D8CFC3] bg-white py-2 pl-9 pr-3 text-sm text-[#171717] outline-none placeholder:text-[#9B938B] focus:border-[#8B4A27] focus:ring-1 focus:ring-[#8B4A27]"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="mt-3 overflow-hidden rounded-xl border border-[#D8CFC3] bg-[#F7F3EC]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D8CFC3] bg-[#EFE9E0]">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[#756E67]">
                  Note
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[#756E67]">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[#756E67]">
                  Topic
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[#756E67]">
                  Batch
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[#756E67]">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[#756E67]">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-[#756E67]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredNotes.map((note) => (
                <tr
                  key={note.id}
                  className="border-b border-[#E2DAD0] hover:bg-[#F0E9E0]"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1E4D8] text-[#8B4A27]">
                        <FileText size={15} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#171717]">
                          {note.title}
                        </p>
                        <p className="mt-1 max-w-[300px] truncate text-xs text-[#756E67]">
                          {note.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-[#49433E]">
                    {note.subject}
                  </td>

                  <td className="px-4 py-4 text-sm text-[#49433E]">
                    {note.topic}
                  </td>

                  <td className="px-4 py-4 text-sm text-[#49433E]">
                    {note.batch}
                  </td>

                  <td className="px-4 py-4 text-sm text-[#49433E]">
                    {note.noteDate}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={
                        note.status === 'Published'
                          ? 'rounded-full bg-[#DCEFE3] px-3 py-1 text-xs font-medium text-[#26734D]'
                          : 'rounded-full bg-[#F7E9B7] px-3 py-1 text-xs font-medium text-[#8A6812]'
                      }
                    >
                      {note.status}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        title="View"
                        onClick={() =>
                          navigate(
                            `/admin/teachers/notes/${effectiveTeacherId}/view/${note.id}`
                          )
                        }
                        className="rounded-md p-2 text-[#756E67] hover:bg-[#EDE3D7] hover:text-[#8B4A27]"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        title="Edit"
                        onClick={() =>
                          navigate(
                            `/admin/teachers/notes/${effectiveTeacherId}/edit/${note.id}`
                          )
                        }
                        className="rounded-md p-2 text-[#756E67] hover:bg-[#EDE3D7] hover:text-[#8B4A27]"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        title="Delete"
                        onClick={() => handleDelete(note.id)}
                        className="rounded-md p-2 text-[#756E67] hover:bg-[#F7E0DC] hover:text-[#A33A2B]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredNotes.length === 0 && (
          <div className="p-10 text-center text-sm text-[#756E67]">
            No notes found for this faculty member. Click &quot;Create Note&quot; to publish study materials.
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherNotesDetailPage;
