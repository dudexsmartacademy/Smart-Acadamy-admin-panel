import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  GraduationCap,
  Briefcase,
  MapPin,
  Edit2,
  Power,
  BookOpen,
  Layers,
  CalendarCheck,
  FileText,
  Activity,
  UserCheck,
  Shield,
  ArrowLeft,
  ExternalLink,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';

import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Tabs } from '../../components/common/Tabs';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/common/Table';
import { Timeline } from '../../components/common/Timeline';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';

import { teacherService } from '../../services/teacherService';
import { teacherCourseService } from '../../services/teacherCourseService';
import { teacherClassService } from '../../services/teacherClassService';
import { teacherAttendanceService } from '../../services/teacherAttendanceService';
import { teacherAssignmentService } from '../../services/teacherAssignmentService';
import { teacherLeaveService } from '../../services/teacherLeaveService';
import { teacherPerformanceService } from '../../services/teacherPerformanceService';
import { activityService } from '../../services/activityService';
import { Teacher, TeacherStatus } from '../../types';

function formatDate(value?: string): string {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not provided' : date.toLocaleDateString();
}

export const TeacherDetailPage: React.FC = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadData = async () => {
    if (!teacherId) return;
    let found = teacherService.getTeacherById(teacherId);
    if (found) {
      setTeacher(found);
      return;
    }

    try {
      await teacherService.fetchTeachers();
      found = teacherService.getTeacherById(teacherId);
      if (found) {
        setTeacher(found);
        return;
      }
    } catch {}

    // Grace period before redirecting
    const timer = setTimeout(() => {
      const retry = teacherService.getTeacherById(teacherId);
      if (retry) {
        setTeacher(retry);
      } else {
        navigate('/admin/teachers/profiles');
      }
    }, 600);

    return () => clearTimeout(timer);
  };

  useEffect(() => {
    loadData();
    const handleChanged = () => {
      if (teacherId) {
        const found = teacherService.getTeacherById(teacherId);
        if (found) setTeacher(found);
      }
    };
    window.addEventListener('dudex_teachers_changed', handleChanged);
    return () => window.removeEventListener('dudex_teachers_changed', handleChanged);
  }, [teacherId]);

  // Associated Data
  const courses = useMemo(() => {
    if (!teacher) return [];
    return teacherCourseService.getCoursesByTeacherId(teacher.id);
  }, [teacher]);

  const classes = useMemo(() => {
    if (!teacher) return [];
    return teacherClassService.getClassesByTeacherId(teacher.id);
  }, [teacher]);

  const attendances = useMemo(() => {
    if (!teacher) return [];
    return teacherAttendanceService.getAttendanceByTeacherId(teacher.id);
  }, [teacher]);

  const assignments = useMemo(() => {
    if (!teacher) return [];
    return teacherAssignmentService.getAssignmentsByTeacherId(teacher.id);
  }, [teacher]);

  const leaves = useMemo(() => {
    if (!teacher) return [];
    return teacherLeaveService.getLeaveRequests().filter((l) => l.teacherId === teacher.id);
  }, [teacher]);

  const performance = useMemo(() => {
    if (!teacher) return undefined;
    return teacherPerformanceService.getPerformanceByTeacherId(teacher.id);
  }, [teacher]);

  const teacherActivities = useMemo(() => {
    if (!teacher) return [];
    return activityService
      .getLogs()
      .filter((log) => log.entity.toLowerCase().includes(teacher.fullName.toLowerCase()))
      .map((log) => ({
        id: log.id,
        title: log.action,
        description: log.description,
        time: new Date(log.timestamp).toLocaleString(),
        badge: log.module.toUpperCase(),
      }));
  }, [teacher]);

  if (!teacher) return null;

  const handleToggleStatus = async () => {
    if (!teacher) return;
    const nextStatus: TeacherStatus = teacher.status === 'active' ? 'suspended' : 'active';
    try {
      const updated = await teacherService.setTeacherStatus(teacher.id, nextStatus);
      if (!updated) {
        throw new Error('The teacher record was not found. Reload and try again.');
      }
      success('Faculty Status Updated', `${teacher.fullName} is now ${nextStatus.toUpperCase()}`);
      setIsStatusDialogOpen(false);
      await loadData();
    } catch (error) {
      toastError(
        'Faculty Status Update Failed',
        error instanceof Error ? error.message : 'Could not save the teacher status.'
      );
    }
  };

  const tabsList = [
    { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { id: 'personal', label: 'Personal', icon: <User className="w-4 h-4" /> },
    { id: 'professional', label: 'Professional', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" />, badge: courses.length },
    { id: 'classes', label: 'Classes', icon: <Layers className="w-4 h-4" />, badge: classes.length },
    { id: 'schedule', label: 'Schedule', icon: <Clock className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-4 h-4" />, badge: teacher.attendanceRate === undefined ? 'N/A' : `${teacher.attendanceRate}%` },
    { id: 'assignments', label: 'Assignments', icon: <FileText className="w-4 h-4" />, badge: assignments.length },
    { id: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" /> },
    { id: 'leave', label: 'Leave Records', icon: <UserCheck className="w-4 h-4" />, badge: leaves.length },
    { id: 'activity', label: 'Audit Trail', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title=""
          breadcrumbs={[
            { label: 'Teacher Management', path: '/admin/teachers' },
            { label: 'Faculty Profiles', path: '/admin/teachers/profiles' },
            { label: teacher.fullName },
          ]}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/teachers/profiles')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Profiles
        </Button>
      </div>

      {/* Main Faculty Profile Header Banner */}
      <Card className="p-6 bg-gradient-to-r from-[#171311] via-[#1A1412] to-[#2A1710]/40 border-[#3A2922] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar src={teacher.avatar} name={teacher.fullName} size="xl" className="border-2 border-[#5A321F]" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-[#F5F0EA] tracking-tight">
                  {teacher.fullName}
                </h1>
                <span className="px-2.5 py-0.5 rounded bg-[#2A1710] text-[#F1E5D8] font-mono text-xs font-bold border border-[#5A321F]">
                  {teacher.teacherId}
                </span>
                <StatusBadge status={teacher.status} size="sm" />
              </div>

              <p className="text-xs sm:text-sm text-[#A89A91]">
                <span className="text-[#F1E5D8] font-semibold">{teacher.designation}</span> •{' '}
                <span>{teacher.department}</span>
              </p>

              <div className="flex items-center gap-4 text-xs text-[#A89A91] pt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#946246]" /> {teacher.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#946246]" /> {teacher.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#946246]" /> Joined{' '}
                  {formatDate(teacher.joiningDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/teachers/${teacher.id}/edit`)}
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
            >
              Edit Profile
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={teacher.status === 'unknown'}
              onClick={() => setIsStatusDialogOpen(true)}
              leftIcon={<Power className="w-3.5 h-3.5" />}
            >
              {teacher.status === 'unknown'
                ? 'Status unavailable'
                : teacher.status === 'active'
                  ? 'Deactivate'
                  : 'Activate'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              leftIcon={<Power className="w-3.5 h-3.5" />}
            >
              Deactivate
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation Bar */}
      <Tabs tabs={tabsList} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-[#140F0D]">
              <span className="text-xs text-[#A89A91] uppercase">Assigned Courses</span>
              <p className="text-2xl font-bold text-[#F5F0EA] mt-1">{courses.length}</p>
              <span className="text-[11px] text-[#946246]">Active curriculum</span>
            </Card>

            <Card className="p-4 bg-[#140F0D]">
              <span className="text-xs text-[#A89A91] uppercase">Assigned Classes</span>
              <p className="text-2xl font-bold text-[#F5F0EA] mt-1">{classes.length}</p>
              <span className="text-[11px] text-[#946246]">Scheduled lectures</span>
            </Card>

            <Card className="p-4 bg-[#140F0D]">
              <span className="text-xs text-[#A89A91] uppercase">Students Mentored</span>
              <p className="text-2xl font-bold text-[#F5F0EA] mt-1">
                {teacher.totalStudentsHandled ?? 'Not available'}
              </p>
              <span className="text-[11px] text-emerald-400">Total enrollment</span>
            </Card>

            <Card className="p-4 bg-[#140F0D]">
              <span className="text-xs text-[#A89A91] uppercase">Attendance Score</span>
              <p className="text-2xl font-bold text-[#F5F0EA] mt-1">
                {teacher.attendanceRate === undefined ? 'Not available' : `${teacher.attendanceRate}%`}
              </p>
              <span className="text-[11px] text-emerald-400">Compliance high</span>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              {/* Bio & Discipline */}
              <Card className="p-5">
                <h3 className="text-sm font-bold text-[#F5F0EA] mb-2">Faculty Background</h3>
                <p className="text-xs sm:text-sm text-[#A89A91] leading-relaxed">
                  {teacher.bio ||
                    'Esteemed faculty educator dedicated to excellence in teaching, student mentoring, and departmental research initiatives.'}
                </p>

                <div className="mt-4 pt-4 border-t border-[#3A2922] flex flex-wrap gap-1.5">
                  <span className="text-xs font-semibold text-[#F5F0EA] mr-2 self-center">Disciplines:</span>
                  {teacher.skills?.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-0.5 rounded-full text-xs bg-[#2A1710] text-[#F1E5D8] border border-[#5A321F]/40"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Card>

              {/* Today's Classes for this teacher */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#F5F0EA]">Assigned Classes & Timetable</h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('classes')} className="text-xs">
                    View All
                  </Button>
                </div>

                {classes.length === 0 ? (
                  <p className="text-xs text-[#A89A91]">No active classes assigned to this faculty member.</p>
                ) : (
                  <div className="space-y-2">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#140F0D] border border-[#3A2922]"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#F5F0EA]">{cls.title}</p>
                          <p className="text-[11px] text-[#A89A91]">
                            {cls.room} • {cls.batch} • {cls.startTime} - {cls.endTime}
                          </p>
                        </div>
                        <StatusBadge status={cls.status} size="sm" />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Quick Links & Contact Details */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#F5F0EA] mb-3">Professional Profiles</h3>
                {teacher.linkedinUrl ? (
                  <a
                    href={teacher.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#140F0D] hover:bg-[#2A1710] text-xs text-[#F1E5D8] border border-[#3A2922] transition-colors"
                  >
                    <span>LinkedIn Profile</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#946246]" />
                  </a>
                ) : null}

                {teacher.githubUrl ? (
                  <a
                    href={teacher.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#140F0D] hover:bg-[#2A1710] text-xs text-[#F1E5D8] border border-[#3A2922] transition-colors"
                  >
                    <span>GitHub Repositories</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#946246]" />
                  </a>
                ) : null}

                {teacher.portfolioUrl ? (
                  <a
                    href={teacher.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#140F0D] hover:bg-[#2A1710] text-xs text-[#F1E5D8] border border-[#3A2922] transition-colors"
                  >
                    <span>Academic Portfolio</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#946246]" />
                  </a>
                ) : null}

                <div className="pt-3 border-t border-[#3A2922] text-xs text-[#A89A91] space-y-1.5">
                  <p>
                    <span className="text-[#F5F0EA] font-semibold">Address:</span>{' '}
                    {teacher.address || 'Not provided'}
                  </p>
                  <p>
                    <span className="text-[#F5F0EA] font-semibold">Qualification:</span>{' '}
                    {teacher.qualification}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. PERSONAL */}
      {activeTab === 'personal' && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-[#F5F0EA] mb-4">Personal & Demographic Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-xs text-[#A89A91] block">Full Name</span>
              <span className="text-[#F5F0EA] font-semibold">{teacher.fullName}</span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Date of Birth</span>
              <span className="text-[#F5F0EA] font-semibold">{formatDate(teacher.dob)}</span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Gender</span>
              <span className="text-[#F5F0EA] font-semibold capitalize">
                {teacher.gender || 'Not provided'}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Primary Contact Email</span>
              <span className="text-[#F5F0EA] font-semibold">{teacher.email}</span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Phone</span>
              <span className="text-[#F5F0EA] font-semibold">{teacher.phone}</span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Residential Address</span>
              <span className="text-[#F5F0EA] font-semibold">
                {teacher.address || 'Not provided'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* TAB CONTENT: 3. PROFESSIONAL */}
      {activeTab === 'professional' && (
        <Card className="p-6 space-y-6">
          <h3 className="text-base font-bold text-[#F5F0EA]">Academic & Departmental Credentials</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="text-xs text-[#A89A91] block">Faculty ID</span>
              <span className="text-[#F5F0EA] font-bold font-mono">{teacher.teacherId}</span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Department</span>
              <span className="text-[#F5F0EA] font-semibold">{teacher.department}</span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Designation</span>
              <span className="text-[#F5F0EA] font-semibold">{teacher.designation}</span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Highest Qualification</span>
              <span className="text-[#F5F0EA] font-semibold">{teacher.qualification}</span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Teaching Experience</span>
              <span className="text-[#F5F0EA] font-semibold">
                {teacher.experienceYears === undefined
                  ? 'Not provided'
                  : `${teacher.experienceYears} Years`}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Employment Contract</span>
              <span className="text-[#F5F0EA] font-semibold capitalize">
                {teacher.employmentType || 'Not provided'}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Primary Subject</span>
              <span className="text-[#F5F0EA] font-semibold">
                {teacher.primarySubject || 'Not provided'}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#A89A91] block">Joining Date</span>
              <span className="text-[#F5F0EA] font-semibold">
                {formatDate(teacher.joiningDate)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* TAB CONTENT: 4. COURSES */}
      {activeTab === 'courses' && (
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#3A2922]">
            <div>
              <h3 className="text-base font-bold text-[#F5F0EA]">Assigned Curriculum Courses</h3>
              <p className="text-xs text-[#A89A91]">Active courses taught by {teacher.fullName}</p>
            </div>
          </div>

          {courses.length === 0 ? (
            <EmptyState
              title="No Courses Assigned"
              description="This teacher is not currently assigned to any active semester courses."
            />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Course Code & Title</TableHeaderCell>
                  <TableHeaderCell>Department</TableHeaderCell>
                  <TableHeaderCell>Batch</TableHeaderCell>
                  <TableHeaderCell>Students</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <span className="font-bold text-[#F5F0EA] block">{course.name}</span>
                      <span className="text-xs text-[#A89A91] font-mono">{course.code}</span>
                    </TableCell>
                    <TableCell>{course.department}</TableCell>
                    <TableCell>{course.batch}</TableCell>
                    <TableCell>{course.totalStudents} enrolled</TableCell>
                    <TableCell>
                      <StatusBadge status={course.status} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* TAB CONTENT: 5. CLASSES */}
      {activeTab === 'classes' && (
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#3A2922]">
            <div>
              <h3 className="text-base font-bold text-[#F5F0EA]">Scheduled Classes & Lectures</h3>
              <p className="text-xs text-[#A89A91]">Auditoriums, labs and virtual sessions</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/admin/teachers/classes')}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Schedule Class
            </Button>
          </div>

          {classes.length === 0 ? (
            <EmptyState
              title="No Classes Scheduled"
              description="No upcoming or past lecture sessions found for this instructor."
            />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Class Lecture Title</TableHeaderCell>
                  <TableHeaderCell>Room / Mode</TableHeaderCell>
                  <TableHeaderCell>Batch & Section</TableHeaderCell>
                  <TableHeaderCell>Date & Time</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell>
                      <span className="font-bold text-[#F5F0EA] block">{cls.title}</span>
                      <span className="text-xs text-[#A89A91]">{cls.courseName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-[#F5F0EA] block">{cls.room}</span>
                      <span className="text-[10px] text-[#A89A91] uppercase">{cls.mode}</span>
                    </TableCell>
                    <TableCell>
                      {cls.batch} ({cls.section})
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-[#F5F0EA] block">{cls.date}</span>
                      <span className="text-[11px] text-[#A89A91]">
                        {cls.startTime} - {cls.endTime}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={cls.status} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* TAB CONTENT: 6. SCHEDULE */}
      {activeTab === 'schedule' && (
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#3A2922]">
            <h3 className="text-base font-bold text-[#F5F0EA]">Instructor Weekly Calendar</h3>
          </div>
          <div className="space-y-3">
            {classes.map((c) => (
              <div key={c.id} className="p-3.5 rounded-xl bg-[#140F0D] border border-[#3A2922] flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-[#F5F0EA]">{c.title}</span>
                  <p className="text-xs text-[#A89A91] mt-0.5">
                    {c.date} • {c.startTime} - {c.endTime} • {c.room}
                  </p>
                </div>
                <StatusBadge status={c.status} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB CONTENT: 7. ATTENDANCE */}
      {activeTab === 'attendance' && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-[#F5F0EA] mb-4">Biometric & Daily Attendance Logs</h3>
          {attendances.length === 0 ? (
            <EmptyState
              title="No Attendance Records"
              description="No attendance punches have been logged for this teacher yet."
            />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Check In</TableHeaderCell>
                  <TableHeaderCell>Check Out</TableHeaderCell>
                  <TableHeaderCell>Duration</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Remarks</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {attendances.map((att) => (
                  <TableRow key={att.id}>
                    <TableCell className="font-semibold text-[#F5F0EA]">{att.date}</TableCell>
                    <TableCell>{att.checkInTime}</TableCell>
                    <TableCell>{att.checkOutTime}</TableCell>
                    <TableCell>{att.durationMinutes ? `${Math.floor(att.durationMinutes / 60)}h ${att.durationMinutes % 60}m` : '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={att.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-xs text-[#A89A91]">{att.remarks || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* TAB CONTENT: 8. ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#3A2922]">
            <h3 className="text-base font-bold text-[#F5F0EA]">Assessments & Assignments Created</h3>
          </div>
          {assignments.length === 0 ? (
            <EmptyState
              title="No Assignments Found"
              description="This teacher has not created any assignments or course homework yet."
            />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Assignment Title</TableHeaderCell>
                  <TableHeaderCell>Course & Batch</TableHeaderCell>
                  <TableHeaderCell>Assigned Date</TableHeaderCell>
                  <TableHeaderCell>Due Date</TableHeaderCell>
                  <TableHeaderCell>Submissions</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {assignments.map((asg) => (
                  <TableRow key={asg.id}>
                    <TableCell>
                      <span className="font-bold text-[#F5F0EA] block">{asg.title}</span>
                      <span className="text-xs text-[#A89A91]">{asg.totalMarks} Total Marks</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-[#F5F0EA] block">{asg.courseName}</span>
                      <span className="text-[11px] text-[#A89A91]">{asg.batch}</span>
                    </TableCell>
                    <TableCell className="text-xs">{asg.assignedDate}</TableCell>
                    <TableCell className="text-xs text-amber-400 font-medium">{asg.dueDate}</TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-[#F5F0EA]">
                        {asg.submissionsCount} / {asg.studentCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={asg.status} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* TAB CONTENT: 9. PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-[#140F0D]">
              <span className="text-xs text-[#A89A91]">Classes Delivered</span>
              <p className="text-2xl font-bold text-[#F5F0EA] mt-1">{performance?.classesConducted ?? 'Not available'}</p>
            </Card>
            <Card className="p-4 bg-[#140F0D]">
              <span className="text-xs text-[#A89A91]">Student Rating</span>
              <p className="text-2xl font-bold text-[#F5F0EA] mt-1">{teacher.rating === undefined ? 'Not available' : `${teacher.rating} / 5.0`}</p>
            </Card>
            <Card className="p-4 bg-[#140F0D]">
              <span className="text-xs text-[#A89A91]">Notes Published</span>
              <p className="text-2xl font-bold text-[#F5F0EA] mt-1">{performance?.notesPublished ?? 'Not available'}</p>
            </Card>
            <Card className="p-4 bg-[#140F0D]">
              <span className="text-xs text-[#A89A91]">Assignments Created</span>
              <p className="text-2xl font-bold text-[#F5F0EA] mt-1">{assignments.length}</p>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-base font-bold text-[#F5F0EA] mb-3">Teaching Performance Audit</h3>
            <p className="text-xs text-[#A89A91] leading-relaxed">
              Verified performance metrics will appear here when the live class, attendance, and assessment sources are connected.
            </p>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: 10. LEAVE */}
      {activeTab === 'leave' && (
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#3A2922]">
            <h3 className="text-base font-bold text-[#F5F0EA]">Leave History & Applications</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/teachers/leave')}
            >
              Manage All Leaves
            </Button>
          </div>

          {leaves.length === 0 ? (
            <EmptyState
              title="No Leave Records"
              description="This teacher has not submitted any leave requests."
            />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Leave Type</TableHeaderCell>
                  <TableHeaderCell>Duration</TableHeaderCell>
                  <TableHeaderCell>Dates</TableHeaderCell>
                  <TableHeaderCell>Reason</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {leaves.map((lea) => (
                  <TableRow key={lea.id}>
                    <TableCell className="font-semibold text-[#F5F0EA] capitalize">{lea.leaveType} Leave</TableCell>
                    <TableCell>{lea.totalDays} Day(s)</TableCell>
                    <TableCell className="text-xs">{lea.fromDate} to {lea.toDate}</TableCell>
                    <TableCell className="text-xs text-[#A89A91] max-w-xs truncate">{lea.reason}</TableCell>
                    <TableCell>
                      <StatusBadge status={lea.status} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* TAB CONTENT: 11. AUDIT TRAIL */}
      {activeTab === 'activity' && (
        <Card className="p-6">
          <h3 className="text-base font-bold text-[#F5F0EA] mb-4">Faculty Specific Audit Trail</h3>
          <Timeline events={teacherActivities} />
        </Card>
      )}

      {/* Status Toggle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        onConfirm={handleToggleStatus}
        title={teacher.status === 'active' ? 'Deactivate Faculty Profile' : 'Activate Faculty Profile'}
        message={`Are you sure you want to change ${teacher.fullName}'s account state to ${
          teacher.status === 'active' ? 'INACTIVE' : 'ACTIVE'
        }?`}
        confirmText={teacher.status === 'active' ? 'Deactivate' : 'Activate'}
        variant={teacher.status === 'active' ? 'danger' : 'primary'}
      />

      {/* Deactivation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={async () => {
          try {
            const updated = await teacherService.setTeacherStatus(teacher.id, 'suspended');
            if (!updated) throw new Error('The teacher record was not found.');
            success('Faculty Member Suspended', `${updated.fullName} is now suspended.`);
            navigate('/admin/teachers/profiles');
          } catch (error) {
            toastError(
              'Could Not Deactivate Faculty',
              error instanceof Error ? error.message : 'The status was not saved.'
            );
          }
        }}
        title="Deactivate Faculty Profile"
        message={`Deactivate ${teacher.fullName} (${teacher.teacherId})? The profile and linked records will be preserved.`}
        confirmText="Deactivate Faculty"
        variant="primary"
      />
    </div>
  );
};
