import { db } from '@/db';
import { meals, mealItems, goalProfiles } from '@/db/schema';
import { eq, gte, lte, and, desc, inArray } from 'drizzle-orm';
import CalorieRing from './CalorieRing';
import RecipeRecommendations from './RecipeRecommendations';
import { getUserId } from '@/lib/auth';
import { getBerlinDayRange } from '@/lib/date';
import { getStatsForDayRaw } from '@/lib/db/queries';

// Default fallback goal if no goal profile is set yet
const DEFAULT_GOAL = { kcal: 2000, protein_g: 150, fat_g: 65, carbs_g: 230 };

export default async function DailyDashboard({ date }: { date?: string }) {
  const userId = await getUserId();
  const { start, end, dateStr } = getBerlinDayRange(date);

  let consumed = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  let goalKcal = DEFAULT_GOAL.kcal;
  let goalProtein = DEFAULT_GOAL.protein_g;
  let goalCarbs = DEFAULT_GOAL.carbs_g;
  let goalFat = DEFAULT_GOAL.fat_g;

  let now = date ? new Date(date) : new Date(); // Only for display / comparison

  try {
    const { goal, consumed: stats } = await getStatsForDayRaw(userId, date);
    consumed = stats;

    if (goal) {
      goalKcal = goal.kcal;
      goalProtein = goal.protein_g; 
      goalCarbs = goal.carbs_g;
      goalFat = goal.fat_g;
    }
  } catch (err) {
    console.error('DailyDashboard DB error:', err);
  }

  // Format today's date nicely
  const dayName = now.toLocaleDateString('de-DE', { weekday: 'long', timeZone: 'Europe/Berlin' });
  const formattedDate = now.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', timeZone: 'Europe/Berlin' });

  const isToday = dateStr === getBerlinDayRange().dateStr;

  const remaining = {
    kcal: Math.max(0, goalKcal - consumed.kcal),
    protein_g: Math.max(0, goalProtein - consumed.protein_g),
    fat_g: Math.max(0, goalFat - consumed.fat_g),
    carbs_g: Math.max(0, goalCarbs - consumed.carbs_g),
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-surface-container-lowest shadow-ambient rounded-2xl p-6 sm:p-8 flex flex-col gap-6">
        {/* Header */}
        <div>
          <p className="label-sm text-outline uppercase">{dayName}, {formattedDate}</p>
          <h2 className="headline-lg mt-1">{isToday ? 'Heute' : 'Detailansicht'}</h2>
        </div>
        
        <CalorieRing
          consumed={Math.round(consumed.kcal)}
          goal={goalKcal}
          protein={consumed.protein_g}
          proteinGoal={goalProtein}
          carbs={consumed.carbs_g}
          carbsGoal={goalCarbs}
          fat={consumed.fat_g}
          fatGoal={goalFat}
        />

        {/* No-goal hint */}
        {goalKcal === DEFAULT_GOAL.kcal && (
          <p className="text-xs text-center text-outline">
            Kein Ziel eingerichtet — Standardwerte werden angezeigt.
          </p>
        )}
      </section>

      {/* Recipe Recommendations */}
      {isToday && remaining.kcal > 50 && (
        <RecipeRecommendations remaining={remaining} />
      )}
    </div>
  );
}
