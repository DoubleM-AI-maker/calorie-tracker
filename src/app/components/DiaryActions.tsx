'use client';
import { useTransition, useState } from 'react';
import { deleteMealAction, deleteMealItemAction, updateMealItemGramsAction, updateMealSlotAction, updateMealItemAction } from '../actions';
import { Edit2, Check, X, MoreHorizontal } from 'lucide-react';

/**
 * Button to delete a full meal card
 */
export function DeleteMealButton({ mealId }: { mealId: number }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    if (window.confirm('Mahlzeit wirklich aus dem Tagebuch löschen?')) {
      startTransition(async () => {
        await deleteMealAction(mealId);
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className={`p-2 rounded-full transition-colors ${isPending ? 'opacity-20 cursor-wait' : 'text-outline hover:bg-error/10 hover:text-error'}`}
      aria-label="Löschen"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    </button>
  );
}

/**
 * Button to change the slot of a meal (e.g. Breakfast -> Snack)
 */
export function EditMealSlotButton({ mealId, currentSlot }: { mealId: number; currentSlot: string }) {
  const [isPending, startTransition] = useTransition();

  const handleEdit = () => {
    const slots = ['breakfast', 'lunch', 'dinner', 'snack'];
    const nextSlot = slots[(slots.indexOf(currentSlot) + 1) % slots.length];
    
    startTransition(async () => {
      await updateMealSlotAction(mealId, nextSlot);
    });
  };

  return (
    <button
      onClick={handleEdit}
      disabled={isPending}
      className={`p-1 px-2 rounded bg-surface-container-high text-[10px] font-bold uppercase transition-all ${isPending ? 'opacity-50 animate-pulse' : 'hover:bg-primary/20 hover:text-primary'}`}
    >
      Wechseln
    </button>
  );
}

/**
 * Clickable gram label that triggers an edit prompt
 */
export function EditGramsButton({ itemId, currentGrams }: { itemId: number; currentGrams: number }) {
  const [isPending, startTransition] = useTransition();

  const handleEdit = () => {
    const val = window.prompt('Neue Gramm-Anzahl für dieses Produkt:', currentGrams.toString());
    if (val !== null) {
      const parsed = parseFloat(val.replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        startTransition(async () => {
          await updateMealItemGramsAction(itemId, parsed);
        });
      } else {
        alert('Bitte eine gültige Zahl eingeben.');
      }
    }
  };

  return (
    <button
      onClick={handleEdit}
      disabled={isPending}
      className={`label-sm tabular-nums underline decoration-dotted decoration-outline/30 underline-offset-4 transition-colors ${
        isPending ? 'text-primary animate-pulse' : 'text-outline hover:text-primary hover:decoration-primary'
      }`}
      title="Menge bearbeiten"
    >
      {Math.round(currentGrams)}g
    </button>
  );
}

/**
 * Full edit button for a single item (Name, Grams, Nutrients)
 */
export function FullEditItemButton({ item }: { item: any }) {
  const [isPending, startTransition] = useTransition();
  
  const handleFullEdit = () => {
    const snap = item.nutrients_snapshot;
    const name = window.prompt('Name des Lebensmittels:', snap?._name || '');
    if (name === null) return;
    
    const grams = window.prompt('Menge in Gramm:', item.grams);
    if (grams === null) return;
    
    const kcal = window.prompt('Kalorien gesamt:', snap?.kcal?.toString() || '0');
    if (kcal === null) return;

    const protein = window.prompt('Protein gesamt (g):', snap?.protein_g?.toString() || '0');
    if (protein === null) return;

    startTransition(async () => {
      await updateMealItemAction(item.id, {
        name,
        grams: parseFloat(grams.replace(',', '.')),
        kcal: parseInt(kcal),
        protein: parseFloat(protein.replace(',', '.')),
        fat: parseFloat(snap?.fat_g?.toString() || '0'),
        carbs: parseFloat(snap?.carbs_g?.toString() || '0'),
      });
    });
  };

  return (
    <button
      onClick={handleFullEdit}
      disabled={isPending}
      className={`p-1.5 rounded-full transition-colors ${isPending ? 'opacity-20 animate-pulse' : 'text-outline/40 hover:bg-primary/10 hover:text-primary'}`}
      title="Alles bearbeiten"
    >
      <Edit2 className="w-3.5 h-3.5" />
    </button>
  );
}

/**
 * Small delete button for individual meal items
 */
export function DeleteItemButton({ itemId }: { itemId: number }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (window.confirm('Dieses Element wirklich löschen?')) {
      startTransition(async () => {
        await deleteMealItemAction(itemId);
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className={`p-1.5 rounded-full transition-colors ${isPending ? 'opacity-20 cursor-wait' : 'text-outline/40 hover:bg-error/10 hover:text-error'}`}
      title="Element löschen"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}
