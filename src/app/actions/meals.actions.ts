'use server';

import { db } from '@/db';
import { meals, mealItems, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUserId, getUserEmail } from '@/lib/auth';
import { getBerlinCurrentSlot, getBerlinNoonForDate, formatBerlinDate } from '@/lib/date';
import type { ResolvedItem } from './extraction.actions';
import type { NutrientSnapshot } from '@/lib/constants';

interface SaveMealData {
  rawInput?: string;
  items: ResolvedItem[];
  /** YYYY-MM-DD in Berlin timezone. Defaults to today when omitted. */
  targetDate?: string;
}

async function ensureUserExists(userId: string, email: string) {
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!existing) {
    await db.insert(users).values({ id: userId, email, name: userId });
  }
}

export async function saveMealEntry(mealData: SaveMealData) {
  const userId = await getUserId();
  const email = await getUserEmail();

  try {
    await ensureUserExists(userId, email);

    const todayStr = formatBerlinDate(new Date());
    const isToday = !mealData.targetDate || mealData.targetDate === todayStr;
    const slot = getBerlinCurrentSlot();
    const timestamp = isToday ? new Date() : getBerlinNoonForDate(mealData.targetDate!);

    const [newMeal] = await db.insert(meals).values({
      userId,
      slot,
      timestamp,
      rawInput: typeof mealData.rawInput === 'string' ? mealData.rawInput : 'manual entry',
    }).returning();

    if (mealData.items?.length > 0) {
      const itemsToInsert = mealData.items.map((item) => ({
        mealId: newMeal.id,
        foodId: item.resolution?.db_id ?? null,
        grams: (item.estimated_grams || 100).toString(),
        nutrientsSnapshot: {
          ...(item.resolution?.nutrients || {}),
          _name: item.canonical_de || 'Unbekanntes Produkt',
          _source: item.resolution?.source || 'llm_estimate',
        } satisfies Partial<NutrientSnapshot>,
      }));
      await db.insert(mealItems).values(itemsToInsert);
    }

    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[saveMealEntry] Error:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteMealAction(mealId: number) {
  const userId = await getUserId();
  try {
    await db.delete(meals).where(and(eq(meals.id, mealId), eq(meals.userId, userId)));
    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[deleteMealAction] Error:', error);
    return { success: false, error: 'Mahlzeit konnte nicht gelöscht werden' };
  }
}

export async function deleteMealItemAction(itemId: number) {
  const userId = await getUserId();
  try {
    const item = await db.query.mealItems.findFirst({
      where: eq(mealItems.id, itemId),
      with: { meal: true },
    });

    if (!item || item.meal.userId !== userId) {
      return { success: false, error: 'Not found or unauthorized' };
    }

    const mealId = item.mealId;
    await db.delete(mealItems).where(eq(mealItems.id, itemId));

    const remainingItems = await db.query.mealItems.findMany({
      where: eq(mealItems.mealId, mealId),
    });

    if (remainingItems.length === 0) {
      await db.delete(meals).where(eq(meals.id, mealId));
    }

    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[deleteMealItemAction] Error:', error);
    return { success: false, error: 'Eintrag konnte nicht gelöscht werden' };
  }
}

export async function updateMealItemGramsAction(itemId: number, newGrams: number) {
  const userId = await getUserId();
  try {
    const item = await db.query.mealItems.findFirst({
      where: eq(mealItems.id, itemId),
      with: { meal: true },
    });

    if (!item || item.meal.userId !== userId) {
      return { success: false, error: 'Not found or unauthorized' };
    }

    const oldGrams = parseFloat(item.grams as string);
    const ratio = newGrams / oldGrams;
    const oldSnap = item.nutrientsSnapshot as NutrientSnapshot;

    const newSnap: NutrientSnapshot = {
      ...oldSnap,
      kcal: Math.round((oldSnap.kcal || 0) * ratio),
      protein_g: Number(((oldSnap.protein_g || 0) * ratio).toFixed(1)),
      fat_g: Number(((oldSnap.fat_g || 0) * ratio).toFixed(1)),
      carbs_g: Number(((oldSnap.carbs_g || 0) * ratio).toFixed(1)),
      fiber_g: Number(((oldSnap.fiber_g || 0) * ratio).toFixed(1)),
    };

    await db.update(mealItems)
      .set({ grams: newGrams.toString(), nutrientsSnapshot: newSnap })
      .where(eq(mealItems.id, itemId));

    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[updateMealItemGramsAction] Error:', error);
    return { success: false, error: 'Gramm-Anzahl konnte nicht aktualisiert werden' };
  }
}

export async function updateMealSlotAction(mealId: number, newSlot: string) {
  const userId = await getUserId();
  try {
    await db.update(meals)
      .set({ slot: newSlot })
      .where(and(eq(meals.id, mealId), eq(meals.userId, userId)));
    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[updateMealSlotAction] Error:', error);
    return { success: false, error: 'Mahlzeiten-Slot konnte nicht aktualisiert werden' };
  }
}

export async function updateMealItemAction(
  itemId: number,
  data: { name: string; grams: number; kcal: number; protein: number; fat: number; carbs: number },
) {
  const userId = await getUserId();
  try {
    const item = await db.query.mealItems.findFirst({
      where: eq(mealItems.id, itemId),
      with: { meal: true },
    });
    if (!item || item.meal.userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const snapshot: NutrientSnapshot = {
      _name: data.name,
      _source: 'custom',
      kcal: data.kcal,
      protein_g: data.protein,
      fat_g: data.fat,
      carbs_g: data.carbs,
      fiber_g: 0,
    };

    await db.update(mealItems)
      .set({ grams: data.grams.toString(), nutrientsSnapshot: snapshot })
      .where(eq(mealItems.id, itemId));

    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[updateMealItemAction] Error:', error);
    return { success: false, error: 'Eintrag konnte nicht aktualisiert werden' };
  }
}
