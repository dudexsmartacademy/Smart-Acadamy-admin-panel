import { StudentCertificate } from '../types';
import { logActivity } from './activityService';

let cachedCertificates: StudentCertificate[] = [];
const listeners: Array<() => void> = [];

function notifyChange(): void {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dudex_certificates_changed'));
  }
}

export const subscribeCertificates = (cb: () => void): (() => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const getCertificates = (): StudentCertificate[] => {
  return cachedCertificates;
};

export const getCertificateById = (id: string): StudentCertificate | undefined => {
  return cachedCertificates.find((c) => c.id === id || c.certificateNumber === id);
};

export const getCertificatesByStudent = (studentId: string): StudentCertificate[] => {
  return cachedCertificates.filter(
    (c) => c.studentId === studentId || c.studentIdCode === studentId
  );
};

export const issueCertificate = (data: Omit<StudentCertificate, 'id' | 'issuedDate'> & { issuedDate?: string }): StudentCertificate => {
  const id = crypto.randomUUID();
  const certificateNumber = `DX-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const newCert: StudentCertificate = {
    ...data,
    id,
    certificateNumber: data.certificateNumber || certificateNumber,
    issuedDate: data.issuedDate || new Date().toISOString().split('T')[0],
    status: data.status || 'Issued',
  };

  cachedCertificates.unshift(newCert);
  notifyChange();

  logActivity({
    action: 'Issued Certificate',
    user: 'Super Admin',
    details: `Issued ${newCert.certificateNumber} for ${newCert.studentName} (${newCert.courseName})`,
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  return newCert;
};

export const updateCertificateStatus = (id: string, status: StudentCertificate['status']): StudentCertificate | null => {
  const idx = cachedCertificates.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  cachedCertificates[idx].status = status;
  notifyChange();

  logActivity({
    action: `Certificate ${status}`,
    user: 'Super Admin',
    details: `Updated certificate ${cachedCertificates[idx].certificateNumber} status to ${status}`,
    timestamp: new Date().toISOString(),
    status: 'success'
  });

  return cachedCertificates[idx];
};

export const certificateService = {
  getCertificates,
  getCertificateById,
  getCertificatesByStudent,
  issueCertificate,
  updateCertificateStatus,
  subscribe: subscribeCertificates,
};
