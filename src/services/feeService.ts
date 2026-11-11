import { whenSignedIn } from '../lib/supabase';
import { writeFailure, writeResult } from '../lib/persist';
import { supabaseAny } from '../lib/supabase';
import { FeeRecord, PaymentTransaction, FeeStatus } from '../types';
import { studentService } from './studentService';
import { activityService } from './activityService';

let cachedFees: FeeRecord[] = [];
let cachedPayments: PaymentTransaction[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_fees_changed'));
  }
}

// ── Row Mappers ────────────────────────────────────────────────────────────────

function rowToFeeRecord(row: any): FeeRecord {
  const prof = row.profiles || row.student_profiles?.profiles || {};
  const totalAmount = Number(row.total_amount || row.total_fee || row.amount || 0);
  const paidAmount = Number(row.paid_amount || 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  let status: FeeStatus = 'Pending';
  if (remainingAmount === 0 && totalAmount > 0) status = 'Paid';
  else if (paidAmount > 0) status = 'Partially Paid';
  else if (row.due_date && new Date(row.due_date) < new Date()) status = 'Overdue';

  return {
    id: row.id,
    invoiceNumber: row.invoice_number || `INV-${row.id?.substring(0, 8)}`,
    studentId: row.student_id || '',
    studentName: prof.full_name || row.student_name || 'Student',
    studentIdCode: row.student_profiles?.rrn || '',
    courseName: row.course_name || 'Academic Programme',
    batchName: row.batch_name || undefined,
    feePlan: row.fee_plan || row.fee_type || 'Standard Tuition',
    totalAmount,
    paidAmount,
    remainingAmount,
    dueDate: row.due_date || row.created_at?.split('T')[0] || '',
    status: (row.status as FeeStatus) || status,
    lastPaymentDate: row.last_payment_date || undefined,
  };
}

function rowToPayment(row: any): PaymentTransaction {
  const prof = row.profiles || row.student_profiles?.profiles || {};
  const students = studentService.getStudents();
  const student = students.find((s) => s.id === row.student_id || s.userId === row.student_id);

  return {
    id: row.id,
    receiptNumber: row.receipt_number || `REC-${row.id?.substring(0, 8)}`,
    studentId: row.student_id || student?.id || '',
    studentName: prof.full_name || student?.fullName || row.student_name || 'Student',
    studentIdCode: student?.studentId || row.student_profiles?.rrn || '',
    feeRecordId: row.fee_record_id || undefined,
    amount: Number(row.amount || 0),
    paymentDate: row.payment_date || row.created_at?.split('T')[0] || '',
    paymentMethod: (row.payment_method as PaymentTransaction['paymentMethod']) || 'Cash',
    transactionReference: row.transaction_reference || row.txn_ref || '',
    collectedBy: row.collected_by || undefined,
    remarks: row.remarks || undefined,
    status: (row.status as PaymentTransaction['status']) || 'Successful',
  };
}

// ── Supabase Fetch ─────────────────────────────────────────────────────────────

export const fetchFees = async (): Promise<FeeRecord[]> => {
  try {
    let { data, error } = await supabaseAny
      .from('fee_records')
      .select(`*, profiles(full_name)`)
      .order('created_at', { ascending: false });

    if (error) {
      const fallback = await supabaseAny
        .from('fee_records')
        .select('*')
        .order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (!error && data && Array.isArray(data)) {
      cachedFees = data.map(rowToFeeRecord);
      notifyChange();
    } else if (error) {
      console.warn('feeService: Could not fetch fee_records:', error.message);
    }
  } catch (err) {
    console.error('Failed to fetch fee records from Supabase:', err);
  }
  return cachedFees;
};

export const fetchPayments = async (): Promise<PaymentTransaction[]> => {
  try {
    const { data, error } = await supabaseAny
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      cachedPayments = data.map(rowToPayment);
      notifyChange();
    } else if (error) {
      console.warn('feeService: Could not fetch payment_transactions:', error.message);
    }
  } catch (err) {
    console.error('Failed to fetch payments from Supabase:', err);
  }
  return cachedPayments;
};

// Initial background fetches
whenSignedIn(fetchFees);
whenSignedIn(fetchPayments);

// ── Subscribe ──────────────────────────────────────────────────────────────────

export const subscribeFees = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

// ── Getters ────────────────────────────────────────────────────────────────────

export const getFees = (): FeeRecord[] => cachedFees;
export const getFeeRecords = getFees;

export const getFeeRecordById = (id: string): FeeRecord | undefined =>
  cachedFees.find((f) => f.id === id || f.invoiceNumber === id);

export const getFeesByStudent = (studentId: string): FeeRecord[] => {
  // fee_records.student_id references profiles.id (auth UID), but the admin
  // panel often passes student_profiles.id. Try both.
  const student = studentService.getStudentById(studentId);
  const altId = student?.userId;
  return cachedFees.filter(
    (f) => f.studentId === studentId || (altId && f.studentId === altId)
  );
};

export const getFeeRecordByStudentId = (studentId: string): FeeRecord | undefined =>
  cachedFees.find((f) => f.studentId === studentId);

export const getPayments = (): PaymentTransaction[] => cachedPayments;

export const getPaymentsByStudent = (studentId: string): PaymentTransaction[] => {
  const student = studentService.getStudentById(studentId);
  const altId = student?.userId;
  return cachedPayments.filter(
    (p) => p.studentId === studentId || (altId && p.studentId === altId)
  );
};

export const getPaymentsByStudentId = getPaymentsByStudent;

// ── Mutations ──────────────────────────────────────────────────────────────────

export const recordPayment = (data: Partial<PaymentTransaction> & {
  feeRecordId?: string;
  studentId: string;
  studentName: string;
  amount: number;
  paymentMethod: PaymentTransaction['paymentMethod'];
}): PaymentTransaction => {
  const count = cachedPayments.length + 1;
  const year = new Date().getFullYear();

  const newPayment: PaymentTransaction = {
    id: crypto.randomUUID(),
    receiptNumber: `REC-${year}-${String(count).padStart(3, '0')}`,
    paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
    status: (data.status as any) || 'Successful',
    feeRecordId: data.feeRecordId || '',
    studentId: data.studentId,
    studentName: data.studentName,
    amount: Number(data.amount),
    paymentMethod: data.paymentMethod,
    transactionReference: data.transactionReference || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    remarks: data.remarks || 'Tuition receipt verified.',
    ...data,
  };

  cachedPayments = [newPayment, ...cachedPayments];

  // Update FeeRecord locally
  const feeIndex = cachedFees.findIndex(
    (f) => f.id === data.feeRecordId || f.studentId === data.studentId
  );

  if (feeIndex !== -1) {
    const currentFee = cachedFees[feeIndex];
    const newPaid = currentFee.paidAmount + data.amount;
    const newRemaining = Math.max(0, currentFee.totalAmount - newPaid);

    let newStatus: any = 'Pending';
    if (newRemaining === 0) newStatus = 'Paid';
    else if (newPaid > 0) newStatus = 'Partially Paid';

    cachedFees[feeIndex] = {
      ...currentFee,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      lastPaymentDate: new Date().toISOString().split('T')[0],
    };

    // Persist fee record update
    supabaseAny
      .from('fee_records')
      .update({
        paid_amount: newPaid,
        status: String(newStatus).toLowerCase().replace(' ', '_'),
        last_payment_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', cachedFees[feeIndex].id)
      .then(writeResult('Updating the fee record'), writeFailure('Updating the fee record'));

    // Update student entity
    studentService.updateStudent(data.studentId, {
      paidFee: newPaid,
      feeStatus: newStatus,
    });
  }

  notifyChange();

  // Persist payment transaction
  supabaseAny
    .from('payment_transactions')
    .insert({
      id: newPayment.id,
      receipt_number: newPayment.receiptNumber,
      student_id: newPayment.studentId,
      fee_record_id: newPayment.feeRecordId || null,
      amount: newPayment.amount,
      payment_date: newPayment.paymentDate,
      payment_method: newPayment.paymentMethod,
      transaction_reference: newPayment.transactionReference,
      remarks: newPayment.remarks || null,
      status: String(newPayment.status).toLowerCase() || 'successful',
    })
    .then(writeResult('Saving the fee record'), (err: any) => {
      console.warn('feeService: payment insert failed:', err?.message);
    });

  activityService.log(
    'Tuition Payment Recorded',
    'payments',
    data.studentName,
    `Recorded payment of ₹${data.amount.toLocaleString()} via ${data.paymentMethod} (${newPayment.receiptNumber}) for ${data.studentName}`
  );

  return newPayment;
};

export const createFeeRecord = (data: Partial<FeeRecord> & {
  studentId: string;
  studentName: string;
  courseName: string;
  feePlan: FeeRecord['feePlan'];
  totalAmount: number;
}): FeeRecord => {
  const count = cachedFees.length + 1;
  const year = new Date().getFullYear();

  const paid = data.paidAmount || 0;
  const remaining = Math.max(0, data.totalAmount - paid);
  let status: any = data.status || 'Pending';
  if (remaining === 0) status = 'Paid';
  else if (paid > 0) status = 'Partially Paid';

  const newFee: FeeRecord = {
    id: crypto.randomUUID(),
    invoiceNumber: data.invoiceNumber || `INV-${year}-${String(count).padStart(3, '0')}`,
    studentId: data.studentId,
    studentName: data.studentName,
    courseName: data.courseName,
    feePlan: data.feePlan,
    totalAmount: data.totalAmount,
    paidAmount: paid,
    remainingAmount: remaining,
    dueDate: data.dueDate || new Date().toISOString().split('T')[0],
    status,
    ...data,
  };

  cachedFees = [newFee, ...cachedFees];
  notifyChange();

  supabaseAny
    .from('fee_records')
    .insert({
      id: newFee.id,
      invoice_number: newFee.invoiceNumber,
      student_id: newFee.studentId,
      course_name: newFee.courseName,
      fee_plan: newFee.feePlan,
      total_amount: newFee.totalAmount,
      paid_amount: newFee.paidAmount,
      due_date: newFee.dueDate,
      status: String(newFee.status).toLowerCase().replace(' ', '_'),
    })
    .then(writeResult('Saving the fee record'), (err: any) => {
      console.warn('feeService: fee record insert failed:', err?.message);
    });

  return newFee;
};

export const feeService = {
  getFees,
  fetchFees,
  getFeeRecords,
  getFeeRecordById,
  getFeesByStudent,
  getFeeRecordByStudentId,
  getPayments,
  fetchPayments,
  getPaymentsByStudent,
  getPaymentsByStudentId,
  recordPayment,
  createFeeRecord,
  subscribe: subscribeFees,
};
