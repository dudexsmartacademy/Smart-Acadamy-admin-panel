import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import {
  getPayments,
  recordPayment,
  getFees,
} from '../../services/feeService';
import { getStudents } from '../../services/studentService';
import { PaymentTransaction } from '../../types';

export const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const students = getStudents();
  const fees = getFees();

  const preselectedStudent = searchParams.get('studentId') || students[0]?.id || '';

  const [formData, setFormData] = useState({
    studentId: preselectedStudent,
    amount: 600,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer' as PaymentTransaction['paymentMethod'],
    transactionReference: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    remarks: 'Tuition installment receipt verified.',
  });

  const loadData = () => {
    setPayments(getPayments());
  };

  useEffect(() => {
    loadData();
    import('../../services/feeService').then((m) => m.fetchPayments().then(loadData));
    const handleChanged = () => loadData();
    window.addEventListener('dudex_fees_changed', handleChanged);
    return () => window.removeEventListener('dudex_fees_changed', handleChanged);
  }, []);

  const filtered = payments.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        p.studentName.toLowerCase().includes(q) ||
        p.transactionReference.toLowerCase().includes(q) ||
        p.paymentMethod.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const selStudent = students.find((s) => s.id === formData.studentId);
    if (!selStudent) {
      showToast('Please select a student.', 'error');
      return;
    }

    // Find active fee record for student
    const feeRecord = fees.find((f) => f.studentId === selStudent.id);
    if (!feeRecord) {
      showToast('No outstanding fee record found for student.', 'error');
      return;
    }

    recordPayment({
      feeRecordId: feeRecord.id,
      studentId: selStudent.id,
      studentName: selStudent.fullName,
      amount: Number(formData.amount),
      paymentDate: formData.paymentDate,
      paymentMethod: formData.paymentMethod,
      transactionReference: formData.transactionReference,
      remarks: formData.remarks,
    });

    showToast(`Recorded payment of $${formData.amount} for ${selStudent.fullName}!`, 'success');
    setIsModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Tuition Payment Transactions"
        subtitle="Record tuition receipt deposits, verify transaction IDs, and reconcile student ledger balances"
        breadcrumbs={[
          { label: 'Admin', to: '/admin/students' },
          { label: 'Students', to: '/admin/students' },
          { label: 'Payments' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Record Payment Entry
          </Button>
        }
      />

      {/* Filter Bar */}
      <Card className="p-4 bg-[#140F0D] border-[#3A2922]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#946246] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student, transaction reference, or method..."
            className="w-full pl-9 pr-4 py-2 bg-[#1C1714] border border-[#3A2922] rounded-lg text-xs sm:text-sm text-[#F5F0EA] placeholder-[#A89A91]/60 focus:outline-none focus:border-[#946246]"
          />
        </div>
      </Card>

      {/* Payments History Table */}
      <Card className="overflow-hidden border-[#3A2922] bg-[#140F0D]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3A2922] bg-[#1A1412] text-[11px] font-bold uppercase tracking-wider text-[#A89A91]">
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A1710]">
              {filtered.map((txn) => (
                <tr key={txn.id} className="hover:bg-[#1E1815]/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#F1E5D8]">
                    {txn.transactionReference}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#F5F0EA]">
                    <button
                      onClick={() => navigate(`/admin/students/${txn.studentId}`)}
                      className="hover:text-[#946246] transition-colors flex items-center gap-1.5 text-left"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-[#946246]" />
                      {txn.studentName}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-[#A89A91]">
                    {txn.paymentMethod}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                    ${txn.amount}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#A89A91]">
                    {txn.paymentDate}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={txn.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-[#A89A91] italic max-w-[200px] truncate">
                    {txn.remarks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Student Fee Payment"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#A89A91] mb-1">Select Student *</label>
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentId}) - Fee: {s.feeStatus || 'Pending'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A89A91] mb-1">Amount ($) *</label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-[#A89A91] mb-1">Payment Method *</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A89A91] mb-1">Transaction Ref *</label>
              <input
                type="text"
                required
                value={formData.transactionReference}
                onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-[#A89A91] mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#A89A91] mb-1">Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full bg-[#1C1714] border border-[#3A2922] text-[#F5F0EA] rounded-lg p-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Record & Reconcile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
