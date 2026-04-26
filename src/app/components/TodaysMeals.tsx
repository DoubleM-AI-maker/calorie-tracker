import { headers } from 'next/headers';
import Link from 'next/link';
import FavoriteToggle from './FavoriteToggle';
import { DeleteMealButton, EditGramsButton, DeleteItemButton, EditMealSlotButton, FullEditItemButton } from './DiaryActions';
import { db } from '@/db';
import { meals, mealItems, goalProfiles, favorites as favoritesTable } from '@/db/schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import { getUserId } from '@/lib/auth';
import { getBerlinDayRange } from '@/lib/date';
import { getMealsForDayRaw, getStatsForDayRaw, RawMeal } from '@/lib/db/queries';
import { Coffee, Utensils, MoonStar, Cookie, MoreVertical, Trash2, Edit2 } from 'lucide-react';

const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snacks',
};

const SLOT_ICONS: Record<string, any> = {
  breakfast: Coffee,
  lunch: Utensils,
  dinner: MoonStar,
  snack: Cookie,
};

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  off: { label: 'OFF', color: 'var(--secondary)' },
  llm_estimate: { label: 'KI', color: '#b45309' },
  usda: { label: 'USDA', color: 'var(--tertiary)' },
  custom: { label: '✎', color: 'var(--outline)' },
};

