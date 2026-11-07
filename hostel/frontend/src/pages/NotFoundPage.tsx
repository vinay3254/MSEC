import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAF8FC] flex flex-col items-center justify-center p-4 text-center font-body">
      <div className="p-4 bg-[#EDE4F5] text-[#4E2478] rounded-2xl mb-4 border border-[#E3DEE9]">
        <GraduationCap className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-[#1A1523] font-heading">404</h1>
      <p className="text-lg font-semibold text-[#1A1523] mt-2 font-heading">Hostel Page Not Found</p>
      <p className="text-sm text-[#5C5468] max-w-sm mt-1">
        The requested residential management view doesn't exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#4E2478] hover:bg-[#38195A] text-white rounded-xl text-sm font-semibold transition shadow-xs font-heading"
      >
        <ArrowLeft className="w-4 h-4" /> Return to Dashboard
      </Link>
    </div>
  );
};
