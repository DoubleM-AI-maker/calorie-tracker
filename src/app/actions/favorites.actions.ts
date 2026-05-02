'use server';

import { db } from '@/db';
import { meals, mealItems, favorites, foods } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUserId } from '@/lib/auth';
import { getBerlinCurrentSlot } from '@/lib/date';
import type { NutrientSnapshot } from '@/lib/constants';

export async function toggleFavoriteAction(foodId: number, grams: number, label: string) {
  const userId = await getUserId();
  try {
    const existing = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.userId, userId),
        eq(favorites.targetType, 'food'),
        eq(favorites.targetId, foodId),
      ),
    });

    if (existing) {
      await db.delete(favorites).where(eq(favorites.id, existing.id));
      revalidatePath('/');
      return { success: true, action: 'removed' as const };
    } else {
      await db.insert(favorites).values({
        userId,
        targetType: 'food',
        targetId: foodId,
        label,
        grams: grams.toString(),
      });
      revalidatePath('/');
      return { success: true, action: 'added' as const };
    }
  } catch (error) {
    console.error('[toggleFavoriteAction] Error:', error);
    return { success: false, error: 'Favorit konnte nicht geändert werden' };
  }
}

export async function quickLogFavoriteAction(favoriteId: number) {
  const userId = await getUserId();
  try {
    const fav = await db.query.favorites.findFirst({
      where: and(eq(favorites.id, favoriteId), eq(favorites.userId, userId)),
    });
    if (!fav) return { success: false, error: 'Favorit nicht gefunden' };

    const food = await db.query.foods.findFirst({ where: eq(foods.id, fav.targetId) });
    if (!food) return { success: false, error: 'Lebensmittel nicht gefunden' };

    const grams = parseFloat(fav.grams || '100');
    const nutrientsPer100 = food.nutrientsPer100g as Omit<NutrientSnapshot, '_name' | '_source'>;
    const multiplier = grams / 100;

    const snapshot: NutrientSnapshot = {
      kcal: Math.round(nutrientsPer100.kcal * multiplier),
      protein_g: Number((nutrientsPer100.protein_g * multiplier).toFixed(1)),
      fat_g: Number((nutrientsPer100.fat_g * multiplier).toFixed(1)),
      carbs_g: Number((nutrientsPer100.carbs_g * multiplier).toFixed(1)),
      fiber_g: Number((nutrientsPer100.fiber_g * multiplier).toFixed(1)),
      _name: fav.label,
      _source: 'favorite',
    };

    const slot = getBerlinCurrentSlot();
    const [newMeal] = await db.insert(meals).values({
      userId,
      slot,
      rawInput: `Quick-Log: ${fav.label}`,
    }).returning();

    await db.insert(mealItems).values({
      mealId: newMeal.id,
      foodId: food.id,
      grams: grams.toString(),
      nutrientsSnapshot: snapshot,
    });

    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[quickLogFavoriteAction] Error:', error);
    return { success: false, error: 'Favorit konnte nicht geloggt werden' };
  }
}