export default async function DayMeals({ date }: { date?: string }) {
  const userId = await getUserId();
  const { start, end, dateStr } = getBerlinDayRange(date);
  const isToday = dateStr === getBerlinDayRange().dateStr;
  
  const userFavorites = await db.query.favorites.findMany({
    where: eq(favoritesTable.userId, userId),
  });
  const favoriteFoodIds = new Set(userFavorites.map(f => f.targetId));

  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let goalKcal = 2000;
  let goalProtein = 150;
  let goalCarbs = 230;
  let goalFat = 65;
  let dbError = false;
  let mealList: RawMeal[] = [];

  try {
    const { goal, consumed } = await getStatsForDayRaw(userId, date);
    if (goal) {
      goalKcal = goal.kcal;
      goalProtein = goal.protein_g || 150;
      goalCarbs = goal.carbs_g || 230;
      goalFat = goal.fat_g || 65;
    }
    
    totalKcal = consumed.kcal;
    totalProtein = consumed.protein_g;
    totalCarbs = consumed.carbs_g;
    totalFat = consumed.fat_g;

    mealList = await getMealsForDayRaw(userId, date);

  } catch (err) {
    console.error('TodaysMeals DB error:', err);
    dbError = true;
  }

  const remainingKcal = Math.max(0, goalKcal - totalKcal);

  // Helper for progress bar color
  const getMacroColor = (macro: string) => {
    switch(macro) {
      case 'protein': return 'var(--secondary)'; // Green
      case 'carbs': return 'var(--primary)';    // Red
      case 'fat': return 'var(--tertiary)';     // Blue
      default: return 'var(--outline)';
    }
  };

  if (mealList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center text-4xl mb-2">🍽️</div>
        <h3 className="text-xl font-medium">Noch gähnende Leere</h3>
        <p className="text-outline body-lg max-w-[240px]">Noch keine Mahlzeiten {isToday ? 'heute' : 'an diesem Tag'} erfasst.</p>
        <Link href="/loggen"
          className="mt-4 px-8 py-3 rounded-full text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-transform active:scale-95"
          style={{ background: 'var(--primary)' }}>
          Jetzt loslegen
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-xl mx-auto">
      {/* Premium Summary Card */}
      <div className="bg-surface-container-lowest shadow-ambient rounded-3xl p-6 md:p-8 flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.1em] font-bold text-outline/60 mb-1">KALORIEN</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl md:text-5xl font-bold tracking-tight ${totalKcal > goalKcal ? 'text-primary' : ''}`}>
                {Math.round(totalKcal).toLocaleString('de-DE')}
              </span>
              <span className="text-xl md:text-2xl text-outline/40 font-medium">/ {goalKcal.toLocaleString('de-DE')}</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-[10px] uppercase tracking-[0.1em] font-bold mb-1 ${totalKcal > goalKcal ? 'text-primary' : 'text-secondary'}`}>
              {totalKcal > goalKcal ? 'Überschuss' : 'Verbleibend'}
            </span>
            <span className={`text-3xl md:text-4xl font-bold tracking-tight ${totalKcal > goalKcal ? 'text-primary' : 'text-on-surface'}`}>
              {Math.abs(Math.round(goalKcal - totalKcal)).toLocaleString('de-DE')}
            </span>
          </div>
        </div>

        {/* Macro Bars */}
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: '🥩 PROTEIN', value: totalProtein, color: getMacroColor('protein'), target: goalProtein },
            { label: '🥖 CARBS', value: totalCarbs, color: getMacroColor('carbs'), target: goalCarbs },
            { label: '🥑 FAT', value: totalFat, color: getMacroColor('fat'), target: goalFat },
          ].map((macro) => (
            <div key={macro.label} className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-outline/80 tracking-wide">{macro.label}</span>
                <span className="text-xs font-bold tabular-nums">{Math.round(macro.value)}g</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-500 ease-out rounded-full"
                  style={{ 
                    width: `${Math.min(100, (macro.value / macro.target) * 100)}%`,
                    backgroundColor: macro.color 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meal list */}
      <div className="flex flex-col gap-6">
        {mealList.map((meal) => {
          const mealKcal = meal.items.reduce((s, i) => s + (Number(i.nutrients_snapshot?.kcal) || 0), 0);
          const Icon = SLOT_ICONS[meal.slot] || Utensils;

          return (
            <div key={meal.id} className="flex flex-col gap-3">
              {/* Meal Section Header */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">{SLOT_LABELS[meal.slot] || meal.slot}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-outline/60 font-medium">{new Date(meal.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                      <EditMealSlotButton mealId={meal.id} currentSlot={meal.slot} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold tabular-nums text-outline/80">{Math.round(mealKcal)} kcal</span>
                  <DeleteMealButton mealId={meal.id} />
                </div>
              </div>

              {/* Items Card */}
              <div className="bg-surface-container-lowest shadow-ambient rounded-3xl overflow-hidden">
                <div className="divide-y divide-surface-container-low">
                  {meal.items.map((item) => {
                    const snap = item.nutrients_snapshot;
                    const name = snap?._name || `Unbenanntes Produkt`;
                    const p = Number(snap?.protein_g || 0);
                    const c = Number(snap?.carbs_g || 0);
                    const f = Number(snap?.fat_g || 0);

                    return (
                      <div key={item.id} className="group p-4 flex items-center justify-between hover:bg-surface-container-lowest/50 transition-colors">
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base truncate pr-2">{name}</span>
                            <EditGramsButton itemId={item.id} currentGrams={parseFloat(item.grams)} />
                            <FullEditItemButton item={item} />
                            {item.food_id && (
                              <FavoriteToggle 
                                foodId={item.food_id} 
                                grams={parseFloat(item.grams)} 
                                label={name}
                                isFavoriteInitial={favoriteFoodIds.has(item.food_id)} 
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="text-[11px] font-bold" style={{ color: getMacroColor('protein') }}>🥩 {Math.round(p)}g</span>
                             <span className="text-[11px] font-bold" style={{ color: getMacroColor('carbs') }}>🥖 {Math.round(c)}g</span>
                             <span className="text-[11px] font-bold" style={{ color: getMacroColor('fat') }}>🥑 {Math.round(f)}g</span>
                             <span className="text-[11px] font-medium text-outline/40">• {item.grams}g</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold tabular-nums">{Math.round(snap?.kcal || 0)}</span>
                          <DeleteItemButton itemId={item.id} />
                        </div>
                      </div>
                    );
                  })}
                  {meal.items.length === 0 && meal.rawInput && (
                    <div className="p-4 italic text-outline text-sm">
                      {meal.rawInput}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

