async function search(query) {
  const url = new URL("https://de.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "5");

  console.log("\n=== Searching for:", query, "===");
  console.log("URL:", url.toString());
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "KalorieTracker/1.0 - macOS - Development",
        "Accept": "application/json"
      }
    });
    
    if(!res.ok) {
      console.log("Failed:", res.status, await res.text());
      return;
    }
    
    const data = await res.json();
    console.log("Products found:", data.products?.length || 0);
    const simplified = (data.products || []).map(p => ({
      code: p.code,
      product_name: p.product_name,
      product_name_de: p.product_name_de,
      brands: p.brands,
      kcal_100g: p.nutriments?.['energy-kcal_100g'] || p.nutriments?.energy_kcal_100g,
      protein_100g: p.nutriments?.proteins_100g
    }));
    console.log(JSON.stringify(simplified, null, 2));
  } catch(e) {
    console.error("Error:", e);
  }
}

// Test with Sportness Clear Whey Protein
await search("Sportness Clear Whey Protein");
await search("Sportness Proteinpulver");
