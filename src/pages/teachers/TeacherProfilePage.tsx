import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  GraduationCap,
  Mail,
  Phone,
  ShieldCheck,
  Building2,
  Plus,
  Power,
} from 'lucide-react';

import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AddFacultyModal } from './AddFacultyModal';
import { useToast } from '../../context/ToastContext';
import { teacherService } from '../../services/teacherService';
import { Teacher } from '../../types';

export const TeacherProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [teacherToDeactivate, setTeacherToDeactivate] = useState<Teacher | null>(null);

  const loadTeachers = () => {
    const allTeachers = teacherService.getTeachers();
    setTeachers(allTeachers);
  };

  useEffect(() => {
    loadTeachers();
    teacherService.fetchTeachers().then(loadTeachers);

    const unsub = teacherService.onChange(loadTeachers);
    window.addEventListener('dudex_teachers_changed', loadTeachers);

    return () => {
      unsub();
      window.removeEventListener('dudex_teachers_changed', loadTeachers);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Teacher Profiles"
        description="Select a faculty member to view and manage their profile details."
        breadcrumbs={[
          { label: 'Teacher Management', path: '/admin/teachers/profiles' },
          { label: 'Teacher Profiles' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Faculty
          </Button>
        }
      />

      {teachers.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-[#A89A91]">
            No teacher profiles are available.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {teachers.map((teacher) => (
            <Card
              key={teacher.id}
              onClick={() =>
                navigate(`/admin/teachers/profile/${teacher.id}`)
              }
              hoverable
              className="group p-6"
            >
              {/* Profile Header */}
              <div className="flex items-start justify-between gap-4">
                <Avatar
                  src={teacher.avatar}
                  name={teacher.fullName}
                  size="xl"
                />

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title={`${teacher.status === 'suspended' ? 'Reactivate' : 'Deactivate'} ${teacher.fullName}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTeacherToDeactivate(teacher);
                    }}
                    className="p-1.5 rounded-lg text-[#756E67] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <ChevronRight
                    className="w-5 h-5 text-[#A89A91] group-hover:text-[#946246] transition-colors"
                  />
                </div>
              </div>

              {/* Teacher Name */}
              <div className="mt-5">
                <h2 className="text-lg font-bold text-[#F5F0EA]">
                  {teacher.fullName}
                </h2>

                <p className="text-sm text-[#A89A91] mt-1">
                  {teacher.designation}
                </p>
              </div>

              {/* Status */}
              <div className="mt-3">
                <StatusBadge status={teacher.status} size="sm" />
              </div>

              {/* Information */}
              <div className="mt-5 pt-5 border-t border-[#3A2922] space-y-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#946246] shrink-0" />

                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[#A89A91]">
                      Faculty ID
                    </p>

                    <p className="text-xs font-semibold text-[#F5F0EA]">
                      {teacher.teacherId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-[#946246] shrink-0" />

                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[#A89A91]">
                      Department
                    </p>

                    <p className="text-xs font-semibold text-[#F5F0EA]">
                      {teacher.department}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#946246] shrink-0" />

                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-[#A89A91]">
                      Email
                    </p>

                    <p className="text-xs text-[#F5F0EA] truncate">
                      {teacher.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#946246] shrink-0" />

                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[#A89A91]">
                      Phone
                    </p>

                    <p className="text-xs text-[#F5F0EA]">
                      {teacher.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* View Profile */}
              <div className="mt-5 pt-4 border-t border-[#3A2922]">
                <span className="text-xs font-semibold text-[#946246] group-hover:text-[#F1E5D8] transition-colors">
                  View Profile →
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Faculty Modal */}
      <AddFacultyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newTeacher) => {
          loadTeachers();
          navigate(`/admin/teachers/profile/${newTeacher.id}`);
        }}
      />

      {/* Deactivation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(teacherToDeactivate)}
        onClose={() => setTeacherToDeactivate(null)}
        onConfirm={async () => {
          if (!teacherToDeactivate) return;
          try {
            // Suspended profiles are reactivated; any other status is suspended.
            const nextStatus = teacherToDeactivate.status === 'suspended' ? 'active' : 'suspended';
            const updated = await teacherService.setTeacherStatus(teacherToDeactivate.id, nextStatus);
            if (!updated) throw new Error('The teacher record was not found.');
            success(
              nextStatus === 'active' ? 'Faculty Member Reactivated' : 'Faculty Member Suspended',
              `${updated.fullName} is now ${nextStatus}.`
            );
            setTeacherToDeactivate(null);
          } catch (error) {
            toastError(
              'Could Not Update Faculty Status',
              error instanceof Error ? error.message : 'The status was not saved.'
            );
          }
        }}
        title={teacherToDeactivate?.status === 'suspended' ? 'Reactivate Faculty Profile' : 'Deactivate Faculty Profile'}
        message={teacherToDeactivate?.status === 'suspended'
          ? `Reactivate ${teacherToDeactivate?.fullName} (${teacherToDeactivate?.teacherId})? They will be able to use the teacher portal again.`
          : `Deactivate ${teacherToDeactivate?.fullName} (${teacherToDeactivate?.teacherId})? The profile and its records will be preserved.`}
        confirmText={teacherToDeactivate?.status === 'suspended' ? 'Reactivate Faculty' : 'Deactivate Faculty'}
        variant="primary"
      />
    </div>
  );
};
