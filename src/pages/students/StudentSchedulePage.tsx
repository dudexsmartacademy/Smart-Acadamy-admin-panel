import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Layers,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  MapPin,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { getAcademicClasses, subscribeAcademicClasses } from '../../services/academicClassService';

export const StudentSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState(getAcademicClasses());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    return subscribeAcademicClasses(() => {
      setClasses([...getAcademicClasses()]);
    });
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Student Timetable & Schedule"
        description="Comprehensive master schedule of lectures, labs, and interactive seminars"
        breadcrumbs={[
          { label: 'Admin', path: '/admin/students/list' },
          { label: 'Students', path: '/admin/students/list' },
          { label: 'Schedule' },
        ]}
        actions={
          <div className="flex items-center gap-1 bg-[#140F0D] p-1 rounded-lg border border-[#3A2922]">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                viewMode === 'daily'
                  ? 'bg-[#5A321F] text-[#F1E5D8] shadow-sm'
                  : 'text-[#A89A91] hover:text-[#F5F0EA]'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                viewMode === 'weekly'
                  ? 'bg-[#5A321F] text-[#F1E5D8] shadow-sm'
                  : 'text-[#A89A91] hover:text-[#F5F0EA]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                viewMode === 'monthly'
                  ? 'bg-[#5A321F] text-[#F1E5D8] shadow-sm'
                  : 'text-[#A89A91] hover:text-[#F5F0EA]'
              }`}
            >
              Monthly
            </button>
          </div>
        }
      />

      {/* View: WEEKLY */}
      {viewMode === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map((day, dIdx) => {
            const dayClasses = classes.filter((_, idx) => idx % days.length === dIdx);
            return (
              <Card key={day} className="p-4 bg-[#140F0D] border-[#3A2922] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#2A1710]">
                    <h3 className="text-xs font-bold text-[#F5F0EA] uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-[#946246]" />
                      {day}
                    </h3>
                    <span className="text-[10px] text-[#A89A91] font-mono">
                      {dayClasses.length} {dayClasses.length === 1 ? 'Class' : 'Classes'}
                    </span>
                  </div>

                  {dayClasses.length === 0 ? (
                    <div className="text-[11px] text-[#A89A91]/60 italic py-6 text-center">
                      No classes scheduled
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dayClasses.map((cls) => (
                        <div
                          key={`${day}-${cls.id}`}
                          onClick={() => navigate(`/admin/classes/${cls.id}`)}
                          className="p-3 bg-[#1C1714] rounded-lg border border-[#2A1710] hover:border-[#5A321F]/60 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-[#F5F0EA] truncate">{cls.title}</span>
                            <StatusBadge status={cls.status} size="sm" />
                          </div>
                          <div className="text-[11px] text-[#946246] mt-0.5">{cls.courseName}</div>
                          <div className="flex items-center justify-between text-[11px] text-[#A89A91] mt-2 pt-2 border-t border-[#2A1710]">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-blue-400" /> {cls.teacherName}
                            </span>
                            <span className="font-mono text-[#F1E5D8]">Room {cls.classroom}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[#A89A91] font-mono mt-1">
                            <Clock className="w-3 h-3 text-[#946246]" /> {cls.startTime} - {cls.endTime}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* View: DAILY */}
      {viewMode === 'daily' && (
        <Card className="p-6 bg-[#140F0D] border-[#3A2922]">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#2A1710]">
            <div>
              <h3 className="text-base font-bold text-[#F5F0EA]">Today&apos;s Academic Schedule</h3>
              <p className="text-xs text-[#A89A91]">Active sessions for {new Date().toDateString()}</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#5A321F]/40 text-[#F1E5D8] border border-[#5A321F] text-xs font-mono font-bold">
              {classes.length} Sessions Total
            </span>
          </div>

          {classes.length === 0 ? (
            <div className="text-center py-12 text-[#A89A91]">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-[#946246]/50" />
              <p className="text-sm">No live or scheduled sessions found for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => navigate(`/admin/classes/${cls.id}`)}
                  className="p-4 bg-[#1C1714] rounded-xl border border-[#2A1710] hover:border-[#5A321F] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-[#2A1710] text-[#F1E5D8] font-mono text-center shrink-0">
                      <div className="text-xs font-bold">{cls.startTime}</div>
                      <div className="text-[10px] text-[#A89A91]">Start</div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#F5F0EA]">{cls.title}</h4>
                      <div className="text-xs text-[#A89A91] mt-0.5">
                        Course: {cls.courseName} • Subject: {cls.subjectName}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#A89A91] mt-1.5">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-blue-400" /> Instructor: {cls.teacherName}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[#946246]">
                          <MapPin className="w-3.5 h-3.5" /> Room {cls.classroom}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                    <StatusBadge status={cls.status} size="sm" />
                    <span className="text-xs font-mono text-[#A89A91]">
                      {cls.startTime} - {cls.endTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* View: MONTHLY */}
      {viewMode === 'monthly' && (
        <Card className="p-6 bg-[#140F0D] border-[#3A2922]">
          <h3 className="text-sm font-bold text-[#F5F0EA] mb-4">Monthly Lecture & Exam Calendar</h3>
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="font-bold text-[#A89A91] py-1 border-b border-[#2A1710]">
                {d}
              </div>
            ))}
            {Array.from({ length: 31 }).map((_, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg border text-left min-h-[70px] ${
                  i === 14 || i === 21
                    ? 'bg-[#2A1710]/40 border-[#5A321F]'
                    : 'bg-[#1C1714] border-[#2A1710]'
                }`}
              >
                <span className="font-mono text-[10px] text-[#A89A91] block">{i + 1}</span>
                {i % 3 === 0 && (
                  <span className="inline-block mt-1 text-[9px] px-1 py-0.2 rounded bg-[#5A321F] text-[#F1E5D8] truncate max-w-full">
                    Lecture
                  </span>
                )}
                {i === 15 && (
                  <span className="inline-block mt-1 text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 truncate max-w-full">
                    Midterm Exam
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
