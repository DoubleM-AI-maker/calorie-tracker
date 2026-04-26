import { ExtractionItem } from '../llm/claude';
import { getProductByEAN, searchProductsByBrand, OFFNutriments } from './openfoodfacts';
import { Anthropic } from '@anthropic-ai/sdk';
import { db } from '@/db';
import { foods } from '@/db/schema';
import { eq } from 'drizzle-orm';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "dummy", 
});

export interface ResolvedNutrients {
  source: 'off' | 'usda' | 'llm_estimate' | 'custom';
  source_id?: string;
  db_id?: number;
  resolved_name?: string;  // Specific product name from OFF (e.g. "Sportness Clear Whey Protein Pfirsich Eistee")
  resolved_brand?: string; // Brand as returned by OFF
  nutrients: {
    kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g: number;
  };
}

/**
 * Resolution Pipeline corresponding to Spec Section 5.4
 * 1. EAN
 * 2. Brand
 * 3. USDA
 * 4. LLM Fallback
 */
export async function resolveNutrients(item: ExtractionItem): Promise<ResolvedNutrients | null> {
  // Use a more specific cache key that includes the brand, homemade and generic status to prevent collisions
  const baseKey = item.openfoodfacts_search_term || `${item.brand ? item.brand + ' ' : ''}${item.canonical_de || item.raw}`.trim();
  let cacheKey = baseKey;
  if (item.is_homemade) cacheKey = `[HM] ${cacheKey}`;
  if (item.is_generic) cacheKey = `[GEN] ${cacheKey}`;

  // 0. Cache Check
  try {
    const cached = await db.query.foods.findFirst({
      where: eq(foods.nameDe, cacheKey)
    });
    
    if (cached) {
      console.log(`[Resolver] Cache HIT for "${cacheKey}", displayName: ${cached.displayName}`);
      return {
        source: cached.source as any,
        source_id: cached.sourceId || undefined,
        db_id: cached.id,
        resolved_name: cached.displayName || (cached.brand ? `${cached.brand} ${cached.nameDe}`.trim() : undefined),
        resolved_brand: cached.brand || undefined,
        nutrients: cached.nutrientsPer100g as any
      };
    }
  } catch (err) {
    console.error("Cache Check Error:", err);
  }

  // 1. Resolve via EAN
  if (item.ean) {
    const product = await getProductByEAN(item.ean);
    if (product?.nutriments) {
      const productName = product.product_name_de || product.product_name;
      const resolvedName = productName ? `${product.brands ? product.brands + ' ' : ''}${productName}`.trim() : undefined;
      console.log(`[Resolver] EAN match for "${baseKey}": resolvedName = ${resolvedName}`);
      // Cache it with the displayName
      try {
        await db.insert(foods).values({
          nameDe: cacheKey,
          displayName: resolvedName || null,
          source: 'off',
          sourceId: product.code || null,
          brand: product.brands || null,
          ean: product.code || null,
          nutrientsPer100g: extractCoreNutrients(product.nutriments)
        }).onConflictDoNothing();
      } catch (err) { console.error("Cache Insert Error (EAN):", err); }
      return {
        source: 'off',
        source_id: product.code,
        resolved_name: resolvedName,
        resolved_brand: product.brands || undefined,
        nutrients: extractCoreNutrients(product.nutriments)
      };
    }
  }

  // 2. Resolve via Brand / LLM optimized search term
  if (item.brand || item.openfoodfacts_search_term) {
    const query = (item.openfoodfacts_search_term || `${item.brand} ${item.canonical_de || item.raw}`).replace(/%/g, ' ');
    let products = await searchProductsByBrand(query, 20);
    
    // Fallback strategy for OFF's extremely strict exact-match search
    if (!products || products.length === 0) {
      const fallbackQuery = item.brand ? `${item.brand.split(' ')[0]} ${item.canonical_de?.split(' ').slice(0, 3).join(' ') || item.raw}` : baseKey;
      products = await searchProductsByBrand(fallbackQuery, 20);
    }

    if (products && products.length > 0) {
      // Construction of a better search target that includes everything Claude extracted to find exact flavor/variant
      const searchTargetString = `${item.brand || ''} ${item.canonical_de || ''} ${item.raw || ''}`.trim();

      console.log(`[Plausy-Check] Analyzing ${products.length} candidates for "${searchTargetString}" (is_homemade: ${!!item.is_homemade}, is_generic: ${!!item.is_generic})`);

      // Sort products by similarity to the user's raw input to find the exact flavor/variant
      const scoredProducts = products.map(p => {
        const brand = (p.brands || '').toLowerCase();
        const productName = (p.product_name_de || p.product_name || '').toLowerCase();
        const fullName = `${brand} ${productName}`.trim();
        const targetBrand = (item.brand || '').toLowerCase();

        // 1. Base Similarity Score
        let score = getSimilarityScore(fullName, searchTargetString);

        // 2. Brand Bonus (if user specified a brand)
        if (targetBrand && (brand.includes(targetBrand) || targetBrand.includes(brand))) {
          score += 30;
        }

        // 3. Plausy-Check: Industry Penalties
        const industrialKeywords = [
          'becher', 'flasche', 'karton', 'trinkfertig', 'cup', 'bottle', 'ready-to-drink', 
          'snack', 'pouch', 'ready-to-use', 'fertiggericht', 'instant', 'konserve', 'dose',
          'terrine', 'fix', 'beutel', 'mix', 'mischung', 'tüte', 'tuete', 'quick', 'easy'
        ];
        const commonConvenienceBrands = [
          'milbona', 'müller', 'mueller', 'alpro', 'nestle', 'starbucks', 'emmi', 'danone', 
          'landliebe', 'weihenstephan', 'bauer', 'zott', 'maggi', 'knorr', 'iglo', 'frosta'
        ];

        const isIndustrial = industrialKeywords.some(k => fullName.includes(k));
        const isBranded = brand.length > 0;
        const isConvenienceBrand = commonConvenienceBrands.some(k => brand.includes(k));

        if (item.is_homemade || item.is_generic) {
          if (isIndustrial) score -= 100;
          if (isBranded) score -= 80;
          if (isConvenienceBrand) score -= 120;
          
          // Additional huge penalty for generic/homemade foods that match a specific brand
          if ((item.is_generic || item.is_homemade) && isBranded) {
            score -= 100;
          }
          
          // If it's explicitly industrial and homemade, it's almost certainly a mismatch
          if (item.is_homemade && isIndustrial) {
            score -= 150;
          }

          // Bonus for "clean" names without brand fluff when homemade/generic
          if (!isBranded && productName === (item.canonical_de || '').toLowerCase()) {
            score += 20;
          }
        }

        return { product: p, score, fullName };
      });

      // Sort by score descending
      const sorted = scoredProducts.sort((a, b) => b.score - a.score);
      
      // Log top 3 for debugging
      sorted.slice(0, 3).forEach((s, idx) => {
        console.log(`  [${idx}] Score: ${s.score.toFixed(1)} | Name: ${s.fullName}`);
      });

      const bestScore = sorted[0]?.score || 0;

      // If the best match is still poor or heavily penalized (branded while generic), favor LLM/Fallback
      // If the best match is still poor or heavily penalized (branded while generic/homemade), favor LLM/Fallback
      if ((item.is_generic || item.is_homemade) && sorted[0]?.product.brands && bestScore < 10) {
        console.log(`[Resolver] Best OFF match for generic/homemade food is branded/low quality. Falling back to LLM.`);
      } else {
        const bestProduct = sorted[0]?.product;

        if (bestProduct && bestProduct.nutriments) {
          const extractedNutrients = extractCoreNutrients(bestProduct.nutriments);
          const productName = bestProduct.product_name_de || bestProduct.product_name;
          const resolvedName = productName
            ? `${bestProduct.brands ? bestProduct.brands + ' ' : ''}${productName}`.trim()
            : undefined;
          console.log(`[Resolver] Best match: "${resolvedName}" (Score: ${bestScore.toFixed(1)})`);
          
          let newDbId: number | undefined;
          try {
            const [newFood] = await db.insert(foods).values({
              nameDe: cacheKey,
              displayName: resolvedName || null,  // Store the specific product name!
              source: 'off',
              sourceId: bestProduct.code || null,
              brand: bestProduct.brands || item.brand || null,
              ean: bestProduct.code || null,
              nutrientsPer100g: extractedNutrients
            }).returning();
            newDbId = newFood.id;
          } catch (err) {
            console.error("Cache Insert Error (OFF):", err);
          }

          return {
            source: 'off',
            source_id: bestProduct.code,
            db_id: newDbId,
            resolved_name: resolvedName,
            resolved_brand: bestProduct.brands || undefined,
            nutrients: extractedNutrients
          };
        }
      }
    }
  }

  // 3. Resolve via USDA (To be hooked up directly to local DB lookup)
  // const usdaFood = await lookupUsdaFuzzy(item.canonical_en || item.canonical_de);
  // if (usdaFood) { ... }

  // 4. LLM Fallback Estimate (If all above fail)
  try {
    const prompt = `Als Ernährungs-Assistent, schätze die Nährwerte für folgendes Lebensmittel.
    Lebensmittel: ${item.canonical_de || item.raw}
    Gib STRIKT nur ein JSON Objekt mit den Werten pro 100g (oder pro 100ml) zurück.
    Beispiel Format:
    {
      "kcal": 150,
      "protein_g": 10.5,
      "fat_g": 5.0,
      "carbs_g": 15.0,
      "fiber_g": 2.0
    }`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content[0];
    if (block.type === 'text') {
      let jsonText = block.text.trim();
      // Strip markdown wrapping if Claude added it
      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      
      const parsed = JSON.parse(jsonText);
      const parsedNutrients = {
        kcal: parsed.kcal || 0,
        protein_g: parsed.protein_g || 0,
        fat_g: parsed.fat_g || 0,
        carbs_g: parsed.carbs_g || 0,
        fiber_g: parsed.fiber_g || 0
      };

      let newDbId: number | undefined;
      try {
        const [newFood] = await db.insert(foods).values({
          nameDe: cacheKey,
          source: 'llm_estimate',
          nutrientsPer100g: parsedNutrients
        }).returning();
        newDbId = newFood.id;
      } catch (err) {
        console.error("Cache Insert Error (LLM):", err);
      }

      return {
        source: 'llm_estimate',
        db_id: newDbId,
        nutrients: parsedNutrients
      };
    }
  } catch (error) {
    console.error("LLM Fallback Error:", error);
  }

  // Absolute Fallback
  return {
    source: 'llm_estimate',
    nutrients: {
      kcal: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      fiber_g: 0
    }
  };
}

function extractCoreNutrients(off: OFFNutriments & { 'energy-kcal_100g'?: number }) {
  return {
    kcal: off['energy-kcal_100g'] || off.energy_kcal_100g || 0,
    protein_g: off.proteins_100g || 0,
    fat_g: off.fat_100g || 0,
    carbs_g: off.carbohydrates_100g || 0,
    fiber_g: off.fiber_100g || 0,
  };
}

function getSimilarityScore(target: string, query: string): number {
  const tWords = target.toLowerCase().split(/\s+/);
  const qWords = query.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (const qw of qWords) {
    if (qw.length < 3) continue; // Skip very short words like 'und', 'mit'
    if (tWords.some(tw => tw.includes(qw) || qw.includes(tw))) {
      matches++;
    }
  }
  return matches;
}
