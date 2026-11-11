import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { AdminHeader } from '../components/layout/AdminHeader';
import { GlobalSearchModal } from '../components/layout/GlobalSearchModal';

export const AdminLayout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#0B0B0B] text-[#F5F0EA] antialiased">
      {/* Sidebar Navigation */}
      <AdminSidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <AdminHeader
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Dynamic Page Outlet with max-width container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto animate-in fade-in duration-200">
          <Outlet />
        </main>
      </div>

      {/* Global Search Dialog Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
};
