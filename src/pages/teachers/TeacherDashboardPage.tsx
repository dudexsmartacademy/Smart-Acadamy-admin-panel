import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  FileCheck2,
  CalendarCheck,
  BookOpen,
  Layers,
  Activity,
  UserCheck,
  ArrowRight,
  TrendingUp,
  Award,
  Clock,
  Sparkles,
  Search,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Avatar } from '../../components/common/Avatar';
import { teacherService } from '../../services/teacherService';
import { teacherApplicationService } from '../../services/teacherApplicationService';
import { teacherAttendanceService } from '../../services/teacherAttendanceService';
import { teacherLeaveService } from '../../services/teacherLeaveService';
import { teacherCourseService } from '../../services/teacherCourseService';
import { teacherClassService } from '../../services/teacherClassService';

export const TeacherDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const teachers = useMemo(() => teacherService.getTeachers(), []);
  const applications = useMemo(() => teacherApplicationService.getApplications(), []);
  const attendances = useMemo(() => teacherAttendanceService.getAttendanceRecords(), []);
  const leaves = useMemo(() => teacherLeaveService.getLeaveRequests(), []);
  const courses = useMemo(() => teacherCourseService.getCourses(), []);
  const classes = useMemo(() => teacherClassService.getClasses(), []);

  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter((t) => t.status === 'active').length;
  const inactiveTeachers = teachers.filter((t) => t.status !== 'active').length;
  const pendingApps = applications.filter((a) => a.status === 'pending').length;
  const todayAtt = teacherAttendanceService.getTodaySummary();
  const pendingLeaves = leaves.filter((l) => l.status === 'pending').length;
  const reportedAttendanceRates = teachers
    .map((teacher) => teacher.attendanceRate)
    .filter((rate): rate is number => typeof rate === 'number');
  const avgAttendance = reportedAttendanceRates.length > 0
    ? Math.round(reportedAttendanceRates.reduce((sum, rate) => sum + rate, 0) / reportedAttendanceRates.length)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty & Teacher Management"
        description="Oversee faculty assignments, attendance compliance, recruitment pipelines, and instructional analytics."
        breadcrumbs={[{ label: 'Teacher Management' }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/teachers/profiles')}
              leftIcon={<Search className="w-4 h-4 text-[#946246]" />}
            >
              Search Faculty
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/admin/teachers/new')}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Add New Faculty
            </Button>
          </div>
        }
      />

      {/* Primary Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total Faculty Staff"
          value={totalTeachers}
          icon={<Users className="w-5 h-5 text-[#946246]" />}
          secondaryInfo={`${activeTeachers} Active • ${inactiveTeachers} Inactive`}
          to="/admin/teachers/profiles"
        />

        <StatCard
          label="Pending Applications"
          value={pendingApps}
          icon={<FileCheck2 className="w-5 h-5 text-amber-400" />}
          secondaryInfo="Awaiting administrative review"
          trend={{ value: `${pendingApps} new`, isPositive: pendingApps > 0 }}
          to="/admin/teachers/applications"
        />

        <StatCard
          label="Present Today"
          value={todayAtt.present}
          icon={<CalendarCheck className="w-5 h-5 text-emerald-400" />}
          secondaryInfo={`${todayAtt.late} Late • ${todayAtt.onLeave} on Leave`}
          to="/admin/teachers/attendance"
        />

        <StatCard
          label="Average Attendance"
          value={avgAttendance === null ? 'Not available' : `${avgAttendance}%`}
          icon={<TrendingUp className="w-5 h-5 text-[#946246]" />}
          secondaryInfo="Faculty compliance rate"
          to="/admin/teachers/attendance"
        />
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 bg-[#140F0D]">
          <p className="text-[11px] font-medium text-[#A89A91] uppercase">Active Faculty</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#F5F0EA]">{activeTeachers}</span>
            <button
              onClick={() => navigate('/admin/teachers/profiles')}
              className="text-xs text-[#946246] hover:text-[#F1E5D8] flex items-center gap-1 cursor-pointer"
            >
              Faculty Profiles <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        <Card className="p-3.5 bg-[#140F0D]">
          <p className="text-[11px] font-medium text-[#A89A91] uppercase">Assigned Classes</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#F5F0EA]">{classes.length}</span>
            <button
              onClick={() => navigate('/admin/teachers/classes')}
              className="text-xs text-[#946246] hover:text-[#F1E5D8] flex items-center gap-1 cursor-pointer"
            >
              Classes <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        <Card className="p-3.5 bg-[#140F0D]">
          <p className="text-[11px] font-medium text-[#A89A91] uppercase">Pending Leaves</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#F5F0EA]">{pendingLeaves}</span>
            <button
              onClick={() => navigate('/admin/teachers/leave')}
              className="text-xs text-[#946246] hover:text-[#F1E5D8] flex items-center gap-1 cursor-pointer"
            >
              Review <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </Card>

        <Card className="p-3.5 bg-[#140F0D]">
          <p className="text-[11px] font-medium text-[#A89A91] uppercase">Faculty Profiles</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#F5F0EA]">{totalTeachers}</span>
            <button
              onClick={() => navigate('/admin/teachers/profiles')}
              className="text-xs text-[#946246] hover:text-[#F1E5D8] flex items-center gap-1 cursor-pointer"
            >
              Profiles <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </Card>
      </div>

      {/* Quick Action Buttons Hub */}
      <Card className="p-4 bg-gradient-to-r from-[#171311] via-[#1A1412] to-[#2A1710]/40 border-[#3A2922]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-[#F5F0EA] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#946246]" />
              Quick Actions Hub
            </h3>
            <p className="text-xs text-[#A89A91] mt-0.5">
              Direct access to frequent faculty management workflows
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/teachers/applications')}
              leftIcon={<FileCheck2 className="w-3.5 h-3.5 text-amber-400" />}
            >
              Review Applications ({pendingApps})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/teachers/attendance')}
              leftIcon={<CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />}
            >
              Manage Attendance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/teachers/classes')}
              leftIcon={<Layers className="w-3.5 h-3.5 text-purple-400" />}
            >
              Assign Class
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/teachers/profiles')}
              leftIcon={<UserCheck className="w-3.5 h-3.5 text-sky-400" />}
            >
              Faculty Profiles
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/admin/teachers/hackerrank')}
              leftIcon={<Award className="w-3.5 h-3.5" />}
            >
              HackerRank
            </Button>
          </div>
        </div>
      </Card>

      {/* Faculty Directory Highlights & Applications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Active Faculty Staff */}
        <div className="lg:col-span-8">
          <Card className="flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#3A2922]">
              <div>
                <h3 className="text-base font-bold text-[#F5F0EA]">Featured Faculty Members</h3>
                <p className="text-xs text-[#A89A91] mt-0.5">
                  Distinguished faculty leading core academic departments
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/teachers/profiles')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Faculty Profiles ({totalTeachers})
              </Button>
            </div>

            <div className="space-y-3">
              {teachers.slice(0, 4).map((teacher) => (
                <div
                  key={teacher.id}
                  onClick={() => navigate(`/admin/teachers/${teacher.id}`)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#140F0D] hover:bg-[#1E1815] border border-[#3A2922] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <Avatar src={teacher.avatar} name={teacher.fullName} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F5F0EA] group-hover:text-[#F1E5D8]">
                          {teacher.fullName}
                        </span>
                        <span className="text-xs px-1.5 py-0.2 bg-[#2A1710] text-[#A89A91] rounded font-mono">
                          {teacher.teacherId}
                        </span>
                      </div>
                      <p className="text-xs text-[#A89A91] mt-0.5">
                        {teacher.designation} • <span className="text-[#F5F0EA]/80">{teacher.department}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right text-xs">
                      <span className="text-[#A89A91] block">Attendance</span>
                      <span className="font-bold text-[#F5F0EA]">
                        {teacher.attendanceRate === undefined ? 'Not available' : `${teacher.attendanceRate}%`}
                      </span>
                    </div>
                    <StatusBadge status={teacher.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Teacher Applications */}
        <div className="lg:col-span-4">
          <Card className="flex flex-col h-full bg-[#171311] border-[#3A2922]">
            <div className="pb-4 mb-4 border-b border-[#3A2922] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F5F0EA]">Recent Applications</h3>
                <p className="text-xs text-[#A89A91] mt-0.5">Faculty recruitment pipeline</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/teachers/applications')}
                className="p-1 text-xs text-[#946246]"
              >
                View all
              </Button>
            </div>

            <div className="space-y-3 flex-1">
              {applications.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#A89A91]">
                  No teacher applications logged.
                </div>
              ) : (
                applications.slice(0, 3).map((app) => (
                  <div
                    key={app.id}
                    onClick={() => navigate('/admin/teachers/applications')}
                    className="p-3 rounded-xl bg-[#140F0D] hover:bg-[#2A1710]/40 border border-[#3A2922] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-[#F5F0EA] group-hover:text-[#F1E5D8]">
                        {app.fullName}
                      </span>
                      <StatusBadge status={app.status} size="sm" />
                    </div>
                    <p className="text-[11px] text-[#A89A91] mt-1">
                      {app.qualification} • {app.department}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#7A6F68]">
                      <span>{app.experienceYears} yrs experience</span>
                      <span>{new Date(app.appliedDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
