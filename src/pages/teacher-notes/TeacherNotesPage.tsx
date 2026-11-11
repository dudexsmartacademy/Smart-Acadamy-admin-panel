import React, { useState, useEffect } from 'react';
import { Eye, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { teacherService } from '../../services/teacherService';
import { teacherNoteService } from '../../services/teacherNoteService';
import { Teacher } from '../../types';

const TeacherNotesPage: React.FC = () => {
  const navigate = useNavigate();

  const [teachers, setTeachers] = useState<Teacher[]>(teacherService.getTeachers());
  const [notesCount, setNotesCount] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  const refreshData = async () => {
    const tList = await teacherService.fetchTeachers();
    if (tList && tList.length > 0) setTeachers(tList);

    const allNotes = await teacherNoteService.fetchTeacherNotes();
    const counts: Record<string, number> = {};
    allNotes.forEach((n) => {
      counts[n.teacherId] = (counts[n.teacherId] || 0) + 1;
    });
    setNotesCount(counts);
  };

  useEffect(() => {
    refreshData();

    const unsubT = teacherService.onChange(() => {
      setTeachers(teacherService.getTeachers());
    });

    const unsubN = teacherNoteService.onChange(() => {
      const allNotes = teacherNoteService.getNotes();
      const counts: Record<string, number> = {};
      allNotes.forEach((n) => {
        counts[n.teacherId] = (counts[n.teacherId] || 0) + 1;
      });
      setNotesCount(counts);
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
  }, []);

  const getInitials = (name: string) =>
    name
      .replace(/^Dr\. |^Prof\. /, '')
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const filteredTeachers = teachers.filter((t) =>
    `${t.fullName} ${t.teacherId} ${t.department} ${t.designation}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-[#151515] px-6 py-6 text-[#171717]">
      {/* PAGE HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#946246]">
            Teacher Management
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[#F5F0EA]">
            Teacher Notes
          </h1>
          <p className="mt-1 text-sm text-[#A89A91]">
            Select a faculty member to manage and browse their lecture notes and study material.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#756E67]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teachers or departments..."
            className="w-full rounded-xl border border-[#4A3428] bg-[#1C1917] py-2 pl-9 pr-4 text-sm text-[#F5F0EA] placeholder-[#756E67] focus:border-[#7A4930] focus:outline-none"
          />
        </div>
      </div>

      {/* TEACHER CARDS */}
      {filteredTeachers.length === 0 ? (
        <div className="rounded-xl border border-[#4A3428] bg-[#1C1917] p-8 text-center text-[#A89A91]">
          <FileText size={36} className="mx-auto mb-3 text-[#756E67]" />
          <p className="text-base font-semibold text-[#F5F0EA]">No faculty members found</p>
          <p className="mt-1 text-sm">Add teachers from the Teacher Directory to manage notes.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          {filteredTeachers.map((teacher) => {
            const count =
              notesCount[teacher.id] ||
              notesCount[teacher.teacherId] ||
              notesCount[teacher.userId || ''] ||
              teacherNoteService.getNotesByTeacherId(teacher.id).length;

            return (
              <div
                key={teacher.id || teacher.teacherId}
                className="rounded-xl border border-[#4A3428] bg-[#1C1917] p-5 shadow-sm transition hover:border-[#7A4930]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#7A4930] bg-[#F1E5D8] text-sm font-bold text-[#7A4930]">
                      {getInitials(teacher.fullName)}
                    </div>
                    <div>
                      <h2 className="font-semibold text-[#F5F0EA]">
                        {teacher.fullName}
                      </h2>
                      <p className="mt-1 text-xs text-[#A89A91]">
                        {teacher.designation || 'Faculty Member'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/admin/teachers/notes/${teacher.teacherId || teacher.id}`)}
                    className="rounded-lg bg-[#5A321F] p-2 text-[#F1E5D8] transition hover:bg-[#7A4930]"
                    title="View Notes"
                  >
                    <Eye size={16} />
                  </button>
                </div>

                <div className="mt-5 border-t border-[#3A2922] pt-4">
                  <span className="inline-flex rounded-full bg-[#2A1710] px-3 py-1 text-xs font-medium text-[#D8B59C]">
                    {teacher.department || 'Academics'}
                  </span>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[#756E67]">
                        Faculty ID
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#F5F0EA]">
                        {teacher.teacherId || teacher.id}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[#756E67]">
                        Total Notes
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#F5F0EA]">
                        {count}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-[#3A2922] pt-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/teachers/notes/${teacher.teacherId || teacher.id}`)}
                    className="text-sm font-medium text-[#C07A4D] hover:text-[#D89A70]"
                  >
                    View Notes →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherNotesPage;
