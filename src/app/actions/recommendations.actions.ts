'use server';

import { db } from '@/db';
import { meals, mealItems, users, foods, favorites } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUserId, getUserEmail } from '@/lib/auth';
import { getBerlinCurrentSlot } from '@/lib/date';
import type { NutrientSnapshot } from '@/lib/constants';

interface RecipeInput {
  title: string;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

async function ensureUserExists(userId: string, email: string) {
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!existing) {
    await db.insert(users).values({ id: userId, email, name: userId });
  }
}

export async function getRecipeRecommendationsAction(remaining: {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}) {
  try {
    const { generateRecipeRecommendations } = await import('@/lib/llm/claude');
    const result = await generateRecipeRecommendations(remaining);
    return { success: true, recommendations: result.recommendations };
  } catch (error) {
    console.error('[getRecipeRecommendationsAction] Error:', error);
    return { success: false, recommendations: [] };
  }
}

export async function logRecommendationAction(recipe: RecipeInput) {
  const userId = await getUserId();
  const email = await getUserEmail();

  try {
    await ensureUserExists(userId, email);

    const slot = getBerlinCurrentSlot();
    const [newMeal] = await db.insert(meals).values({
      userId,
      slot,
      rawInput: `Empfehlung: ${recipe.title}`,
    }).returning();

    const snapshot: NutrientSnapshot = {
      kcal: recipe.kcal,
      protein_g: recipe.protein_g,
      fat_g: recipe.fat_g,
      carbs_g: recipe.carbs_g,
      fiber_g: 0,
      _name: recipe.title,
      _source: 'recommendation',
    };

    await db.insert(mealItems).values({
      mealId: newMeal.id,
      grams: '100',
      nutrientsSnapshot: snapshot,
    });

    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[logRecommendationAction] Error:', error);
    return { success: false, error: 'Fehler beim Loggen der Empfehlung' };
  }
}

export async function favoriteRecommendationAction(recipe: RecipeInput) {
  const userId = await getUserId();
  try {
    const [newFood] = await db.insert(foods).values({
      nameDe: recipe.title,
      source: 'llm',
      nutrientsPer100g: {
        kcal: recipe.kcal,
        protein_g: recipe.protein_g,
        fat_g: recipe.fat_g,
        carbs_g: recipe.carbs_g,
        fiber_g: 0,
      },
    }).returning();

    await db.insert(favorites).values({
      userId,
      targetType: 'food',
      targetId: newFood.id,
      label: recipe.title,
      grams: '100',
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[favoriteRecommendationAction] Error:', error);
    return { success: false, error: 'Fehler beim Hinzufügen zu Favoriten' };
  }
}
