'use server';

import { extractFoodFromText, type ExtractionItem } from '@/lib/llm/claude';
import { resolveNutrients, type ResolvedNutrients } from '@/lib/nutrition/resolver';
import { extractEANFromURL } from '@/lib/nutrition/openfoodfacts';

export interface ResolvedItem extends ExtractionItem {
  resolution: ResolvedNutrients | null;
}

export interface ExtractionResultState {
  success: boolean;
  message?: string;
  items?: ResolvedItem[];
}

export async function processLogEntry(
  prevState: ExtractionResultState,
  formData: FormData,
): Promise<ExtractionResultState> {
  let text = formData.get('logText')?.toString() || '';
  const imageStr = formData.get('imageStr')?.toString();

  if (text.trim() === '' && !imageStr) {
    return { success: false, message: 'Bitte gib an, was du gegessen hast oder lade ein Foto hoch.' };
  }

  try {
    const extractionResult = await extractFoodFromText(text, imageStr);

    // Manual URL fallback: if Claude missed an EAN but a URL is present in the raw text,
    // try to inject it into the items
    if (text.includes('http')) {
      const manualEan = extractEANFromURL(text);
      if (manualEan && extractionResult.items.length === 1 && !extractionResult.items[0].ean) {
        extractionResult.items[0].ean = manualEan;
      }
    }

    const resolvedItems: ResolvedItem[] = await Promise.all(
      extractionResult.items.map(async (item) => {
        const resolution = await resolveNutrients(item);

        // Nutrients are returned per 100g — scale by portion size
        if (resolution?.nutrients) {
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
          resolution,
        };
      }),
    );

    return { success: true, items: resolvedItems };
  } catch (error) {
    console.error('[processLogEntry] Error:', error);
    return { success: false, message: 'Beim Verarbeiten ist ein Fehler aufgetreten.' };
  }
}
