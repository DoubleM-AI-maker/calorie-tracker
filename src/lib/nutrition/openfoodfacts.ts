/**
 * Open Food Facts API Wrapper
 * Docs: https://openfoodfacts.github.io/api-documentation/
 */
import { execSync } from 'child_process';

export interface OFFNutriments {
  energy_kcal_100g?: number;
  proteins_100g?: number;
  fat_100g?: number;
  carbohydrates_100g?: number;
  fiber_100g?: number;
}

export interface OFFProduct {
  code: string;
  product_name_de?: string;
  product_name?: string;
  brands?: string;
  nutriments?: OFFNutriments;
}

function getAuthHeader(): string {
  const token = process.env.OFF_BASIC_AUTH_TOKEN;
  if (token) {
    return `-H "Authorization: Basic ${token}"`;
  }
  return '';
}

/**
 * Parses an Open Food Facts URL to extract the EAN/Barcode.
 */
export function extractEANFromURL(url: string): string | null {
  try {
    // Standard OFF URLs look like:
    // https://world.openfoodfacts.org/product/3017620422003/nutella-ferrero
    // https://de.openfoodfacts.org/produkt/4008400404127/
    const match = url.match(/(?:product|produkt)\/(\d+)/);
    return match ? match[1] : null;
  } catch (err) {
    return null;
  }
}

export async function getProductByEAN(ean: string): Promise<OFFProduct | null> {
  try {
    const url = `https://de.openfoodfacts.org/api/v2/product/${ean}.json`;
    const authHeader = getAuthHeader();
    const curlCommand = `curl -s -f --retry 2 --retry-delay 1 --max-time 4 -H "User-Agent: KalorieTracker - Web - Version 1.0 - PrivateVPS" -H "Accept: application/json" ${authHeader} "${url}"`;
    
    // We use curl explicitly via child_process because Node.js native fetch/undici 
    // has a distinct TLS fingerprint that is actively blocked by OpenFoodFacts Cloudflare WAF (503).
    const stdout = execSync(curlCommand, { encoding: 'utf-8', timeout: 12000 });
    const data = JSON.parse(stdout);
    
    if (data.status !== 1 || !data.product) {
      return null;
    }

    return data.product as OFFProduct;
  } catch (err) {
    console.error("Error fetching from Open Food Facts:", err);
    return null;
  }
}

export async function searchProductsByBrand(brand: string, limit = 10): Promise<OFFProduct[]> {
  try {
    const url = new URL("https://de.openfoodfacts.org/cgi/search.pl");
    url.searchParams.set("search_terms", brand);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page_size", String(limit));

    const authHeader = getAuthHeader();
    const curlCommand = `curl -s -f --retry 2 --retry-delay 1 --max-time 4 -H "User-Agent: KalorieTracker - Web - Version 1.0 - PrivateVPS" -H "Accept: application/json" ${authHeader} "${url.toString()}"`;
    
    const stdout = execSync(curlCommand, { encoding: 'utf-8', timeout: 12000 });
    const data = JSON.parse(stdout);
    return (data.products || []) as OFFProduct[];
  } catch (err) {
    console.error("Error searching Open Food Facts:", err);
    return [];
  }
}
