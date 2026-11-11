import React from 'react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

export interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  subtitle,
  breadcrumbs,
  actions,
  badge,
}) => {
  const textDescription = description || subtitle;

  return (
    <div className="flex flex-col gap-2.5 mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#F5F0EA]">
              {title}
            </h1>
            {badge}
          </div>
          {textDescription && (
            <p className="text-xs sm:text-sm text-[#A89A91] max-w-2xl">{textDescription}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
};

export const SectionHeader: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, action, className = '' }) => {
  return (
    <div className={`flex items-center justify-between gap-4 mb-4 ${className}`}>
      <div>
        <h2 className="text-base sm:text-lg font-bold text-[#F5F0EA]">{title}</h2>
        {description && <p className="text-xs text-[#A89A91] mt-0.5">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
