import React from 'react';

export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#3A2922] bg-[#171311]">
      <table className={`w-full text-left border-collapse text-sm ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <thead className={`bg-[#1F1916] text-xs font-semibold text-[#A89A91] uppercase tracking-wider border-b border-[#3A2922] ${className}`}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <tbody className={`divide-y divide-[#3A2922]/60 text-[#F5F0EA] ${className}`}>{children}</tbody>;
};

export const TableRow: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}> = ({ children, className = '', onClick, hoverable = true }) => {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors duration-150 ${
        hoverable ? 'hover:bg-[#231A15]' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
};

export const TableHeaderCell: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3.5 whitespace-nowrap ${
        onClick ? 'cursor-pointer select-none hover:text-[#F1E5D8]' : ''
      } ${className}`}
    >
      {children}
    </th>
  );
};

export const TableCell: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return <td className={`px-4 py-3.5 whitespace-nowrap align-middle ${className}`}>{children}</td>;
};
