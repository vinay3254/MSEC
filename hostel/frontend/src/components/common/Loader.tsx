import React from 'react';
import { Loader2 } from 'lucide-react';

export const Loader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="w-8 h-8 text-[#4E2478] animate-spin" />
      <p className="text-sm font-medium text-[#5C5468] font-body">{message}</p>
    </div>
  );
};
