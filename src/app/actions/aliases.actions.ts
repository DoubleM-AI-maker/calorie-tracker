'use server';

import { db } from '@/db';
import { userAliases } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUserId } from '@/lib/auth';

export async function deleteAliasAction(aliasId: number) {
  const userId = await getUserId();
  try {
    await db.delete(userAliases).where(
      and(eq(userAliases.id, aliasId), eq(userAliases.userId, userId)),
    );
    revalidatePath('/einstellungen');
    return { success: true };
  } catch (error) {
    console.error('[deleteAliasAction] Error:', error);
    return { success: false, error: 'Alias konnte nicht gelöscht werden' };
  }
}
