import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  description,
  headerAction,
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-[#E3DEE9] shadow-2xs overflow-hidden ${className}`}>
      {(title || headerAction) && (
        <div className="px-6 py-4 border-b border-[#E3DEE9] flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-bold text-[#1A1523] font-heading">{title}</h3>}
            {description && <p className="text-xs text-[#5C5468] mt-0.5 font-body">{description}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};
