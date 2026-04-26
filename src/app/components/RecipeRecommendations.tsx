'use client';

import { useEffect, useState, useTransition } from 'react';
import { getRecipeRecommendationsAction, logRecommendationAction, favoriteRecommendationAction } from '../actions';
import { ChefHat, Sparkles, Loader2, Plus, Check, Star } from 'lucide-react';

interface Recipe {
  title: string;
  description: string;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

interface Props {
  remaining: {
    kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
}

export default function RecipeRecommendations({ remaining }: Props) {
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionPending, startActionTransition] = useTransition();
  const [logStates, setLogStates] = useState<Record<number, 'idle' | 'pending' | 'success'>>({});
  const [favoriteStates, setFavoriteStates] = useState<Record<number, 'idle' | 'pending' | 'success'>>({});
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 1. Try to restore from cache to avoid reloading on every page visit
    try {
      const cached = sessionStorage.getItem('calorie_tracker_recommendations');
      if (cached) {
        const { data, remaining: cachedRemaining } = JSON.parse(cached);
        // Only use cache if remaining calories haven't changed significantly (>20 kcal difference)
        const kcalDiff = Math.abs(cachedRemaining.kcal - remaining.kcal);
        if (kcalDiff < 20 && data.length > 0) {
          setRecommendations(data);
          return;
        }
      }
    } catch (e) {
      console.warn('Cache error:', e);
    }

    if (remaining.kcal < 50) {
      setRecommendations([]);
      return;
    }

    // 2. Fetch fresh recommendations (non-blocking)
    setIsLoading(true);
    setError(false);
    
    // We use a regular promise fetch instead of startTransition for the initial load
    // to prevent blocking the UI navigation/interactions while waiting for the LLM.
    getRecipeRecommendationsAction(remaining)
      .then(res => {
        if (res.success && res.recommendations) {
          setRecommendations(res.recommendations);
          sessionStorage.setItem('calorie_tracker_recommendations', JSON.stringify({ 
            data: res.recommendations, 
            remaining 
          }));
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [remaining.kcal, remaining.protein_g, remaining.fat_g, remaining.carbs_g]);

  const handleLog = (recipe: Recipe, idx: number) => {
    if (logStates[idx] === 'success') return;
    
    setLogStates(prev => ({ ...prev, [idx]: 'pending' }));
    startActionTransition(async () => {
      const res = await logRecommendationAction(recipe);
      if (res.success) {
        setLogStates(prev => ({ ...prev, [idx]: 'success' }));
      } else {
        setLogStates(prev => ({ ...prev, [idx]: 'idle' }));
        alert(res.error);
      }
    });
  };

  const handleFavorite = (e: React.MouseEvent, recipe: Recipe, idx: number) => {
    e.stopPropagation();
    if (favoriteStates[idx] === 'success') return;

    setFavoriteStates(prev => ({ ...prev, [idx]: 'pending' }));
    startActionTransition(async () => {
      const res = await favoriteRecommendationAction(recipe);
      if (res.success) {
        setFavoriteStates(prev => ({ ...prev, [idx]: 'success' }));
      } else {
        setFavoriteStates(prev => ({ ...prev, [idx]: 'idle' }));
        alert(res.error);
      }
    });
  };

  if (remaining.kcal < 50 && recommendations.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-primary" />
          </div>
          <h3 className="title-md">Vorschläge für dich</h3>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-outline" />}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {isLoading && recommendations.length === 0 ? (
          <div className="bg-surface-container-low rounded-2xl p-6 h-32 animate-pulse flex items-center justify-center">
             <p className="text-outline text-sm italic">Suche nach passenden Gerichten...</p>
          </div>
        ) : (
          recommendations.map((recipe, idx) => (
            <div 
              key={idx} 
              onClick={() => handleLog(recipe, idx)}
              className="group bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-ambient transition-all cursor-pointer active:scale-[0.98] hover:border-primary/30 relative"
            >
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={(e) => handleFavorite(e, recipe, idx)}
                  className={`p-2 rounded-full transition-all ${
                    favoriteStates[idx] === 'success'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-surface-container text-outline hover:bg-amber-50 hover:text-amber-500'
                  }`}
                >
                  {favoriteStates[idx] === 'pending' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Star className={`w-3.5 h-3.5 ${favoriteStates[idx] === 'success' ? 'fill-current' : ''}`} />
                  )}
                </button>
              </div>

              <div className="flex justify-between items-start mb-2 pr-12">
                <h4 className="font-semibold text-on-surface group-hover:text-primary transition-colors pr-2">{recipe.title}</h4>
              </div>
              
              <div className="flex items-center gap-1 text-primary mb-2">
                <Sparkles className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Perfekt für dein Ziel</span>
              </div>
              
              <p 
                className={`text-sm text-outline mb-4 leading-relaxed transition-all ${expandedIndex === idx ? '' : 'line-clamp-2'}`}
                onClick={(e) => {
                  if (recipe.description.length > 80) {
                    e.stopPropagation();
                    setExpandedIndex(expandedIndex === idx ? null : idx);
                  }
                }}
              >
                {recipe.description}
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-surface-container">
                <div className="flex gap-3">
                  <div className="flex flex-col">
                    <span className="label-sm text-[9px] text-outline">Kcal</span>
                    <span className="text-sm font-bold">{recipe.kcal}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="label-sm text-[9px] text-secondary">🥩 Protein</span>
                    <span className="text-sm font-bold">{recipe.protein_g}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="label-sm text-[9px] text-primary">🥑 Fett</span>
                    <span className="text-sm font-bold">{recipe.fat_g}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="label-sm text-[9px] text-amber-600">🥖 Carbs</span>
                    <span className="text-sm font-bold">{recipe.carbs_g}g</span>
                  </div>
                </div>
                
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  logStates[idx] === 'success' 
                    ? 'bg-secondary text-on-secondary' 
                    : 'bg-surface-container-high group-hover:bg-primary group-hover:text-on-primary'
                }`}>
                  {logStates[idx] === 'pending' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : logStates[idx] === 'success' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {error && !isLoading && (
          <p className="text-xs text-center text-outline">Empfehlungen konnten nicht geladen werden.</p>
        )}
      </div>
    </div>
  );
}
