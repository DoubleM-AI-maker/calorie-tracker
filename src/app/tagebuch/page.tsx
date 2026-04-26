import { Suspense } from 'react';
import DayMeals from '../components/TodaysMeals';
import Link from 'next/link';
import { formatBerlinDate, getBerlinDayRange } from '@/lib/date';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

import ClientDateSelector from '../components/ClientDateSelector';

export default async function TagebuchPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const { start, end, dateStr } = getBerlinDayRange(date);
  const now = new Date(start);
  
  const dayName = now.toLocaleDateString('de-DE', { weekday: 'long', timeZone: 'Europe/Berlin' });
  const dateStrFormatted = now.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', timeZone: 'Europe/Berlin' });
  
  const todayStr = getBerlinDayRange().dateStr;
  const isToday = dateStr === todayStr;

  // Calculate prev/next days
  // 'start' is Berlin midnight of current day
  // 'end' is 23:59:59 of current day
  const prevDate = new Date(start.getTime() - 12 * 60 * 60 * 1000); // 12 hours before midnight = previous day
  const prevStr = formatBerlinDate(prevDate);

  const nextDate = new Date(end.getTime() + 12 * 60 * 60 * 1000); // 12 hours after end of day = next day
  const nextStr = formatBerlinDate(nextDate);

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 -m-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl flex flex-col gap-6 z-10">

        {/* Header/Date Selector */}
        <div className="flex items-center justify-between w-full pt-2 pb-6">
          <Link 
            href={`/tagebuch?date=${prevStr}`}
            className="text-sm font-semibold text-outline/30 hover:text-outline transition-colors"
          >
            Gestern
          </Link>
          
          <div className="flex flex-col items-center gap-0.5">
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
               {isToday ? 'HEUTE' : dayName}
             </span>
             <div className="flex items-center gap-1">
               <span className="text-xl font-bold tracking-tight">{dateStrFormatted}</span>
               <ClientDateSelector currentDate={dateStr} />
             </div>
          </div>

          <Link 
            href={`/tagebuch?date=${nextStr}`}
            className="text-sm font-semibold text-outline/30 hover:text-outline transition-colors"
          >
            Morgen
          </Link>
        </div>

        {/* Meals for selected day */}
        <Suspense fallback={
          <div className="flex flex-col gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface-container-lowest shadow-ambient rounded-2xl p-4 h-24 animate-pulse" />
            ))}
          </div>
        }>
          <DayMeals date={date} />
        </Suspense>

      </div>
    </main>
  );
}
