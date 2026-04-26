import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "dummy", 
});

export interface ExtractionItem {
  raw: string;
  canonical_de: string;
  canonical_en: string;
  quantity: number;
  unit: string;
  estimated_grams: number | null;
  confidence: number;
  brand: string | null;
  ean: string | null;
  openfoodfacts_search_term?: string;
  is_homemade?: boolean;
  is_generic?: boolean;
}

export interface ExtractionResult {
  items: ExtractionItem[];
}

export interface RecipeRecommendation {
  title: string;
  description: string;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface RecommendationResult {
  recommendations: RecipeRecommendation[];
}

export async function extractFoodFromText(input: string, base64Image?: string): Promise<ExtractionResult> {
  const prompt = `Du bist ein Ernährungs-Assistent. Deine Aufgabe ist die präzise und logische Extraktion von Lebensmitteln.
  
  PLAUSY-CHECK (PLAUSIBILITÄTS-REGELN):
  1. KEINE DOPPELZÄHLUNG: Extrahiere Zutaten NIEMALS separat, wenn sie bereits im Hauptprodukt enthalten sind (z.B. KEINE Milch extrahieren, wenn der Nutzer "Latte Macchiato" trinkt; KEIN Dressing separat, wenn es um "Salat mit Dressing" geht).
  2. ATOMARE EINHEITEN: Gruppiere Beschreibungen zu einem einzigen logischen Item. Nur wenn der Nutzer explizit "EXTRA" (z.B. "mit extra Käse") sagt, darf die Zutat separat aufgeführt werden.
  3. KONTEXT-ERKENNUNG: Achte auf Hinweise wie "aus meiner Maschine", "selbstgemacht", "frisch zubereitet" oder "hausgemacht". Setze in diesen Fällen "is_homemade": true.
  4. FRISCHWARE-ERKENNUNG: Wenn es sich um unverarbeitete, markenlose Frischware handelt (Obst, Gemüse, rohes Fleisch, Eier, unverarbeitete Nüsse), setze "is_generic": true.
  5. URL-ERKENNUNG: Wenn der Nutzer einen Link zu OpenFoodFacts (off) sendet (z.B. https://de.openfoodfacts.org/produkt/123456789/name), extrahiere die Nummer aus der URL in das Feld "ean".
  
  Formatiere das Ergebnis STRIKT als JSON mit exakt folgendem Schema:
  {
    "items": [
      {
        "raw": "Originaltext des Nutzers für dieses Teil-Element (z.B. eine Banane)",
        "canonical_de": "Kanonischer deutscher Name (z.B. Banane)",
        "canonical_en": "Kanonischer englischer Name (z.B. banana)",
        "quantity": 1,
        "unit": "stück",
        "estimated_grams": 120,
        "confidence": 0.9,
        "brand": null, 
        "ean": "Extrahiere EAN aus Text oder OFF-URL falls vorhanden, sonst null",
        "openfoodfacts_search_term": "Suchbegriff für OFF (z.B. 'Banane'). KEINE Marken!",
        "is_homemade": false,
        "is_generic": true
      }
    ]
  }
  Antworte NUR mit dem JSON. Keine Einleitung, kein Markdown (ohne \`\`\`json).`;

  try {
    const defaultText = input && input.trim() !== '' ? `Zusätzlicher Hinweis des Nutzers: "${input}"` : "Bitte analysiere das Foto sorgfältig und extrahiere alle sichtbaren Lebensmittelportionen.";
    
    // Construct dynamic message blocks
    const contentPayload: any[] = [];
    
    if (base64Image) {
      const matches = base64Image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      let mediaType = "image/jpeg";
      let base64Data = base64Image;

      if (matches && matches.length === 3) {
        mediaType = matches[1];
        base64Data = matches[2];
      }

      contentPayload.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64Data
        }
      });
    }

    contentPayload.push({
      type: "text",
      text: base64Image ? defaultText : `Input: "${input}"`
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0.1,
      system: prompt,
      messages: [{ role: 'user', content: contentPayload }],
    });

    const block = response.content[0];
    if (block.type === 'text') {
      let jsonText = block.text.trim();
      // Strip markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      }
      return JSON.parse(jsonText) as ExtractionResult;
    }
    throw new Error('Unexpected response type from Claude');
  } catch (error) {
    console.error("LLM Extraction Error:", error);
    throw error;
  }
}

export async function generateRecipeRecommendations(remaining: { kcal: number, protein_g: number, fat_g: number, carbs_g: number }): Promise<RecommendationResult> {
  const prompt = `Du bist ein kulinarischer Berater. Schlage 2-3 konkrete, gesunde Gerichte vor, die exakt in das verbleibende Tagesbudget des Nutzers passen.
  
  Verbleibendes Budget:
  - Kalorien: ${remaining.kcal} kcal
  - Protein: ${remaining.protein_g}g
  - Fett: ${remaining.fat_g}g
  - Kohlenhydrate: ${remaining.carbs_g}g
  
  REGELN:
  1. Die Gerichte sollten realistisch sein und die Makronährstoffe etwa treffen.
  2. Gib kurze, appetitliche Beschreibungen.
  3. Antworte STRIKT als JSON mit folgendem Schema:
  {
    "recommendations": [
      {
        "title": "Name des Gerichts",
        "description": "Kurze Beschreibung",
        "kcal": 350,
        "protein_g": 30,
        "fat_g": 10,
        "carbs_g": 40
      }
    ]
  }
  Antworte NUR mit dem JSON. Keine Einleitung, kein Markdown.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0.7, // Higher temperature for variety
      system: prompt,
      messages: [{ role: 'user', content: "Gib mir Empfehlungen." }],
    });

    const block = response.content[0];
    if (block.type === 'text') {
      let jsonText = block.text.trim();
      // Strip markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      }
      return JSON.parse(jsonText) as RecommendationResult;
    }
    throw new Error('Unexpected response type from Claude');
  } catch (error) {
    console.error("LLM Recommendation Error:", error);
    return { recommendations: [] };
  }
}
