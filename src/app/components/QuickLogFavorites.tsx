'use client';

import { useTransition, useState } from 'react';
import { quickLogFavoriteAction } from '../actions';
import { Plus, Check, Loader2, Star } from 'lucide-react';

interface FavoriteRecord {
  id: number;
  label: string;
  grams: string | null;
}

export default function QuickLogFavorites({
  favorites,
  targetDate,
}: {
  favorites: FavoriteRecord[];
  targetDate: string;
}) {
  if (favorites.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Star className="w-3.5 h-3.5 text-outline" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-outline">Favoriten</span>
      </div>
      <div className="flex flex-col gap-2">
        {favorites.map((fav) => (
          <QuickFavButton key={fav.id} favorite={fav} targetDate={targetDate} />
        ))}
      </div>
    </div>
  );
}

function QuickFavButton({
  favorite,
  targetDate,
}: {
  favorite: FavoriteRecord;
  targetDate: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const handleLog = () => {
    startTransition(async () => {
      const res = await quickLogFavoriteAction(favorite.id, targetDate);
      if (res.success) {
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      } else {
        alert('Fehler: ' + res.error);
      }
    });
  };

  return (
    <button
      onClick={handleLog}
      disabled={isPending || done}
      className="w-full bg-surface-container-lowest rounded-2xl p-3 flex justify-between items-center
                 shadow-ambient active:scale-[0.98] transition-all outline-none focus:ring-2 focus:ring-primary/20 group
                 disabled:opacity-60"
    >
      <div className="flex-1 overflow-hidden pr-3 text-left">
        <p className="font-medium text-sm truncate text-on-surface">{favorite.label}</p>
        <p className="label-sm text-outline mt-0.5 font-mono text-[10px]">{favorite.grams || '100'}g</p>
      </div>
      <div className="flex-shrink-0">
        <div className={`p-1.5 rounded-full transition-colors ${
          done
            ? 'bg-secondary/20'
            : isPending
              ? 'bg-primary/10'
              : 'bg-surface-container-low group-hover:bg-primary/10'
        }`}>
          {isPending ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : done ? (
            <Check className="w-4 h-4 text-secondary" />
          ) : (
            <Plus className="w-4 h-4 text-primary" />
          )}
        </div>
      </div>
    </button>
  );
}
