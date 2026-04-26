'use server';

import { extractFoodFromText } from '@/lib/llm/claude';
import { resolveNutrients, ResolvedNutrients } from '@/lib/nutrition/resolver';
import { extractEANFromURL } from '@/lib/nutrition/openfoodfacts';
import { db } from '@/db';
import { meals, mealItems, users, goalProfiles, favorites, foods } from '@/db/schema';
import { transcribeAudio } from '@/lib/llm/whisper';
import { headers } from 'next/headers';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUserId, getUserEmail } from '@/lib/auth';
import { getBerlinCurrentSlot } from '@/lib/date';

export interface ExtractionResultState {
  success: boolean;
  message?: string;
  items?: any[];
}

export async function processLogEntry(prevState: any, formData: FormData): Promise<ExtractionResultState> {
  let text = formData.get('logText')?.toString() || '';
  const imageStr = formData.get('imageStr')?.toString();
  
  if (text.trim() === '' && !imageStr) {
    return { success: false, message: "Bitte gib an, was du gegessen hast oder lade ein Foto hoch." };
  }
  
  try {
    const extractionResult = await extractFoodFromText(text, imageStr);
    
    // Manual URL fallback: If Claude missed an EAN but a URL is present in the raw text, 
    // try to inject it into the items
    if (text.includes('http')) {
      const manualEan = extractEANFromURL(text);
      if (manualEan && extractionResult.items.length === 1 && !extractionResult.items[0].ean) {
        extractionResult.items[0].ean = manualEan;
      }
    }

    // Run every item through the nutrient resolver
    const resolvedItems = await Promise.all(
      extractionResult.items.map(async (item) => {
        const resolution = await resolveNutrients(item);
        
        // Nutrients are returned per 100g, we must scale them by the portion size!
        if (resolution.nutrients) {
          const multiplier = (item.estimated_grams || 100) / 100;
          resolution.nutrients = {
            kcal: Math.round(resolution.nutrients.kcal * multiplier),
            protein_g: Number((resolution.nutrients.protein_g * multiplier).toFixed(1)),
            fat_g: Number((resolution.nutrients.fat_g * multiplier).toFixed(1)),
            carbs_g: Number((resolution.nutrients.carbs_g * multiplier).toFixed(1)),
            fiber_g: Number((resolution.nutrients.fiber_g * multiplier).toFixed(1)),
          };
        }

        return {
          ...item,
          // If OFF resolved a specific product name, override the generic LLM-extracted name
          canonical_de: resolution?.resolved_name || item.canonical_de,
          resolution
        };
      })
    );
    
    return { 
      success: true, 
      items: resolvedItems 
    };
  } catch (error: any) {
    console.error("Action error:", error);
    return { success: false, message: "Beim Verarbeiten ist ein Fehler aufgetreten." };
  }
}

