import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  Calendar,
  FileCheck2,
  CalendarRange,
  FileText,
  Activity,
  UserCheck,
  Building2,
  BookOpen,
  Mail,
  ChevronDown,
  ChevronRight,
  Shield,
  Settings,
  User,
  LogOut,
  Sliders,
  HardDrive,
  KeyRound,
  Layers,
  Award,
  CreditCard,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  BookMarked,
  Library,
  Presentation,
  DoorOpen,
  Megaphone,
  BarChart3,
  Code2,
  HelpCircle,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

import { teacherApplicationService } from '../../services/teacherApplicationService';
import { teacherLeaveService } from '../../services/teacherLeaveService';
import { getAdmissions } from '../../services/admissionService';
import { getAtRiskStudents } from '../../services/studentService';
import { getStudentQueries } from '../../services/studentQueryService';

export interface AdminSidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  badge?: number;
  isDanger?: boolean;
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isMobileOpen,
  onMobileClose,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { logout, admin } = useAuth();
  const location = useLocation();

  // =======================================================
  // OPEN SECTIONS
  // =======================================================

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general:
      location.pathname.startsWith('/admin/academic') ||
      location.pathname.startsWith('/admin/calendar') ||
      location.pathname.startsWith('/admin/announcements') ||
      location.pathname.startsWith('/admin/student-emails'),

    students: location.pathname.startsWith(
      '/admin/students'
    ),

    teachers: location.pathname.startsWith(
      '/admin/teachers'
    ),
  });

  const toggleSection = (key: string) => {
    setOpenSections((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  // =======================================================
  // BADGES
  // =======================================================

  const pendingApps = teacherApplicationService
    .getApplications()
    .filter(
      (application) => application.status === 'pending'
    )
    .length;

  const pendingLeaves = teacherLeaveService
    .getLeaveRequests()
    .filter(
      (leave) => leave.status === 'pending'
    )
    .length;

  const pendingQueriesCount = getStudentQueries().filter(
    (q) => q.status.toLowerCase() === 'pending'
  ).length;

  const atRiskCount = getAtRiskStudents().length;

  // =======================================================
  // TEACHER NAVIGATION
  // =======================================================

  const teacherNavLinks: NavItem[] = [
    {
      to: '/admin/teachers/profiles',
      label: 'Teacher Profiles',
      icon: <User className="w-4 h-4" />,
    },

    {
      to: '/admin/teachers/classes',
      label: 'Teacher Classes',
      icon: <Layers className="w-4 h-4" />,
    },

    {
      to: '/admin/teachers/attendance',
      label: 'Teacher Attendance',
      icon: <CalendarCheck className="w-4 h-4" />,
    },

    {
      to: '/admin/teachers/leave',
      label: 'Teacher Leave',
      icon: <UserCheck className="w-4 h-4" />,
      badge: pendingLeaves,
    },

    {
      to: '/admin/teachers/notes',
      label: 'Teacher Notes',
      icon: <FileText className="w-4 h-4" />,
    },

    {
      to: '/admin/teachers/hackerrank',
      label: 'Teacher HackerRank',
      icon: <Code2 className="w-4 h-4" />,
    },
  ];

  // =======================================================
  // STUDENT NAVIGATION
  // =======================================================

  const studentNavLinks: NavItem[] = [
    {
      to: '/admin/students/list',
      label: 'All Students',
      icon: <Users className="w-4 h-4" />,
    },

    {
      to: '/admin/students/mark-attendance',
      label: 'Mark Attendance',
      icon: <UserCheck className="w-4 h-4" />,
    },

    {
      to: '/admin/students/attendance',
      label: 'Student Attendance',
      icon: <CalendarCheck className="w-4 h-4" />,
    },

    {
      to: '/admin/students/results',
      label: 'Results',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },

    {
      to: '/admin/students/queries',
      label: 'Student Queries',
      icon: <HelpCircle className="w-4 h-4" />,
      badge: pendingQueriesCount,
    },

    {
      to: '/admin/students/at-risk',
      label: 'At-Risk Students',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: atRiskCount,
      isDanger: true,
    },
  ];


  // =======================================================
  // GENERAL MANAGEMENT
  // =======================================================

  const generalNavLinks: NavItem[] = [
    {
      to: '/admin/academic',
      label: 'Create Academic',
      icon: <Building2 className="w-4 h-4" />,
    },

    {
      to: '/admin/student-emails',
      label: 'Student Mail IDs',
      icon: <Mail className="w-4 h-4" />,
    },

    {
      to: '/admin/calendar',
      label: 'Master Calendar',
      icon: <Calendar className="w-4 h-4" />,
    },

    {
      to: '/admin/announcements',
      label: 'Announcements',
      icon: <Megaphone className="w-4 h-4" />,
    },
  ];

  // =======================================================
  // GENERIC NAV ITEM
  // =======================================================

  const renderNavItem = (item: NavItem) => {
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onMobileClose}
        title={isCollapsed ? item.label : undefined}
        className={({ isActive }) =>
          `flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            isActive
              ? 'bg-[#5A321F] text-[#F1E5D8] shadow-md font-semibold border border-[#7A4930]/50'
              : 'text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#1E1815]'
          }`
        }
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0">
            {item.icon}
          </span>

          {!isCollapsed && (
            <span className="truncate">
              {item.label}
            </span>
          )}
        </div>

        {!isCollapsed &&
          item.badge !== undefined &&
          item.badge > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                item.isDanger
                  ? 'bg-rose-900/80 text-rose-200 border border-rose-700/50'
                  : 'bg-[#7A4930] text-[#F1E5D8]'
              }`}
            >
              {item.badge}
            </span>
          )}
      </NavLink>
    );
  };

  // =======================================================
  // SECTION
  // =======================================================

  const renderSection = (
    key: string,
    label: string,
    icon: React.ReactNode,
    links: NavItem[]
  ) => {
    return (
      <div>
        {!isCollapsed ? (
          <button
            type="button"
            onClick={() => toggleSection(key)}
            className="w-full flex items-center justify-between px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#A89A91]/80 hover:text-[#F5F0EA] cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              {icon}
              {label}
            </span>

            {openSections[key] ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <div className="h-[1px] bg-[#3A2922] my-2" />
        )}

        {(!isCollapsed ? openSections[key] : true) && (
          <div className="space-y-1">
            {links.map(renderNavItem)}
          </div>
        )}
      </div>
    );
  };

  // =======================================================
  // SIDEBAR
  // =======================================================

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111111] border-r border-[#3A2922] select-none">

      {/* BRAND */}

      <div className="h-16 px-4 flex items-center justify-between border-b border-[#3A2922] bg-[#140F0D]">

        <div className="flex items-center gap-3 overflow-hidden">

          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D1B13] to-[#160D09] border border-[#946246]/50 flex items-center justify-center text-[#F1E5D8] shadow-md shrink-0 overflow-hidden p-1.5">
            <img src="/logo.png?v=20261031_0715" alt="DudeX Logo" className="w-full h-full object-contain" />
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">

              <span className="text-sm font-extrabold tracking-wide text-[#F5F0EA] truncate">
                DUDEx{' '}
                <span className="text-[#946246] font-normal text-xs uppercase">
                  Academy
                </span>
              </span>

              <span className="text-[10px] font-semibold text-[#A89A91] tracking-wider uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Admin Operating System
              </span>

            </div>
          )}

        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#2A1710] transition-colors"
          title={
            isCollapsed
              ? 'Expand Sidebar'
              : 'Collapse Sidebar'
          }
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

      </div>

      {/* NAVIGATION */}

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">



        {/* STUDENTS */}

        {renderSection(
          'students',
          'Student Management',
          <Users className="w-3.5 h-3.5 text-[#946246]" />,
          studentNavLinks
        )}

        {/* TEACHERS */}

        {renderSection(
          'teachers',
          'Teacher Management',
          <Building2 className="w-3.5 h-3.5 text-[#946246]" />,
          teacherNavLinks
        )}

        {/* GENERAL */}

        {renderSection(
          'general',
          'General Management',
          <BookOpen className="w-3.5 h-3.5 text-[#946246]" />,
          generalNavLinks
        )}

      </div>

      {/* FOOTER */}

      <div className="p-3 border-t border-[#3A2922] bg-[#140F0D]">

        <div className="flex items-center justify-between gap-2">

          <NavLink
            to="/admin/profile"
            onClick={onMobileClose}
            className="flex items-center gap-2.5 flex-1 min-w-0 p-1.5 rounded-lg hover:bg-[#2A1710]/40 transition-colors"
            title={
              isCollapsed
                ? 'Admin Profile'
                : undefined
            }
          >

            <div className="w-8 h-8 rounded-full bg-[#2A1710] border border-[#5A321F]/60 flex items-center justify-center text-[#F1E5D8] text-xs font-bold shrink-0">
              {admin?.name?.charAt(0) || 'A'}
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0">

                <span className="text-xs font-semibold text-[#F5F0EA] truncate">
                  {admin?.name || 'Administrator'}
                </span>

                <span className="text-[10px] text-[#A89A91] truncate">
                  {admin?.role || 'Super Admin'}
                </span>

              </div>
            )}

          </NavLink>


          <button
            type="button"
            onClick={() => {
              logout();
              onMobileClose();
            }}
            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </div>

    </div>
  );

  // =======================================================
  // RETURN
  // =======================================================

  return (
    <>
      {/* DESKTOP */}

      <aside
        className={`hidden lg:block h-screen sticky top-0 transition-all duration-300 z-30 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* MOBILE */}

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">

          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>

        </div>
      )}
    </>
  );
};

export default AdminSidebar;