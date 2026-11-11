import React from 'react';
import { Clock } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  time: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ events, className = '' }) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-[#A89A91]">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className={`relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#3A2922] ${className}`}>
      {events.map((event) => (
        <div key={event.id} className="relative group">
          {/* Dot / Icon */}
          <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-[#171311] border-2 border-[#7A4930] flex items-center justify-center group-hover:border-[#946246] transition-colors">
            <div className="w-1.5 h-1.5 rounded-full bg-[#946246]" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#F5F0EA] group-hover:text-[#F1E5D8] transition-colors">
                {event.title}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-[#A89A91]">
                <Clock className="w-3 h-3 text-[#7A4930]" />
                <span>{event.time}</span>
              </div>
            </div>

            <p className="text-xs text-[#A89A91] leading-relaxed">{event.description}</p>

            {event.badge && (
              <span className="inline-block mt-1 self-start text-[10px] font-medium px-2 py-0.5 rounded bg-[#2A1710] text-[#F1E5D8] border border-[#5A321F]/40">
                {event.badge}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
