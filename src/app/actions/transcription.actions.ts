'use server';

import { transcribeAudio } from '@/lib/llm/whisper';

export async function transcribeAudioAction(
  formData: FormData,
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const file = formData.get('audio') as File;
    if (!file) {
      return { success: false, error: 'No audio file provided' };
    }
    const text = await transcribeAudio(file);
    return { success: true, text };
  } catch (error) {
    console.error('[transcribeAudioAction] Error:', error);
    return { success: false, error: (error as Error).message || 'Transkription fehlgeschlagen' };
  }
}
