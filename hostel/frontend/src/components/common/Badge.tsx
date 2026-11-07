import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | 'accent';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-[#EDE4F5] text-[#4E2478] border-[#E3DEE9]',
    accent: 'bg-[#FDE2E7] text-[#F30137] border-[#FDE2E7]',
    success: 'bg-[#E8F5EF] text-[#1C8A5C] border-[#b5e2ce]',
    warning: 'bg-[#FCF3E6] text-[#D98B16] border-[#fae3be]',
    danger: 'bg-[#FDE2E7] text-[#D6264C] border-[#f8bcc7]',
    info: 'bg-[#E9F0F8] text-[#2563A6] border-[#c5daf0]',
    neutral: 'bg-[#FAF8FC] text-[#5C5468] border-[#E3DEE9]',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
