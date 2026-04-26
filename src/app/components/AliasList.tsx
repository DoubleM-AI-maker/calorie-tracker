'use client';

import { useTransition } from 'react';
import { deleteAliasAction } from '../actions';
import { Trash2, AlertCircle } from 'lucide-react';

interface Alias {
  id: number;
  triggerPhrase: string;
  usageCount: number;
  foodName?: string;
}

export default function AliasList({ aliases }: { aliases: Alias[] }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: number) => {
    if (confirm('Möchtest du diesen Alias wirklich löschen?')) {
      startTransition(async () => {
        await deleteAliasAction(id);
      });
    }
  };

  if (aliases.length === 0) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-8 text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-outline" />
        </div>
        <div>
          <p className="font-medium text-on-surface">Noch keine gelernten Aliase</p>
          <p className="text-sm text-outline">Korrekturen, die du häufig machst, erscheinen hier automatisch.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {aliases.map((alias) => (
        <div 
          key={alias.id}
          className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 flex items-center justify-between group shadow-sm transition-all hover:border-primary/20"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-on-surface truncate">"{alias.triggerPhrase}"</span>
            <span className="text-xs text-outline">
              Zugeordnet zu: {alias.foodName || 'Unbekannt'} • {alias.usageCount} Nutzungen
            </span>
          </div>
          <button
            onClick={() => handleDelete(alias.id)}
            disabled={isPending}
            className="p-2 rounded-full hover:bg-error/10 text-outline hover:text-error transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
