import { Suspense } from "react";
import DailyDashboard from "@/app/components/DailyDashboard";
import FavoritesSection from "@/app/components/FavoritesSection";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-8 relative overflow-hidden">
      
      {/* Decorative glass elements */}
      <div className="absolute top-0 right-0 -m-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -m-32 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl flex flex-col gap-6 z-10">

        {/* Calorie Dashboard */}
        <Suspense fallback={
          <div className="bg-surface-container-lowest shadow-ambient rounded-2xl p-8 h-80 animate-pulse" />
        }>
          <DailyDashboard />
        </Suspense>

        {/* Favorites Section */}
        <section className="mt-2">
          <Suspense fallback={<div className="h-24 animate-pulse bg-surface-container rounded-3xl" />}>
            <FavoritesSection />
          </Suspense>
        </section>

      </div>
    </main>
  );
}
