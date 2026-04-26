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
      className="flex-shrink-0 w-32 h-32 bg-surface-container-lowest rounded-3xl p-4 flex flex-col justify-between items-start 
                 shadow-ambient active:scale-95 transition-all outline-none focus:ring-2 focus:ring-primary/20 group"
    >
      <div className="w-full flex justify-end">
        <div className={`p-1.5 rounded-full transition-colors ${isPending ? 'bg-primary/10' : 'bg-surface-container-low group-hover:bg-primary/10'}`}>
          {isPending ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Plus className="w-4 h-4 text-primary" />
          )}
        </div>
      </div>
      
      <div className="w-full overflow-hidden">
        <p className="font-medium text-sm text-left line-clamp-2 leading-tight text-on-surface">
          {favorite.label}
        </p>
        <p className="label-sm text-outline mt-1 font-mono text-[10px]">
          {favorite.grams || '100'}g
        </p>
      </div>
    </button>
  );
}
