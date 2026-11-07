import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  iconBorder?: string;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-[#EDE4F5]',
  iconColor = 'text-[#4E2478]',
  iconBorder = 'border-transparent',
  badge,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#E3DEE9] p-5 shadow-2xs hover:border-[#4E2478]/40 hover:shadow-xs transition-all duration-150 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C5468] font-body">
          {title}
        </p>
        <div className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} border ${iconBorder} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-2">
        <p className="text-3xl font-bold text-[#1A1523] font-heading tracking-tight">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-[#5C5468] font-body">{subtitle}</p>}
      </div>

      {badge && (
        <div className="mt-3 pt-2.5 border-t border-[#E3DEE9] flex items-center justify-between text-xs font-body text-[#5C5468]">
          <span>{badge}</span>
        </div>
      )}
    </div>
  );
};
