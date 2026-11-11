import React from 'react';
import { Card } from './Card';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  icon: React.ReactNode;
  secondaryInfo?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  to?: string;
  accentColor?: string;
  change?: string;
  changeType?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  title,
  value,
  icon,
  secondaryInfo,
  trend,
  to,
  change,
  changeType,
  onClick,
}) => {
  const cardLabel = label || title || '';
  const cardTrend = trend || (change ? { value: change, isPositive: changeType === 'positive' || changeType === 'increase' } : undefined);
  const content = (
    <Card
      hoverable={!!to}
      className="group relative overflow-hidden transition-all duration-300 hover:border-[#7A4930] hover:shadow-xl hover:shadow-[#2A1710]/40"
    >
      {/* Background subtle radial gradient */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-[#5A321F]/10 blur-2xl group-hover:bg-[#5A321F]/20 transition-all pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <div className="p-2.5 rounded-lg bg-[#2A1710] text-[#F1E5D8] border border-[#5A321F]/50 group-hover:border-[#946246] transition-colors">
          {icon}
        </div>
        {to && (
          <div className="text-[#A89A91] group-hover:text-[#F1E5D8] group-hover:translate-x-0.5 transition-all">
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-[#A89A91] tracking-wide uppercase">{cardLabel}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl sm:text-3xl font-bold text-[#F5F0EA] tracking-tight">{value}</span>
          {cardTrend && (
            <span
              className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${
                cardTrend.isPositive
                  ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                  : 'text-rose-400 bg-rose-950/40 border border-rose-800/40'
              }`}
            >
              {cardTrend.isPositive ? (
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
              )}
              {cardTrend.value}
            </span>
          )}
        </div>
      </div>

      {(secondaryInfo || trend?.label) && (
        <div className="mt-2.5 pt-2.5 border-t border-[#3A2922]/50 flex items-center justify-between text-xs text-[#A89A91]">
          <span>{secondaryInfo}</span>
          {trend?.label && <span className="text-[#7A6F68]">{trend.label}</span>}
        </div>
      )}
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block outline-none focus:ring-2 focus:ring-[#946246]/50 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
};
