'use client';

import { useTransition } from 'react';
import { quickLogFavoriteAction } from '../actions';
import { Plus, Check, Loader2 } from 'lucide-react';

interface FavoriteRecord {
  id: number;
  label: string;
  grams: string | null;
}

export default function FavoriteItem({ favorite }: { favorite: FavoriteRecord }) {
  const [isPending, startTransition] = useTransition();

  const handleLog = () => {
    startTransition(async () => {
      const res = await quickLogFavoriteAction(favorite.id);
      if (!res.success) {
        alert('Fehler beim Loggen: ' + res.error);
      }
    });
  };

  return (
    <button
      onClick={handleLog}
      disabled={isPending}
      className="w-full bg-surface-container-lowest rounded-2xl p-3 flex justify-between items-center 
                 shadow-ambient active:scale-[0.98] transition-all outline-none focus:ring-2 focus:ring-primary/20 group"
    >
      <div className="flex-1 overflow-hidden pr-3 text-left">
        <p className="font-medium text-sm truncate text-on-surface">
          {favorite.label}
        </p>
        <p className="label-sm text-outline mt-0.5 font-mono text-[10px]">
          {favorite.grams || '100'}g
        </p>
      </div>
      
      <div className="flex-shrink-0">
        <div className={`p-1.5 rounded-full transition-colors ${isPending ? 'bg-primary/10' : 'bg-surface-container-low group-hover:bg-primary/10'}`}>
          {isPending ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Plus className="w-4 h-4 text-primary" />
          )}
        </div>
      </div>
    </button>
  );
}
