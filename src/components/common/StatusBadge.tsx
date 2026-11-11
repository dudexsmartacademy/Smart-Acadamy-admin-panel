import React from 'react';
import { Badge } from './Badge';

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase().replace(/[\s_-]+/g, '_');

  switch (normalized) {
    case 'active':
    case 'approved':
    case 'present':
    case 'published':
    case 'graded':
    case 'live':
      return (
        <Badge variant="success" size={size} className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Badge>
      );

    case 'pending':
    case 'under_review':
    case 'late':
    case 'upcoming':
      return (
        <Badge variant="warning" size={size} className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Badge>
      );

    case 'inactive':
    case 'draft':
    case 'on_leave':
    case 'holiday':
    case 'closed':
    case 'completed':
      return (
        <Badge variant="secondary" size={size} className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A89A91]" />
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Badge>
      );

    case 'rejected':
    case 'suspended':
    case 'absent':
    case 'missing_punch':
    case 'cancelled':
      return (
        <Badge variant="danger" size={size} className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Badge>
      );

    case 'converted':
    case 'full_time':
    case 'part_time':
      return (
        <Badge variant="info" size={size} className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Badge>
      );

    default:
      return (
        <Badge variant="primary" size={size}>
          {status}
        </Badge>
      );
  }
};
