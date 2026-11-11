import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  TrendingUp,
  Award,
  CalendarCheck,
  FileText,
  Clock,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { getStudents, getAtRiskStudents } from '../../services/studentService';
import { getResults } from '../../services/resultService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const StudentPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const students = getStudents();
  const results = getResults();
  const atRisk = getAtRiskStudents();

  // Derive subject-wise performance from real results
  const subjectPerformance = useMemo(() => {
    if (results.length === 0) return [];
    const map = new Map<string, { total: number; sumScore: number; passed: number }>();
    results.forEach((r) => {
      const subj = r.subjectName || 'Core Module';
      const cur = map.get(subj) || { total: 0, sumScore: 0, passed: 0 };
      cur.total += 1;
      cur.sumScore += r.percentage;
      if (r.resultStatus === 'pass' || r.percentage >= 40) {
        cur.passed += 1;
      }
      map.set(subj, cur);
    });

    return Array.from(map.entries()).map(([subject, d]) => ({
      subject,
      avgScore: Math.round(d.sumScore / d.total),
      passRate: Math.round((d.passed / d.total) * 100),
    }));
  }, [results]);

  const overallAvgExam = useMemo(() => {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, curr) => acc + curr.percentage, 0);
    return Math.round(sum / results.length);
  }, [results]);

  const overallAvgAtt = useMemo(() => {
    const evaluatedStudents = students.filter(
      (s) => s.attendancePercentage !== undefined && s.attendancePercentage !== null
    );
    if (evaluatedStudents.length === 0) return 0;
    const sum = evaluatedStudents.reduce((acc, curr) => acc + (curr.attendancePercentage || 0), 0);
    return Math.round(sum / evaluatedStudents.length);
  }, [students]);

  // Derive trends from results
  const performanceTrend = useMemo(() => {
    if (results.length === 0) return [];
    const monthMap = new Map<string, { total: number; sumScore: number }>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    results.forEach((r) => {
      const d = r.publishedDate || r.submittedAt || '';
      let mName = 'Term';
      try {
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) {
          mName = monthNames[parsed.getMonth()];
        }
      } catch {}
      const cur = monthMap.get(mName) || { total: 0, sumScore: 0 };
      cur.total += 1;
      cur.sumScore += r.percentage;
      monthMap.set(mName, cur);
    });

    return Array.from(monthMap.entries()).map(([month, d]) => ({
      month,
      avgScore: Math.round(d.sumScore / d.total),
      attendance: overallAvgAtt,
    }));
  }, [results, overallAvgAtt]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Student Academic Performance Analytics"
        subtitle="Cross-sectional assessment of student learning outcomes, module mastery, and benchmark trends"
        breadcrumbs={[
          { label: 'Admin', to: '/admin/students' },
          { label: 'Students', to: '/admin/students' },
          { label: 'Performance' },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Overall Exam Average"
          value={results.length > 0 ? `${overallAvgExam}%` : 'N/A'}
          icon={<Award className="w-5 h-5 text-amber-400" />}
          change={results.length > 0 ? `${results.length} evaluations` : 'No evaluations yet'}
          changeType={results.length > 0 ? 'positive' : 'neutral'}
        />
        <StatCard
          title="Average Attendance"
          value={overallAvgAtt > 0 ? `${overallAvgAtt}%` : 'N/A'}
          icon={<CalendarCheck className="w-5 h-5 text-emerald-400" />}
          change={overallAvgAtt >= 75 ? 'Safe threshold (>75%)' : overallAvgAtt > 0 ? 'Needs attention' : 'No attendance yet'}
          changeType={overallAvgAtt >= 75 ? 'positive' : 'neutral'}
        />
        <StatCard
          title="Evaluations Logged"
          value={results.length.toString()}
          icon={<FileText className="w-5 h-5 text-blue-400" />}
          change={`${results.filter((r) => r.resultStatus === 'pass').length} passed`}
          changeType="positive"
        />
        <StatCard
          title="At-Risk Students"
          value={atRisk.length.toString()}
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
          change={atRisk.length > 0 ? 'Requires intervention' : 'All students safe'}
          changeType={atRisk.length > 0 ? 'negative' : 'positive'}
          onClick={() => navigate('/admin/students/at-risk')}
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Longitudinal Performance Trend */}
        <Card className="p-5 bg-[#171311] border-[#3A2922]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#F5F0EA] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#946246]" />
              Academic Metrics Progression (Term Trend)
            </h3>
            <p className="text-xs text-[#A89A91]">Score averages vs attendance vs assignment submission %</p>
          </div>
          {performanceTrend.length === 0 ? (
            <div className="h-64 w-full flex items-center justify-center text-xs text-[#A89A91]">
              No evaluation trend data recorded yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#946246" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#946246" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A1710" />
                  <XAxis dataKey="month" stroke="#A89A91" fontSize={11} />
                  <YAxis stroke="#A89A91" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E1815',
                      borderColor: '#3A2922',
                      borderRadius: '8px',
                      color: '#F1E5D8',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="avgScore" name="Avg Exam %" stroke="#946246" fill="url(#scoreGrad)" />
                  <Area type="monotone" dataKey="attendance" name="Attendance %" stroke="#10B981" fill="url(#attGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Subject-Wise Performance Breakdown */}
        <Card className="p-5 bg-[#171311] border-[#3A2922]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#F5F0EA] flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Subject-Wise Average Score & Pass Rate
            </h3>
            <p className="text-xs text-[#A89A91]">Comparative analysis across fundamental technical modules</p>
          </div>
          {subjectPerformance.length === 0 ? (
            <div className="h-64 w-full flex items-center justify-center text-xs text-[#A89A91]">
              No subject performance data recorded yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A1710" />
                  <XAxis dataKey="subject" stroke="#A89A91" fontSize={10} interval={0} angle={-15} textAnchor="end" height={40} />
                  <YAxis stroke="#A89A91" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E1815',
                      borderColor: '#3A2922',
                      borderRadius: '8px',
                      color: '#F1E5D8',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="avgScore" name="Avg Score %" fill="#946246" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="passRate" name="Pass Rate %" fill="#5A321F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Top Performing Students Table */}
      <Card className="p-5 bg-[#171311] border-[#3A2922]">
        <h3 className="text-sm font-bold text-[#F5F0EA] mb-4 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[#946246]" />
          Top Honor Students (Academic Distinction)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#140F0D] text-[#A89A91] text-[11px] font-bold uppercase">
                <th className="py-2.5 px-4">Student</th>
                <th className="py-2.5 px-4">Course</th>
                <th className="py-2.5 px-4">Batch</th>
                <th className="py-2.5 px-4 text-center">Attendance</th>
                <th className="py-2.5 px-4 text-center">Average Exam Score</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1710]">
              {students.filter((s) => (s.attendancePercentage || 0) >= 85).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#A89A91]">
                    No distinction student records logged yet.
                  </td>
                </tr>
              ) : (
                students
                  .filter((s) => (s.attendancePercentage || 0) >= 85)
                  .slice(0, 5)
                  .map((stu) => {
                    const stuResults = results.filter((r) => r.studentId === stu.id);
                    const stuAvg =
                      stuResults.length > 0
                        ? Math.round(
                            stuResults.reduce((a, b) => a + b.percentage, 0) / stuResults.length
                          )
                        : stu.averageMarks ?? stu.averageScore ?? null;
                    return (
                      <tr key={stu.id} className="hover:bg-[#1E1815]/60 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-[#F5F0EA]">
                          {stu.fullName}
                          <span className="text-[10px] text-[#A89A91] block font-mono">
                            {stu.studentId}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[#A89A91]">{stu.course}</td>
                        <td className="py-2.5 px-4 text-[#A89A91]">{stu.batch}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-emerald-400">
                          {stu.attendancePercentage}%
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-amber-300">
                          {stuAvg !== null ? `${stuAvg}%` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => navigate(`/admin/students/${stu.id}`)}
                            className="text-xs text-[#946246] hover:text-[#F1E5D8] font-semibold"
                          >
                            View Dossier →
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
