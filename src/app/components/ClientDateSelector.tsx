'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

export default function ClientDateSelector({ currentDate }: { currentDate: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      router.push(`/tagebuch?date=${newDate}`);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => inputRef.current?.showPicker()}
        className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-outline hover:text-primary"
      >
        <CalendarIcon className="w-4 h-4" />
      </button>
      <input 
        ref={inputRef}
        type="date" 
        value={currentDate}
        onChange={handleDateChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-none"
      />
    </div>
  );
}
