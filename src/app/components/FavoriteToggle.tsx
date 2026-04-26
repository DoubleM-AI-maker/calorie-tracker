'use client';

import { useTransition } from 'react';
import { toggleFavoriteAction } from '../actions';
import { Star } from 'lucide-react';

interface FavoriteToggleProps {
  foodId: number;
  grams: number;
  label: string;
  isFavoriteInitial: boolean;
}

export default function FavoriteToggle({ foodId, grams, label, isFavoriteInitial }: FavoriteToggleProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const res = await toggleFavoriteAction(foodId, grams, label);
      if (!res.success) {
        alert('Fehler: ' + res.error);
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`p-1.5 rounded-full transition-all active:scale-95 ${
        isFavoriteInitial 
          ? 'bg-primary/10 text-primary' 
          : 'bg-surface-container-high text-outline hover:text-primary hover:bg-primary/5'
      }`}
      title={isFavoriteInitial ? "Von Favoriten entfernen" : "Zu Favoriten hinzufügen"}
    >
      <Star 
        className={`w-4 h-4 ${isFavoriteInitial ? 'fill-current' : ''}`} 
      />
    </button>
  );
}