export async function saveMealEntry(mealData: any) {
  const userId = await getUserId();
  const email = await getUserEmail();

  console.log(`[SaveMeal] Saving for user ${userId}, items: ${mealData.items?.length || 0}`);
  try {
    // Ensure user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!existingUser) {
      console.log(`[SaveMeal] Creating new user record for ${userId}`);
      await db.insert(users).values({ id: userId, email, name: userId });
    }

    // Insert meal
    const slot = getBerlinCurrentSlot();
    const [newMeal] = await db.insert(meals).values({
      userId,
      slot,
      rawInput: typeof mealData.rawInput === 'string' ? mealData.rawInput : 'manual entry'
    }).returning();

    // Insert items
    if (mealData.items && mealData.items.length > 0) {
      const itemsToInsert = mealData.items.map((item: any) => ({
        mealId: newMeal.id,
        foodId: item.resolution?.db_id ? item.resolution.db_id : null,
        grams: (item.estimated_grams || 100).toString(),
        nutrientsSnapshot: {
          ...(item.resolution?.nutrients || {}),
          _name: item.canonical_de || 'Unbekanntes Produkt',
          _source: item.resolution?.source || 'llm_estimate'
        }
      }));
      
      await db.insert(mealItems).values(itemsToInsert);
    }
    
    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error("DB Save Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteMealAction(mealId: number) {
  const userId = await getUserId();

  console.log(`[DeleteMeal] User ${userId} deleting meal ${mealId}`);
  
  try {
    await db.delete(meals).where(and(eq(meals.id, mealId), eq(meals.userId, userId)));
    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error("Delete Meal Error:", error);
    return { success: false, error: "Failed to delete meal" };
  }
}

export async function deleteMealItemAction(itemId: number) {
  const userId = await getUserId();

  console.log(`[DeleteItem] User ${userId} deleting meal item ${itemId}`);

  try {
    // 1. Fetch the item to get the mealId and verify ownership
    const item = await db.query.mealItems.findFirst({
      where: eq(mealItems.id, itemId),
      with: {
        meal: true
      }
    });

    if (!item || item.meal.userId !== userId) {
      return { success: false, error: "Not found or unauthorized" };
    }

    const mealId = item.mealId;

    // 2. Delete the item
    await db.delete(mealItems).where(eq(mealItems.id, itemId));

    // 3. Check if any items are left in the meal
    const remainingItems = await db.query.mealItems.findMany({
      where: eq(mealItems.mealId, mealId)
    });

    if (remainingItems.length === 0) {
      console.log(`[DeleteItem] Last item removed from meal ${mealId}. Deleting empty meal.`);
      await db.delete(meals).where(eq(meals.id, mealId));
    }

    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error("Delete Item Error:", err);
    return { success: false, error: "Failed to delete item" };
  }
}

export async function updateMealItemGramsAction(itemId: number, newGrams: number) {
  const userId = await getUserId();

  console.log(`[UpdateGrams] User ${userId} updating item ${itemId} to ${newGrams}g`);

  try {
    // 1. Fetch current item and verify ownership via meal join
    const item = await db.query.mealItems.findFirst({
      where: eq(mealItems.id, itemId),
      with: {
        meal: true
      }
    });

    if (!item || item.meal.userId !== userId) {
      return { success: false, error: "Not found or unauthorized" };
    }

    const oldGrams = parseFloat(item.grams as string);
    const ratio = newGrams / oldGrams;
    const oldSnap = item.nutrientsSnapshot as any;

    // 2. Scale nutrients linearly
    const newSnap = {
      ...oldSnap,
      kcal: Math.round((oldSnap.kcal || 0) * ratio),
      protein_g: Number(((oldSnap.protein_g || 0) * ratio).toFixed(1)),
      fat_g: Number(((oldSnap.fat_g || 0) * ratio).toFixed(1)),
      carbs_g: Number(((oldSnap.carbs_g || 0) * ratio).toFixed(1)),
      fiber_g: Number(((oldSnap.fiber_g || 0) * ratio).toFixed(1)),
    };

    // 3. Update DB
    await db.update(mealItems)
      .set({
        grams: newGrams.toString(),
        nutrientsSnapshot: newSnap
      })
      .where(eq(mealItems.id, itemId));

    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error("Update Grams Error:", error);
    return { success: false, error: "Failed to update grams" };
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
  } catch (err) {
    return { success: false, error: "Failed to update slot" };
  }
}

export async function updateMealItemAction(itemId: number, data: { name: string, grams: number, kcal: number, protein: number, fat: number, carbs: number }) {
  const userId = await getUserId();
  try {
    const item = await db.query.mealItems.findFirst({
      where: eq(mealItems.id, itemId),
      with: { meal: true }
    });
    if (!item || item.meal.userId !== userId) return { success: false, error: "Unauthorized" };

    await db.update(mealItems)
      .set({
        grams: data.grams.toString(),
        nutrientsSnapshot: {
          _name: data.name,
          _source: 'custom',
          kcal: data.kcal,
          protein_g: data.protein,
          fat_g: data.fat,
          carbs_g: data.carbs,
          fiber_g: 0
        }
      })
      .where(eq(mealItems.id, itemId));

    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to update item" };
  }
}

export async function updateGoalsAction(data: { kcal: number; protein: number; fat: number; carbs: number; fiber: number }) {
  const userId = await getUserId();
  const now = new Date();

  console.log(`[UpdateGoals] User ${userId} updating goals:`, data);

  try {
    // 1. Close current active profile
    await db.update(goalProfiles)
      .set({ validTo: now })
      .where(and(eq(goalProfiles.userId, userId), isNull(goalProfiles.validTo)));

    // 2. Insert new profile
    await db.insert(goalProfiles).values({
      userId,
      kcal: data.kcal,
      proteinG: data.protein,
      fatG: data.fat,
      carbsG: data.carbs,
      fiberG: data.fiber,
      validFrom: now
    });

    revalidatePath('/ziele');
    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error("Update Goals Error:", error);
    return { success: false, error: "Failed to update goals" };
  }
}

export async function transcribeAudioAction(formData: FormData): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const file = formData.get('audio') as File;
    if (!file) {
      return { success: false, error: 'No audio file provided' };
    }
    
    const text = await transcribeAudio(file);
    return { success: true, text };
  } catch (err: any) {
    console.error("Transcription error:", err);
    return { success: false, error: err.message || 'Transcription failed' };
  }
}

export async function toggleFavoriteAction(foodId: number, grams: number, label: string) {
  const userId = await getUserId();
  
  try {
    const existing = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.userId, userId),
        eq(favorites.targetType, 'food'),
        eq(favorites.targetId, foodId)
      )
    });

    if (existing) {
      await db.delete(favorites).where(eq(favorites.id, existing.id));
      revalidatePath('/');
      return { success: true, action: 'removed' };
    } else {
      await db.insert(favorites).values({
        userId,
        targetType: 'food',
        targetId: foodId,
        label,
        grams: grams.toString()
      });
      revalidatePath('/');
      return { success: true, action: 'added' };
    }
  } catch (error: any) {
    console.error("Toggle Favorite Error:", error);
    return { success: false, error: "Failed to toggle favorite" };
  }
}

