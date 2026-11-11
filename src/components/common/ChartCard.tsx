import React from 'react';
import { Card } from './Card';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => {
  return (
    <Card className={`flex flex-col ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-2 border-b border-[#3A2922]/60">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#F5F0EA]">{title}</h3>
          {subtitle && <p className="text-xs text-[#A89A91] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="flex-1 w-full min-h-[220px]">{children}</div>
    </Card>
  );
};
