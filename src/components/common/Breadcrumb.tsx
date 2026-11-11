import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-[#A89A91] overflow-x-auto py-1" aria-label="Breadcrumb">
      <Link
        to="/admin/students/list"
        className="flex items-center gap-1 hover:text-[#F1E5D8] transition-colors shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Admin</span>
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const linkTarget = item.path || item.to;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3 h-3 text-[#3A2922] shrink-0" />
            {linkTarget && !isLast ? (
              <Link
                to={linkTarget}
                className="hover:text-[#F1E5D8] transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-[#F5F0EA] whitespace-nowrap">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
