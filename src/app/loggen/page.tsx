import { Suspense } from 'react';
import LogEntryForm from '@/app/components/LogEntryForm';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function LoggenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-8 relative overflow-hidden bg-surface-bright">
      
      {/* Decorative glass elements */}
      <div className="absolute top-0 right-0 -m-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -m-32 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl z-10">
        <header className="flex justify-between items-center mb-8">
          <h1 className="headline-lg">Mahlzeit erfassen</h1>
          <Link 
            href="/"
            className="p-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest transition-colors"
          >
            <X className="w-6 h-6 border-outline" />
          </Link>
        </header>

        <section className="bg-surface-container-lowest shadow-ambient rounded-3xl p-6 sm:p-8">
          <Suspense fallback={
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-32 bg-surface-container rounded-2xl" />
              <div className="h-12 w-32 bg-surface-container rounded-full self-end" />
            </div>
          }>
            <LogEntryForm />
          </Suspense>
        </section>

        <div className="mt-8">
          <p className="text-outline label-sm px-4">
            Beschreibe deine Mahlzeit oder nutze die Symbole für Sprach- und Bilderkennung.
          </p>
        </div>
      </div>
    </main>
  );
}
