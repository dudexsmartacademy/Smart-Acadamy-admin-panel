import React, { useState, useEffect } from 'react';

import {
  CalendarCheck,
  ChevronRight,
  Clock,
  GraduationCap,
  Mail,
  ShieldCheck,
  Search,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';

import { teacherService } from '../../services/teacherService';
import { teacherAttendanceService } from '../../services/teacherAttendanceService';

import { Teacher } from '../../types';


export const TeacherAttendancePage: React.FC = () => {

  const navigate = useNavigate();

  const [teachers, setTeachers] = useState<Teacher[]>(teacherService.getTeachers());
  const [search, setSearch] = useState('');

  useEffect(() => {
    teacherService.fetchTeachers().then((data) => {
      if (data && data.length > 0) setTeachers(data);
    });
    teacherAttendanceService.fetchTeacherAttendance();

    const unsub = teacherService.onChange(() => {
      setTeachers([...teacherService.getTeachers()]);
    });
    const unsubAttendance = teacherAttendanceService.onChange(() => {
      setTeachers([...teacherService.getTeachers()]);
    });

    const handler = () => {
      setTeachers([...teacherService.getTeachers()]);
    };
    window.addEventListener('dudex_teachers_changed', handler);
    window.addEventListener('dudex_teacher_attendance_changed', handler);

    return () => {
      unsub();
      unsubAttendance();
      window.removeEventListener('dudex_teachers_changed', handler);
      window.removeEventListener('dudex_teacher_attendance_changed', handler);
    };
  }, []);

  const filteredTeachers = teachers.filter((t) =>
    `${t.fullName} ${t.teacherId} ${t.department} ${t.designation}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );


  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ================================================================ */}
      {/* PAGE HEADER                                                      */}
      {/* ================================================================ */}

      <PageHeader
        title="Teacher Attendance"
        description="Monitor faculty presence, track active teaching sessions, and review attendance logs."
        breadcrumbs={[
          {
            label: 'Teacher Management',
            path: '/admin/teachers',
          },
          {
            label: 'Teacher Attendance',
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-[#3A302B] bg-[#1C1A19]">
          <p className="text-xs uppercase text-[#8F8F96] tracking-wide">Total Faculty</p>
          <p className="text-2xl font-bold text-[#F5F5F5] mt-1">{teachers.length}</p>
        </Card>
        <Card className="p-4 border-[#3A302B] bg-[#1C1A19]">
          <p className="text-xs uppercase text-[#8F8F96] tracking-wide">Active Profiles</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{teachers.filter((t) => t.status === 'active').length}</p>
        </Card>
        <Card className="p-4 border-[#3A302B] bg-[#1C1A19]">
          <p className="text-xs uppercase text-[#8F8F96] tracking-wide">System Status</p>
          <p className="text-2xl font-bold text-[#D78B55] mt-1">Live Synced</p>
        </Card>
      </div>

      {/* ================================================================ */}
      {/* FACULTY SECTION                                                  */}
      {/* ================================================================ */}

      <div>

        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#F5F5F5]">
              Faculty Attendance Profiles
            </h2>
            <p className="text-sm text-[#A1A1AA] mt-1">
              Select a teacher to view their complete attendance history.
            </p>
          </div>
          {teachers.length > 0 && (
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B4A2B]" />
              <input
                type="text"
                placeholder="Search faculty..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#1C1A19] border border-[#4A3024] rounded-lg text-sm text-[#F5F5F5] placeholder-[#81776F] focus:outline-none focus:border-[#8B4A2B]"
              />
            </div>
          )}
        </div>


        {filteredTeachers.length === 0 ? (

          <Card className="p-10 text-center">

            <CalendarCheck
              className="
                w-10 h-10
                mx-auto
                text-[#8B4A2B]
              "
            />

            <p
              className="
                mt-4
                text-sm
                text-[#A1A1AA]
              "
            >
              {teachers.length === 0
                ? 'No faculty profiles found. Add teachers in Teacher Management to start tracking attendance.'
                : 'No faculty profiles match your search filter.'}
            </p>

          </Card>

        ) : (

          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-2
              xl:grid-cols-3
              gap-5
            "
          >

            {filteredTeachers.map((teacher) => (

              <TeacherAttendanceCard
                key={teacher.id}
                teacher={teacher}
                onClick={() =>
                  navigate(
                    `/admin/teachers/attendance/${teacher.id}`
                  )
                }
              />

            ))}

          </div>

        )}

      </div>

    </div>
  );
};


/* ========================================================================= */
/* TEACHER ATTENDANCE CARD                                                   */
/* ========================================================================= */

interface TeacherAttendanceCardProps {
  teacher: Teacher;
  onClick: () => void;
}


const TeacherAttendanceCard: React.FC<
  TeacherAttendanceCardProps
> = ({
  teacher,
  onClick,
}) => {
  const records = teacherAttendanceService.getAttendanceByTeacherId(teacher.id);
  const totalConsidered = records.filter((r) => r.status !== 'holiday').length;
  const presentOrLate = records.filter(
    (r) => r.status === 'present' || r.status === 'late'
  ).length;
  const rateValue = totalConsidered > 0
    ? Math.round((presentOrLate / totalConsidered) * 100)
    : (teacher.attendanceRate != null ? Math.round(teacher.attendanceRate) : 100);
  const displayRate = `${rateValue}%`;

  return (
    <Card
      onClick={onClick}
      hoverable
      className="
        group
        p-6
        cursor-pointer
        !bg-[#1C1A19]
        !border-[#4A3024]
        hover:!border-[#8B4A2B]
      "
    >

      {/* ================================================================ */}
      {/* TOP                                                               */}
      {/* ================================================================ */}

      <div
        className="
          flex
          items-start
          justify-between
        "
      >

        <Avatar
          src={teacher.avatar}
          name={teacher.fullName}
          size="xl"
        />


        <div
          className="
            w-9 h-9
            rounded-lg
            bg-[#3A2418]
            border border-[#5A321F]
            flex
            items-center
            justify-center
            group-hover:bg-[#5A321F]
            transition-colors
          "
        >
          <ChevronRight
            className="
              w-5 h-5
              text-[#D78B55]
            "
          />
        </div>

      </div>


      {/* ================================================================ */}
      {/* TEACHER                                                           */}
      {/* ================================================================ */}

      <div className="mt-5">

        <h3
          className="
            text-lg
            font-bold
            text-[#F5F5F5]
          "
        >
          {teacher.fullName}
        </h3>


        <p
          className="
            text-sm
            text-[#A1A1AA]
            mt-1
          "
        >
          {teacher.designation}
        </p>


        <div className="mt-3">

          <StatusBadge
            status={teacher.status}
            size="sm"
          />

        </div>

      </div>


      {/* ================================================================ */}
      {/* INFORMATION                                                       */}
      {/* ================================================================ */}

      <div
        className="
          mt-5
          pt-5
          border-t
          border-[#3A302B]
          space-y-3
        "
      >

        {/* Faculty ID */}
        <div
          className="
            flex
            items-center
            gap-3
          "
        >

          <div
            className="
              w-8 h-8
              rounded-lg
              bg-[#2A1A14]
              flex
              items-center
              justify-center
            "
          >
            <ShieldCheck
              className="
                w-4 h-4
                text-[#D78B55]
              "
            />
          </div>


          <div>

            <p
              className="
                text-[10px]
                uppercase
                tracking-wide
                text-[#8F8F96]
              "
            >
              Faculty ID
            </p>

            <p
              className="
                text-xs
                font-semibold
                text-[#F5F5F5]
              "
            >
              {teacher.teacherId}
            </p>

          </div>

        </div>


        {/* Department */}
        <div
          className="
            flex
            items-center
            gap-3
          "
        >

          <div
            className="
              w-8 h-8
              rounded-lg
              bg-[#2A1A14]
              flex
              items-center
              justify-center
            "
          >
            <GraduationCap
              className="
                w-4 h-4
                text-[#D78B55]
              "
            />
          </div>


          <div className="min-w-0">

            <p
              className="
                text-[10px]
                uppercase
                tracking-wide
                text-[#8F8F96]
              "
            >
              Department
            </p>

            <p
              className="
                text-xs
                font-semibold
                text-[#F5F5F5]
                truncate
              "
            >
              {teacher.department}
            </p>

          </div>

        </div>


        {/* Email */}
        <div
          className="
            flex
            items-center
            gap-3
          "
        >

          <div
            className="
              w-8 h-8
              rounded-lg
              bg-[#2A1A14]
              flex
              items-center
              justify-center
            "
          >
            <Mail
              className="
                w-4 h-4
                text-[#D78B55]
              "
            />
          </div>


          <div className="min-w-0">

            <p
              className="
                text-[10px]
                uppercase
                tracking-wide
                text-[#8F8F96]
              "
            >
              Email
            </p>

            <p
              className="
                text-xs
                text-[#D4D4D8]
                truncate
              "
            >
              {teacher.email}
            </p>

          </div>

        </div>


        {/* Attendance Rate */}
        <div
          className="
            flex
            items-center
            gap-3
          "
        >

          <div
            className="
              w-8 h-8
              rounded-lg
              bg-[#2A1A14]
              flex
              items-center
              justify-center
            "
          >
            <Clock
              className="
                w-4 h-4
                text-[#D78B55]
              "
            />
          </div>


          <div>

            <p
              className="
                text-[10px]
                uppercase
                tracking-wide
                text-[#8F8F96]
              "
            >
              Attendance Rate
            </p>

            <p
              className={`
                text-xs
                font-semibold
                ${rateValue >= 85 ? 'text-emerald-400' : rateValue >= 75 ? 'text-amber-400' : 'text-rose-400'}
              `}
            >
              {displayRate}
            </p>

          </div>

        </div>

      </div>


      {/* ================================================================ */}
      {/* FOOTER                                                            */}
      {/* ================================================================ */}

      <div
        className="
          mt-5
          pt-4
          border-t
          border-[#3A302B]
          flex
          items-center
          justify-between
        "
      >

        <span
          className="
            text-xs
            font-semibold
            text-[#D78B55]
          "
        >
          View Attendance
        </span>


        <span
          className="
            text-xs
            text-[#8F8F96]
          "
        >
          90 Days
        </span>

      </div>

    </Card>
  );
};
