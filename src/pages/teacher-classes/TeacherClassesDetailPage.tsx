import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Edit,
  ExternalLink,
  Plus,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  getClassesByTeacherId,
  getTeacherById,
  TeacherClassTeacher,
  TeacherClass,
} from '../../data/teacherClassesDemo';
import { teacherService } from '../../services/teacherService';
import { teacherClassService } from '../../services/teacherClassService';
import { supabaseAny } from '../../lib/supabase';

const TeacherClassesDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { teacherId } = useParams<{ teacherId: string }>();

  const [teacher, setTeacher] = useState<TeacherClassTeacher | undefined>(
    teacherId ? getTeacherById(teacherId) : undefined
  );
  const [classes, setClasses] = useState<TeacherClass[]>(
    teacherId ? getClassesByTeacherId(teacherId) : []
  );
  const [studentsPerBatch, setStudentsPerBatch] = useState<Map<string, number>>(new Map());
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Students per global batch, for the Students figure on each class card.
  useEffect(() => {
    void supabaseAny
      .from('student_profiles')
      .select('batch_name')
      .then(({ data }: { data: Array<{ batch_name: string | null }> | null }) => {
        const counts = new Map<string, number>();
        (data || []).forEach((r) => {
          if (r.batch_name) counts.set(r.batch_name, (counts.get(r.batch_name) || 0) + 1);
        });
        setStudentsPerBatch(counts);
      });
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete the live class "${title}"? Students will no longer see it.`)) return;
    setActionError('');
    setDeletingId(id);
    try {
      await teacherClassService.deleteClass(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete the live class.');
    } finally {
      setDeletingId(null);
    }
  };

  const reloadData = () => {
    if (teacherId) {
      setTeacher(getTeacherById(teacherId));
      setClasses(getClassesByTeacherId(teacherId));
    }
  };

  useEffect(() => {
    Promise.all([teacherService.fetchTeachers(), teacherClassService.fetchClasses()]).then(reloadData);
    const unsub = teacherService.onChange(reloadData);
    window.addEventListener('dudex_teachers_changed', reloadData);
    window.addEventListener('dudex_teacher_classes_changed', reloadData);

    return () => {
      unsub();
      window.removeEventListener('dudex_teachers_changed', reloadData);
      window.removeEventListener('dudex_teacher_classes_changed', reloadData);
    };
  }, [teacherId]);

  if (!teacher) {
    return (
      <div className="min-h-screen bg-[#171717] p-8 text-[#F7F3EC] flex flex-col items-center justify-center">
        <p className="text-lg">Loading teacher faculty profile...</p>
        <button
          onClick={() => navigate('/admin/teachers/classes')}
          className="mt-4 px-4 py-2 bg-[#6E351D] text-white rounded-lg text-sm"
        >
          Back to Teachers
        </button>
      </div>
    );
  }

  const batchesOf = (item: TeacherClass) => (item.batches.length ? item.batches.join(', ') : item.batch || 'No batch');
  const studentsOf = (item: TeacherClass) =>
    item.batches.length ? item.batches.reduce((sum, b) => sum + (studentsPerBatch.get(b) || 0), 0) : null;

  const filteredClasses = classes.filter((item) =>
    `${item.title} ${item.subject} ${batchesOf(item)}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const activeCount = classes.filter(
    (item) => item.status === 'Active'
  ).length;

  const upcomingCount = classes.filter(
    (item) => item.status === 'Upcoming'
  ).length;

  const completedCount = classes.filter(
    (item) => item.status === 'Completed'
  ).length;

  return (
    <div className="min-h-screen bg-[#171717] text-[#F7F3EC]">

      <main className="p-6">

        {/* Back */}
        <button
          onClick={() => navigate('/admin/teachers/classes')}
          className="mb-5 flex items-center gap-2 text-sm text-[#A9A098] hover:text-[#F7F3EC]"
        >
          <ArrowLeft size={16} />
          Back to Teachers
        </button>

        {/* Teacher header */}
        <div className="mb-6 rounded-xl border border-[#D8CFC3] bg-[#F7F3EC] p-6 text-[#171717]">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full overflow-hidden border border-[#B66A3C] bg-[#EFE1D2] font-semibold text-[#6E351D]">
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

              <div>
                <h1 className="text-2xl font-semibold">
                  {teacher.name}
                </h1>

                <p className="mt-1 text-sm text-[#756E67]">
                  {teacher.designation}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">

                  <span className="rounded-full bg-[#E9DDD0] px-3 py-1 text-xs text-[#71391F]">
                    {teacher.department}
                  </span>

                  <span className="rounded-full border border-[#CFC2B4] px-3 py-1 text-xs text-[#5F574F]">
                    {teacher.facultyId}
                  </span>

                </div>
              </div>

            </div>

            <div className="text-right">
              <p className="text-xs text-[#81776F]">
                Total Classes
              </p>

              <p className="text-3xl font-semibold">
                {classes.length}
              </p>
            </div>

          </div>

        </div>

        {/* Page heading */}
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">
              Live Classes
            </h2>

            <p className="mt-1 text-sm text-[#A9A098]">
              Classes created by {teacher.name}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/admin/teachers/classes/${teacher.id}/create`)}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#6E351D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#8B4A28] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Create Class
          </button>
        </div>

        {actionError && (
          <div role="alert" className="mb-5 rounded-lg border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {actionError}
          </div>
        )}

        {/* Statistics */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">

          <div className="rounded-xl border border-[#4A3326] bg-[#211E1C] p-5">
            <p className="text-xs uppercase tracking-wide text-[#81776F]">
              Active Classes
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {activeCount}
            </p>
          </div>

          <div className="rounded-xl border border-[#4A3326] bg-[#211E1C] p-5">
            <p className="text-xs uppercase tracking-wide text-[#81776F]">
              Upcoming
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {upcomingCount}
            </p>
          </div>

          <div className="rounded-xl border border-[#4A3326] bg-[#211E1C] p-5">
            <p className="text-xs uppercase tracking-wide text-[#81776F]">
              Completed
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {completedCount}
            </p>
          </div>

          <div className="rounded-xl border border-[#4A3326] bg-[#211E1C] p-5">
            <p className="text-xs uppercase tracking-wide text-[#81776F]">
              Total Classes
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {classes.length}
            </p>
          </div>

        </div>

        {/* Search */}
        <div className="mb-5 rounded-xl border border-[#4A3326] bg-[#211E1C] p-4">

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes..."
            className="w-full max-w-xl rounded-lg border border-[#574033] bg-[#171717] px-4 py-2.5 text-sm text-[#F7F3EC] outline-none placeholder:text-[#71665E] focus:border-[#8B4A28]"
          />

        </div>

        {/* Classes */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

          {filteredClasses.map((item) => (

            <div
              key={item.id}
              className="rounded-xl border border-[#D8CFC3] bg-[#F7F3EC] p-5 text-[#171717]"
            >

              {/* Header */}
              <div className="flex items-start justify-between">

                <div>
                  <div className="flex items-center gap-2">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFE1D2] text-[#6E351D]">
                      <Video size={17} />
                    </div>

                    <h3 className="font-semibold">
                      {item.title}
                    </h3>

                  </div>

                  <p className="mt-2 text-xs text-[#756E67]">
                    {item.subject || 'Subject not available'} • {batchesOf(item)}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    item.status === 'Active'
                      ? 'bg-[#DCEFE4] text-[#28704C]'
                      : item.status === 'Upcoming'
                      ? 'bg-[#F7E9C2] text-[#8A6515]'
                      : 'bg-[#E7E5E1] text-[#625C56]'
                  }`}
                >
                  {item.status}
                </span>

              </div>

              {item.description && (
                <p className="mt-4 text-sm leading-6 text-[#756E67]">
                  {item.description}
                </p>
              )}

              <div className="my-5 h-px bg-[#D8CFC3]" />

              {/* Information */}
              <div className="grid grid-cols-2 gap-4">

                <div className="flex items-center gap-2">
                  <CalendarDays
                    size={15}
                    className="text-[#8B4A28]"
                  />

                  <div>
                    <p className="text-[10px] uppercase text-[#81776F]">
                      Batch
                    </p>

                    <p className="text-sm">
                      {batchesOf(item)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock
                    size={15}
                    className="text-[#8B4A28]"
                  />

                  <div>
                    <p className="text-[10px] uppercase text-[#81776F]">
                      Schedule
                    </p>

                    <p className="text-sm">
                      {item.schedule || 'Not available'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users
                    size={15}
                    className="text-[#8B4A28]"
                  />

                  <div>
                    <p className="text-[10px] uppercase text-[#81776F]">
                      Students
                    </p>

                    <p className="text-sm">
                      {studentsOf(item) ?? 'Not available'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-[#81776F]">
                    Date
                  </p>

                  <p className="text-sm">
                    {item.date || 'Not available'}
                  </p>
                </div>

              </div>

              <div className="my-5 h-px bg-[#D8CFC3]" />

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2">

                <button
                  type="button"
                  onClick={() => navigate(`/admin/teachers/classes/${teacher.id}/edit/${item.id}`)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#CFC2B4] px-3 py-2 text-sm hover:bg-[#EFE5DA]"
                >
                  <Edit size={14} />
                  Edit
                </button>

                <button
                  onClick={() =>
                    item.meetLink && window.open(item.meetLink, '_blank', 'noopener,noreferrer')
                  }
                  disabled={!item.meetLink}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#171717] px-3 py-2 text-sm text-white enabled:hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ExternalLink size={14} />
                  Open Link
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.title)}
                  disabled={deletingId === item.id}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#D4AFA2] px-3 py-2 text-sm text-[#A94732] hover:bg-[#F3E2DC] disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {deletingId === item.id ? 'Deleting…' : 'Delete'}
                </button>

              </div>

            </div>

          ))}

        </div>

        {filteredClasses.length === 0 && (
          <div className="rounded-xl border border-[#4A3326] bg-[#211E1C] p-10 text-center">
            <p className="text-[#A9A098]">
              No classes found.
            </p>
          </div>
        )}

      </main>
    </div>
  );
};

export default TeacherClassesDetailPage;
