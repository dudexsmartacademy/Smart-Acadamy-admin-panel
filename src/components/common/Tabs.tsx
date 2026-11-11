import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'underline' | 'pills';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'underline',
}) => {
  if (variant === 'pills') {
    return (
      <div className={`flex items-center gap-1.5 p-1 bg-[#111111] rounded-xl border border-[#3A2922] overflow-x-auto ${className}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#5A321F] text-[#F1E5D8] shadow-sm font-semibold'
                  : 'text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#2A1710]/40'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-[#2A1710] text-[#F1E5D8]' : 'bg-[#2A1710] text-[#A89A91]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`border-b border-[#3A2922] flex items-center gap-2 overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? 'border-[#7A4930] text-[#F1E5D8] font-semibold bg-[#2A1710]/20'
                : 'border-transparent text-[#A89A91] hover:text-[#F5F0EA] hover:border-[#3A2922]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-[#5A321F] text-[#F1E5D8]' : 'bg-[#2A1710] text-[#A89A91]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
