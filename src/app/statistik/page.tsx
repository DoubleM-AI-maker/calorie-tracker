import { Suspense } from 'react';
import Link from 'next/link';
import WeeklyStatistics from '@/app/components/WeeklyStatistics';
import MonthlyStatistics from '@/app/components/MonthlyStatistics';

export default function StatistikPage({
  searchParams,
}: {
  searchParams: { t?: string };
}) {
  const currentTab = searchParams.t === 'month' ? 'month' : 'week';

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-8 relative overflow-hidden bg-surface">
      {/* Decorative glass elements */}
      <div className="absolute top-0 right-0 -m-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -m-32 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl z-10 flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="label-sm text-outline uppercase tracking-wider">Trend & Analyse</p>
          <h1 className="headline-lg">Statistik</h1>
        </header>

        {/* Tab Switcher */}
        <div className="flex bg-surface-container-low p-1 rounded-full self-start">
          <Link
            href="?t=week"
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              currentTab === 'week'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            Woche
          </Link>
          <Link
            href="?t=month"
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              currentTab === 'month'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            Monat
          </Link>
        </div>

        <section className="flex flex-col gap-8">
          <Suspense fallback={
            <div className="bg-surface-container-lowest h-[400px] rounded-3xl animate-pulse" />
          }>
            {currentTab === 'week' ? (
              <WeeklyStatistics />
            ) : (
              <MonthlyStatistics />
            )}
          </Suspense>
        </section>
      </div>
    </main>
  );
}
