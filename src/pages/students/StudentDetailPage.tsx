import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  FileText,
  Clock,
  FileSpreadsheet,
  Activity,
  CreditCard,
  Award,
  Bell,
  History,
  Edit2,
  UserX,
  UserCheck,
  PlusCircle,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Layers,
  BookOpen,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Tabs } from '../../components/common/Tabs';
import { useToast } from '../../context/ToastContext';
import {
  getStudentById,
  updateStudentStatus,
} from '../../services/studentService';
import { getEnrollmentsByStudent } from '../../services/enrollmentService';
import { getStudentAttendance } from '../../services/studentAttendanceService';
import { getResultsByStudent } from '../../services/resultService';
import { getFeesByStudent, getPaymentsByStudent } from '../../services/feeService';
import { getCertificatesByStudent } from '../../services/certificateService';
import { getExams } from '../../services/examService';
import { getAcademicClasses } from '../../services/academicClassService';
import { getActivityLogs } from '../../services/activityService';
import { Student } from '../../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';

export const StudentDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadStudent = () => {
    if (!studentId) return;
    const found = getStudentById(studentId);
    if (found) {
      setStudent(found);
    } else {
      showToast('Student record not found.', 'error');
      navigate('/admin/students/list');
    }
  };

  useEffect(() => {
    loadStudent();
  }, [studentId]);

  if (!student) {
    return (
      <div className="py-20 text-center text-[#A89A91]">
        Loading student dossier...
      </div>
    );
  }

  // Related data
  const enrollments = getEnrollmentsByStudent(student.id);
  const attendanceRecords = getStudentAttendance(student.id);
  // results.student_id references profiles.id (auth UID), but student.id
  // here is student_profiles.id. Try both to bridge the cross-panel gap.
  let results = getResultsByStudent(student.id);
  if (results.length === 0 && student.userId && student.userId !== student.id) {
    results = getResultsByStudent(student.userId);
  }
  const fees = getFeesByStudent(student.id);
  const payments = getPaymentsByStudent(student.id);
  const certificates = getCertificatesByStudent(student.id);
  const upcomingExams = getExams().filter((e) => e.status === 'Scheduled');
  const classes = getAcademicClasses().filter((c) => c.courseName === student.course);
  // Some log rows (e.g. written by the teacher portal) have no details text.
  const activities = getActivityLogs().filter((a) => {
    const details = a.details || '';
    return (
      (!!student.fullName && details.includes(student.fullName)) ||
      (!!student.studentId && details.includes(student.studentId))
    );
  });

  const handleStatusToggle = () => {
    const nextStatus = student.status === 'Active' ? 'Inactive' : 'Active';
    updateStudentStatus(student.id, nextStatus);
    loadStudent();
    showToast(`Student status updated to ${nextStatus}`, 'success');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'personal', label: 'Personal', icon: <Phone className="w-3.5 h-3.5" /> },
    { id: 'academic', label: 'Academic', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'classes', label: 'Classes', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'schedule', label: 'Schedule', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
    { id: 'assignments', label: 'Assignments', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'exams', label: 'Exams', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'results', label: 'Results', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
    { id: 'performance', label: 'Performance', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'fees', label: 'Fees & Pay', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'certificates', label: 'Certificates', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'notifications', label: 'Alerts', icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'activity', label: 'Activity', icon: <History className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Breadcrumb */}
      <PageHeader
        title={`${student.fullName}`}
        subtitle={`Student Dossier • ID: ${student.studentId} • Batch: ${student.batch}`}
        breadcrumbs={[
          { label: 'Admin', to: '/admin/students' },
          { label: 'Students', to: '/admin/students/list' },
          { label: student.fullName },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/students/list')}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Directory
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/students/${student.id}/edit`)}
            >
              <Edit2 className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
            <Button
              variant={student.status === 'Active' ? 'outline' : 'primary'}
              size="sm"
              onClick={handleStatusToggle}
            >
              {student.status === 'Active' ? (
                <>
                  <UserX className="w-4 h-4 mr-1.5 text-amber-400" />
                  Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
                  Activate
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Student Top Profile Banner */}
      <Card className="p-5 sm:p-6 bg-[#171311] border-[#3A2922]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {student.profileImage || student.avatar ? (
              <img
                src={student.profileImage || student.avatar}
                alt={student.fullName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#5A321F] shadow-lg shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#2A1E19] border-2 border-[#5A321F] shadow-lg shrink-0 flex items-center justify-center text-xl font-bold text-[#F5F0EA]">
                {student.fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-[#F5F0EA]">
                  {student.fullName}
                </h1>
                <StatusBadge status={student.status} size="sm" />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#A89A91] mt-1 flex-wrap">
                <span className="font-mono text-[#F1E5D8] font-semibold">{student.studentId}</span>
                <span>•</span>
                <span>{student.course}</span>
                <span>•</span>
                <span>Batch {student.batch} (Sec {student.section})</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#A89A91] mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#946246]" /> {student.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#946246]" /> {student.phone}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-[#3A2922] pt-3 md:pt-0">
            <div className="text-center px-3 py-1.5 rounded-lg bg-[#140F0D] border border-[#2A1710]">
              <div className="text-[10px] uppercase tracking-wider text-[#A89A91]">Attendance</div>
              <div
                className={`text-base font-bold ${
                  (student.attendancePercentage || 0) >= 75
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {student.attendancePercentage !== undefined ? `${student.attendancePercentage}%` : '0%'}
              </div>
            </div>
            <div className="text-center px-3 py-1.5 rounded-lg bg-[#140F0D] border border-[#2A1710]">
              <div className="text-[10px] uppercase tracking-wider text-[#A89A91]">Fee Status</div>
              <div className="text-xs font-semibold mt-0.5">
                <StatusBadge status={student.feeStatus || 'Pending'} size="sm" />
              </div>
            </div>
            <div className="text-center px-3 py-1.5 rounded-lg bg-[#140F0D] border border-[#2A1710]">
              <div className="text-[10px] uppercase tracking-wider text-[#A89A91]">Enrollment</div>
              <div className="text-xs font-mono font-semibold text-[#F1E5D8] mt-0.5">
                {student.admissionDate}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="overflow-x-auto pb-1">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Contents */}
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-[#171311] border-[#3A2922]">
              <div className="text-xs text-[#A89A91]">Overall Attendance</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {student.attendancePercentage !== undefined ? `${student.attendancePercentage}%` : '0%'}
              </div>
              <div className="text-[10px] text-[#A89A91] mt-0.5">Threshold: 75% Safe</div>
            </Card>
            <Card className="p-4 bg-[#171311] border-[#3A2922]">
              <div className="text-xs text-[#A89A91]">Average Marks</div>
              <div className="text-xl font-bold text-[#F1E5D8] mt-1">
                {student.averageMarks ? `${student.averageMarks}%` : results.length > 0 ? `${Math.round(results.reduce((a, b) => a + b.percentage, 0) / results.length)}%` : 'N/A'}
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">
                {results.length > 0 ? 'Evaluations active' : 'No evaluations yet'}
              </div>
            </Card>
            <Card className="p-4 bg-[#171311] border-[#3A2922]">
              <div className="text-xs text-[#A89A91]">Assignments</div>
              <div className="text-xl font-bold text-blue-400 mt-1">
                {student.assignmentsCompleted || 0} / {student.totalAssignments || 0}
              </div>
              <div className="text-[10px] text-[#A89A91] mt-0.5">
                {student.totalAssignments ? `${Math.round(((student.assignmentsCompleted || 0) / student.totalAssignments) * 100)}% Submission Rate` : 'No assignments assigned'}
              </div>
            </Card>
            <Card className="p-4 bg-[#171311] border-[#3A2922]">
              <div className="text-xs text-[#A89A91]">Pending Invoices</div>
              <div className="text-xl font-bold text-amber-400 mt-1">
                ${fees.filter((f) => f.status !== 'Paid').reduce((sum, f) => sum + f.remainingAmount, 0)}
              </div>
              <div className="text-[10px] text-[#A89A91] mt-0.5">{fees.length} Total Invoices</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Academic Events */}
            <Card className="p-5 bg-[#171311] border-[#3A2922]">
              <h3 className="text-sm font-bold text-[#F5F0EA] mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#946246]" />
                Upcoming Classes & Exams
              </h3>
              <div className="space-y-2.5">
                {classes.slice(0, 3).map((cls) => (
                  <div key={cls.id} className="p-3 bg-[#140F0D] rounded-lg border border-[#2A1710] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#F5F0EA]">{cls.title}</div>
                      <div className="text-[#A89A91] text-[11px]">{cls.subjectName} • Room {cls.classroom}</div>
                    </div>
                    <div className="text-right font-mono text-[#A89A91]">
                      <div>{cls.date}</div>
                      <div className="text-[10px] text-[#946246]">{cls.startTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Results */}
            <Card className="p-5 bg-[#171311] border-[#3A2922]">
              <h3 className="text-sm font-bold text-[#F5F0EA] mb-3 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#946246]" />
                Latest Examination Results
              </h3>
              <div className="space-y-2.5">
                {results.slice(0, 3).map((res) => (
                  <div key={res.id} className="p-3 bg-[#140F0D] rounded-lg border border-[#2A1710] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#F5F0EA]">{res.examTitle}</div>
                      <div className="text-[#A89A91] text-[11px]">{res.subjectName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#F1E5D8]">{res.marksObtained} / {res.maxMarks} ({res.percentage}%)</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 font-bold">Grade {res.grade}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 2. PERSONAL TAB */}
      {activeTab === 'personal' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <h3 className="text-sm font-bold text-[#F5F0EA] uppercase tracking-wider mb-4 pb-2 border-b border-[#3A2922]">
            Personal & Guardian Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-[#A89A91] block">Full Name</span>
              <span className="font-semibold text-[#F5F0EA] text-sm mt-0.5 block">{student.fullName}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Date of Birth</span>
              <span className="font-mono text-[#F5F0EA] text-sm mt-0.5 block">{student.dob}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Gender</span>
              <span className="font-semibold text-[#F5F0EA] text-sm mt-0.5 block">{student.gender}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Email Address</span>
              <span className="text-[#F5F0EA] text-sm mt-0.5 block">{student.email}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Phone Number</span>
              <span className="font-mono text-[#F5F0EA] text-sm mt-0.5 block">{student.phone}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Residential Address</span>
              <span className="text-[#F5F0EA] text-sm mt-0.5 block">{student.address}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Guardian Name</span>
              <span className="font-semibold text-[#F5F0EA] text-sm mt-0.5 block">{student.guardianName}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Guardian Phone</span>
              <span className="font-mono text-[#F5F0EA] text-sm mt-0.5 block">{student.guardianPhone}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Emergency Contact</span>
              <span className="font-mono text-rose-400 font-semibold text-sm mt-0.5 block">{student.emergencyContact}</span>
            </div>
          </div>
        </Card>
      )}

      {/* 3. ACADEMIC TAB */}
      {activeTab === 'academic' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <h3 className="text-sm font-bold text-[#F5F0EA] uppercase tracking-wider mb-4 pb-2 border-b border-[#3A2922]">
            Academic Standing & Curriculum
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-[#A89A91] block">Student ID</span>
              <span className="font-mono font-bold text-[#F1E5D8] text-sm mt-0.5 block">{student.studentId}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Department</span>
              <span className="font-semibold text-[#F5F0EA] text-sm mt-0.5 block">{student.department}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Primary Program / Course</span>
              <span className="font-semibold text-[#F5F0EA] text-sm mt-0.5 block">{student.course}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Batch Allocation</span>
              <span className="text-[#F5F0EA] text-sm mt-0.5 block">{student.batch} (Section {student.section})</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Academic Year</span>
              <span className="text-[#F5F0EA] text-sm mt-0.5 block">{student.academicYear}</span>
            </div>
            <div>
              <span className="text-[#A89A91] block">Admission Date</span>
              <span className="font-mono text-[#F5F0EA] text-sm mt-0.5 block">{student.admissionDate}</span>
            </div>
          </div>
        </Card>
      )}

      {/* 4. COURSES TAB */}
      {activeTab === 'courses' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#F5F0EA]">Enrolled Courses</h3>
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/students/enrollments')}>
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Enroll New Course
            </Button>
          </div>
          <div className="space-y-3">
            {enrollments.map((enr) => (
              <div key={enr.id} className="p-4 bg-[#140F0D] rounded-lg border border-[#2A1710] flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[#F5F0EA]">{enr.courseName}</h4>
                  <p className="text-xs text-[#A89A91] mt-0.5">Batch: {enr.batchName} • Fee Plan: {enr.feePlan}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={enr.status} size="sm" />
                  <span className="text-xs font-mono text-[#A89A91]">{enr.enrollmentDate}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 5. CLASSES TAB */}
      {activeTab === 'classes' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <h3 className="text-sm font-bold text-[#F5F0EA] mb-4">Assigned Academic Classes</h3>
          <div className="space-y-3">
            {classes.map((cls) => (
              <div key={cls.id} className="p-3 bg-[#140F0D] rounded-lg border border-[#2A1710] flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[#F5F0EA]">{cls.title}</div>
                  <div className="text-[#A89A91] mt-0.5">Subject: {cls.subjectName} • Teacher: {cls.teacherName}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[#F1E5D8]">{cls.date} ({cls.startTime} - {cls.endTime})</div>
                  <span className="text-[10px] text-[#946246]">Room: {cls.classroom}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 6. SCHEDULE TAB */}
      {activeTab === 'schedule' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <h3 className="text-sm font-bold text-[#F5F0EA] mb-4">Weekly Class Schedule</h3>
          {classes.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#A89A91]">
              No scheduled classes found for this student.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {classes.map((cls) => (
                <div key={cls.id} className="p-3 bg-[#140F0D] rounded-lg border border-[#2A1710]">
                  <div className="text-xs font-bold text-[#946246] mb-1 uppercase">{cls.date}</div>
                  <div className="p-2 rounded bg-[#1C1714] text-[11px] space-y-1">
                    <div className="font-semibold text-[#F5F0EA]">{cls.title}</div>
                    <div className="text-[#A89A91]">{cls.startTime} - {cls.endTime}</div>
                    <div className="text-[#946246] font-mono">Room {cls.classroom || 'Main Hall'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 7. ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#F5F0EA]">Attendance Log</h3>
            <span className="text-xs font-bold text-emerald-400">
              Total Attendance: {student.attendancePercentage !== undefined ? `${student.attendancePercentage}%` : '0%'}
            </span>
          </div>
          {attendanceRecords.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#A89A91]">
              No attendance records logged for this student yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#3A2922] text-[#A89A91]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Teacher</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A1710]">
                  {attendanceRecords.map((att) => (
                    <tr key={att.id}>
                      <td className="py-2.5 px-3 font-mono">{att.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#F5F0EA]">{att.subjectName}</td>
                      <td className="py-2.5 px-3 text-[#A89A91]">{att.teacherName}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={att.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-[#A89A91]">{att.remarks || 'Regular Session'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 8. ASSIGNMENTS TAB */}
      {activeTab === 'assignments' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <h3 className="text-sm font-bold text-[#F5F0EA] mb-4">Assignment Submissions</h3>
          <div className="py-10 text-center text-xs text-[#A89A91]">
            No assignment submissions recorded yet for this student.
          </div>
        </Card>
      )}

      {/* 9. EXAMS TAB */}
      {activeTab === 'exams' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <h3 className="text-sm font-bold text-[#F5F0EA] mb-4">Examinations</h3>
          {upcomingExams.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#A89A91]">
              No upcoming examinations scheduled.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map((ex) => (
                <div key={ex.id} className="p-3 bg-[#140F0D] rounded-lg border border-[#2A1710] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-[#F5F0EA]">{ex.title}</div>
                    <div className="text-[#A89A91] mt-0.5">{ex.subjectName} • Duration: {ex.durationMinutes} mins</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[#F1E5D8]">{ex.startDate} {ex.startTime}</div>
                    <StatusBadge status={ex.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 10. RESULTS TAB */}
      {activeTab === 'results' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <h3 className="text-sm font-bold text-[#F5F0EA] mb-4">Examination Results</h3>
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#A89A91]">
              No examination evaluation results recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((res) => (
                <div key={res.id} className="p-3.5 bg-[#140F0D] rounded-lg border border-[#2A1710] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-sm text-[#F5F0EA]">{res.examTitle}</div>
                    <div className="text-[#A89A91] mt-0.5">{res.subjectName} • Date: {res.publishedDate}</div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="text-sm font-bold text-[#F1E5D8]">{res.marksObtained}/{res.maxMarks}</span>
                      <span className="text-[#A89A91] block text-[10px]">({res.percentage}%)</span>
                    </div>
                    <StatusBadge status={res.resultStatus} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 11. PERFORMANCE TAB */}
      {activeTab === 'performance' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <h3 className="text-sm font-bold text-[#F5F0EA] mb-4">Performance Insights</h3>
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#A89A91]">
              No evaluation data recorded yet to generate performance insights.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-[#140F0D] rounded-lg border border-[#2A1710]">
                <div className="text-xs text-[#A89A91]">Top Subject</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">
                  {results.slice().sort((a, b) => b.percentage - a.percentage)[0]?.subjectName || 'Core Module'}
                </div>
              </div>
              <div className="p-4 bg-[#140F0D] rounded-lg border border-[#2A1710]">
                <div className="text-xs text-[#A89A91]">Average Marks</div>
                <div className="text-sm font-bold text-[#F1E5D8] mt-1">
                  {Math.round(results.reduce((a, b) => a + b.percentage, 0) / results.length)}%
                </div>
              </div>
              <div className="p-4 bg-[#140F0D] rounded-lg border border-[#2A1710]">
                <div className="text-xs text-[#A89A91]">Completed Assessments</div>
                <div className="text-sm font-bold text-[#C49B7B] mt-1">{results.length} Completed</div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 12. FEES TAB */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <Card className="p-6 bg-[#171311] border-[#3A2922]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#F5F0EA]">Invoices & Fee Plans</h3>
              <Button variant="primary" size="sm" onClick={() => navigate('/admin/students/payments')}>
                <CreditCard className="w-4 h-4 mr-1.5" />
                Record Payment
              </Button>
            </div>
            <div className="space-y-3">
              {fees.map((f) => (
                <div key={f.id} className="p-3.5 bg-[#140F0D] rounded-lg border border-[#2A1710] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-sm text-[#F5F0EA]">{f.courseName} - {f.feePlan}</div>
                    <div className="text-[#A89A91] mt-0.5">Due Date: {f.dueDate}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#F1E5D8]">Total: ${f.totalAmount} • Paid: ${f.paidAmount}</div>
                    <div className="text-rose-400 font-semibold mt-0.5">Remaining: ${f.remainingAmount}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-[#171311] border-[#3A2922]">
            <h3 className="text-sm font-bold text-[#F5F0EA] mb-4">Payment Transactions History</h3>
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="p-3 bg-[#140F0D] rounded-lg border border-[#2A1710] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-[#F5F0EA]">${p.amount} via {p.paymentMethod}</div>
                    <div className="text-[#A89A91] text-[11px]">Ref: {p.transactionReference}</div>
                  </div>
                  <div className="text-right font-mono text-[#A89A91]">{p.paymentDate}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 13. CERTIFICATES TAB */}
      {activeTab === 'certificates' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#F5F0EA]">Earned Certificates</h3>
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/students/certificates')}>
              <Award className="w-4 h-4 mr-1.5" />
              Issue Certificate
            </Button>
          </div>
          <div className="space-y-3">
            {certificates.map((cert) => (
              <div key={cert.id} className="p-4 bg-[#140F0D] rounded-lg border border-[#2A1710] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#F5F0EA]">{cert.courseName}</h4>
                  <div className="text-xs text-[#A89A91] font-mono mt-0.5">Cert ID: {cert.certificateNumber}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={cert.status} size="sm" />
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin/students/certificates')}>
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Preview
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 14. NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <h3 className="text-sm font-bold text-[#F5F0EA] mb-4">Student Alerts & Notifications</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#140F0D] rounded-lg border border-[#2A1710] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#946246]" />
                <span>Class schedule updated for Batch 2026-Alpha</span>
              </div>
              <span className="text-[#A89A91]">2 hours ago</span>
            </div>
            <div className="p-3 bg-[#140F0D] rounded-lg border border-[#2A1710] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Fee receipt generated for Semester 1 invoice</span>
              </div>
              <span className="text-[#A89A91]">1 day ago</span>
            </div>
          </div>
        </Card>
      )}

      {/* 15. ACTIVITY TAB */}
      {activeTab === 'activity' && (
        <Card className="p-6 bg-[#171311] border-[#3A2922]">
          <h3 className="text-sm font-bold text-[#F5F0EA] mb-4">Student Activity Timeline</h3>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-6 text-[#A89A91] text-xs">No direct activity logs found for this student.</div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#946246] mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-[#F5F0EA]">{act.action}</div>
                    <div className="text-[#A89A91] mt-0.5">{act.details}</div>
                  </div>
                  <span className="text-[10px] font-mono text-[#A89A91]">
                    {new Date(act.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
