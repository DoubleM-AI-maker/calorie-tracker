'use server';

import { db } from '@/db';
import { goalProfiles } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUserId } from '@/lib/auth';

export async function updateGoalsAction(data: {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}) {
  const userId = await getUserId();
  const now = new Date();

  try {
    // Close current active profile
    await db.update(goalProfiles)
      .set({ validTo: now })
      .where(and(eq(goalProfiles.userId, userId), isNull(goalProfiles.validTo)));

    // Insert new profile
    await db.insert(goalProfiles).values({
      userId,
      kcal: data.kcal,
      proteinG: data.protein,
      fatG: data.fat,
      carbsG: data.carbs,
      fiberG: data.fiber,
      validFrom: now,
    });

    revalidatePath('/ziele');
    revalidatePath('/tagebuch');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[updateGoalsAction] Error:', error);
    return { success: false, error: 'Ziele konnten nicht aktualisiert werden' };
  }
}
