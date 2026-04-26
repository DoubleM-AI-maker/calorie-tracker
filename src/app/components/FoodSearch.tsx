'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Plus, X, Info } from 'lucide-react';

interface FoodSearchProps {
  onSelect: (item: any) => void;
  onClose: () => void;
}

export default function FoodSearch({ onSelect, onClose }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length < 3) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/search-food?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.products || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 bg-surface/95 backdrop-blur-md flex flex-col p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Lebensmittel suchen..."
            className="w-full bg-surface-container-low p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-lg shadow-inner"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary" />
          )}
        </div>
        <button 
          onClick={onClose}
          className="p-3 bg-surface-container-high rounded-2xl hover:bg-surface-container-highest transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {results.length > 0 ? (
          <div className="grid gap-3">
            {results.map((p: any, idx: number) => {
              const name = p.product_name_de || p.product_name || 'Unbekannt';
              const brand = p.brands || '';
              const kcal = p.nutriments?.energy_kcal_100g || p.nutriments?.energy_value || 0;

              return (
                <button
                  key={idx}
                  onClick={() => onSelect(p)}
                  className="flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-container-high rounded-2xl transition-all text-left group active:scale-[0.98]"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                      {name}
                    </p>
                    <p className="text-xs text-outline truncate uppercase tracking-wider font-medium">
                      {brand}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-on-surface tabular-nums">
                      {Math.round(kcal)} <span className="text-[10px] text-outline font-normal">kcal/100g</span>
                    </p>
                    <div className="flex gap-2 mt-1 opacity-60">
                       <span className="text-[10px] text-secondary font-bold">🥩 {Math.round(p.nutriments?.proteins_100g || 0)}g</span>
                       <span className="text-[10px] text-amber-600 font-bold">🥖 {Math.round(p.nutriments?.carbohydrates_100g || 0)}g</span>
                       <span className="text-[10px] text-primary font-bold">🥑 {Math.round(p.nutriments?.fat_100g || 0)}g</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : query.length >= 3 && !isSearching ? (
          <div className="flex flex-col items-center justify-center h-40 text-outline opacity-60">
            <Info className="w-10 h-10 mb-2" />
            <p>Keine Produkte gefunden.</p>
          </div>
        ) : !isSearching && (
          <div className="flex flex-col items-center justify-center h-40 text-outline opacity-40">
             <Search className="w-12 h-12 mb-4" />
             <p className="text-sm">Tippe den Namen eines Lebensmittels ein</p>
          </div>
        )}
      </div>
      
      <p className="mt-4 text-[10px] text-outline text-center uppercase tracking-widest opacity-50">
        Suche via Open Food Facts API
      </p>
    </div>
  );
}
