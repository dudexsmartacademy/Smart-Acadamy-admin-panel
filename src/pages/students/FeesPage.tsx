import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { getFees, fetchFees } from '../../services/feeService';
import { FeeRecord } from '../../types';

export const FeesPage: React.FC = () => {
  const navigate = useNavigate();
  const [fees, setFees] = useState<FeeRecord[]>(getFees());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = () => {
    setFees(getFees());
  };

  useEffect(() => {
    loadData();
    fetchFees().then(loadData);
    const handleChanged = () => loadData();
    window.addEventListener('dudex_fees_changed', handleChanged);
    return () => window.removeEventListener('dudex_fees_changed', handleChanged);
  }, []);

  const filtered = fees.filter((f) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matches =
        f.studentName.toLowerCase().includes(q) ||
        f.studentId.toLowerCase().includes(q) ||
        f.courseName.toLowerCase().includes(q) ||
        f.feePlan.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter && f.status !== statusFilter) return false;
    return true;
  });

  const totalBilled = fees.reduce((sum, f) => sum + f.totalAmount, 0);
  const totalCollected = fees.reduce((sum, f) => sum + f.paidAmount, 0);
  const totalRemaining = fees.reduce((sum, f) => sum + f.remainingAmount, 0);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Student Fee Management & Billing"
        subtitle="Track tuition installments, calculate remaining balances, review due dates, and monitor overdue accounts"
        breadcrumbs={[
          { label: 'Admin', to: '/admin/students' },
          { label: 'Students', to: '/admin/students' },
          { label: 'Fees & Invoices' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/students/payments')}>
            <CreditCard className="w-4 h-4 mr-1.5" />
            Record Payment
          </Button>
        }
      />

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-[#140F0D] border-[#3A2922]">
          <div className="text-xs text-[#A89A91]">Total Billed Tuition</div>
          <div className="text-2xl font-bold font-mono text-[#F1E5D8] mt-1">
            ${totalBilled.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#A89A91] mt-0.5">Across all enrolled cohorts</div>
        </Card>
        <Card className="p-4 bg-[#140F0D] border-[#3A2922]">
          <div className="text-xs text-[#A89A91]">Total Fees Collected</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            ${totalCollected.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">
            {Math.round((totalCollected / (totalBilled || 1)) * 100)}% collection rate
          </div>
        </Card>
        <Card className="p-4 bg-[#140F0D] border-[#3A2922]">
          <div className="text-xs text-[#A89A91]">Outstanding Balance</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            ${totalRemaining.toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">Pending collection</div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-[#140F0D] border-[#3A2922]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#946246] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, ID, or course..."
              className="w-full pl-9 pr-4 py-2 bg-[#1C1714] border border-[#3A2922] rounded-lg text-xs sm:text-sm text-[#F5F0EA] placeholder-[#A89A91]/60 focus:outline-none focus:border-[#946246]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] text-xs rounded-lg px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </Card>

      {/* Fees Table */}
      <Card className="overflow-hidden border-[#3A2922] bg-[#140F0D]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#1A1412] text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Course Program</th>
                <th className="py-3 px-4">Fee Plan</th>
                <th className="py-3 px-4 text-right">Total Fee</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Remaining</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1710]">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-[#1E1815]/60 transition-colors">
                  <td className="py-3 px-4">
                    <button
                      onClick={() => navigate(`/admin/students/${f.studentId}`)}
                      className="font-semibold text-[#F5F0EA] hover:text-[#946246] transition-colors flex items-center gap-1.5"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-[#946246]" />
                      {f.studentName}
                    </button>
                    <div className="text-[11px] text-[#A89A91] font-mono">{f.studentId}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#F5F0EA]">
                    {f.courseName}
                  </td>
                  <td className="py-3 px-4 text-[#A89A91]">
                    {f.feePlan}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#F1E5D8]">
                    ${f.totalAmount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                    ${f.paidAmount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                    ${f.remainingAmount}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#A89A91]">
                    {f.dueDate}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={f.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/students/payments?studentId=${f.studentId}`)}
                    >
                      Pay Now
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