export async function quickLogFavoriteAction(favoriteId: number) {
  const userId = await getUserId();
  
  try {
    const fav = await db.query.favorites.findFirst({
      where: and(eq(favorites.id, favoriteId), eq(favorites.userId, userId))
    });

    if (!fav) return { success: false, error: "Favorite not found" };

    // Fetch the food details to get current nutrients (just in case they changed in cache)
    const food = await db.query.foods.findFirst({
      where: eq(foods.id, fav.targetId)
    });

    if (!food) return { success: false, error: "Food details not found" };

    const grams = parseFloat(fav.grams || "100");
    const nutrientsPer100 = food.nutrientsPer100g as any;
    const multiplier = grams / 100;

    const snapshot = {
      kcal: Math.round(nutrientsPer100.kcal * multiplier),
      protein_g: Number((nutrientsPer100.protein_g * multiplier).toFixed(1)),
      fat_g: Number((nutrientsPer100.fat_g * multiplier).toFixed(1)),
      carbs_g: Number((nutrientsPer100.carbs_g * multiplier).toFixed(1)),
      fiber_g: Number((nutrientsPer100.fiber_g * multiplier).toFixed(1)),
      _name: fav.label,
      _source: 'favorite'
    };

    // Create the meal
    const slot = getBerlinCurrentSlot();
    const [newMeal] = await db.insert(meals).values({
      userId,
      slot,
      rawInput: `Quick-Log: ${fav.label}`
    }).returning();

    await db.insert(mealItems).values({
      mealId: newMeal.id,
      foodId: food.id,
      grams: grams.toString(),
      nutrientsSnapshot: snapshot
    });

    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error("Quick Log Error:", error);
    return { success: false, error: "Failed to log favorite" };
  }
}

export async function getRecipeRecommendationsAction(remaining: { kcal: number, protein_g: number, fat_g: number, carbs_g: number }) {
  try {
    const { generateRecipeRecommendations } = await import('@/lib/llm/claude');
    const result = await generateRecipeRecommendations(remaining);
    return { success: true, recommendations: result.recommendations };
  } catch (err) {
    console.error("Action error:", err);
    return { success: false, recommendations: [] };
  }
}

export async function logRecommendationAction(recipe: { title: string, kcal: number, protein_g: number, fat_g: number, carbs_g: number }) {
  const userId = await getUserId();
  const email = await getUserEmail();

  try {
    // Ensure user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!existingUser) {
      await db.insert(users).values({ id: userId, email, name: userId });
    }

    // Insert meal
    const slot = getBerlinCurrentSlot();
    const [newMeal] = await db.insert(meals).values({
      userId,
      slot,
      rawInput: `Empfehlung: ${recipe.title}`
    }).returning();

    // Insert item
    await db.insert(mealItems).values({
      mealId: newMeal.id,
      grams: "100", // Placeholder for recommendation
      nutrientsSnapshot: {
        kcal: recipe.kcal,
        protein_g: recipe.protein_g,
        fat_g: recipe.fat_g,
        carbs_g: recipe.carbs_g,
        fiber_g: 0,
        _name: recipe.title,
        _source: 'recommendation'
      }
    });

    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error("Log Recommendation Error:", error);
    return { success: false, error: "Fehler beim Loggen der Empfehlung" };
  }
}

export async function favoriteRecommendationAction(recipe: { title: string, kcal: number, protein_g: number, fat_g: number, carbs_g: number }) {
  const userId = await getUserId();
  
  try {
    // 1. Create a food entry for this recipe
    const [newFood] = await db.insert(foods).values({
      nameDe: recipe.title,
      source: 'llm',
      nutrientsPer100g: {
        kcal: recipe.kcal,
        protein_g: recipe.protein_g,
        fat_g: recipe.fat_g,
        carbs_g: recipe.carbs_g,
        fiber_g: 0
      }
    }).returning();

    // 2. Add to favorites
    await db.insert(favorites).values({
      userId,
      targetType: 'food',
      targetId: newFood.id,
      label: recipe.title,
      grams: "100" // Recommendation unit
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error("Favorite Recommendation Error:", error);
    return { success: false, error: "Fehler beim Hinzufügen zu Favoriten" };
  }
}

export async function deleteAliasAction(aliasId: number) {
  const userId = await getUserId();
  try {
    const { userAliases } = await import('@/db/schema');
    await db.delete(userAliases).where(and(eq(userAliases.id, aliasId), eq(userAliases.userId, userId)));
    revalidatePath('/einstellungen');
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to delete alias" };
  }
}
