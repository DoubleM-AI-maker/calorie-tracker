import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { getBerlinDayRange } from '../date';

export interface RawMealItem {
  id: number;
  meal_id: number;
  food_id: number | null;
  grams: string;
  nutrients_snapshot: any;
}

export interface RawMeal {
  id: number;
  user_id: string;
  timestamp: Date;
  slot: string;
  raw_input: string | null;
  notes: string | null;
  items: RawMealItem[];
}

/**
 * Fetches all meals for a user within a specific Berlin day range, 
 * including all nested items using raw SQL for maximum reliability.
 */
export async function getMealsForDayRaw(userId: string, date?: Date | string): Promise<RawMeal[]> {
  const { start, end } = getBerlinDayRange(date);
  
  console.log(`[Queries] Fetching meals for ${userId} between ${start.toISOString()} and ${end.toISOString()}`);
  
  // We use a single query with a join and aggregate or just fetch all and group in JS
  // Since pg doesn't have a simple "group into array" for complex objects without heavy JSON ops, 
  // we'll fetch all rows and group them.
  const result = await db.execute(sql`
    SELECT 
      m.id as meal_id, m.user_id, m.timestamp, m.slot, m.raw_input, m.notes,
      mi.id as item_id, mi.food_id, mi.grams, mi.nutrients_snapshot
    FROM meal m
    LEFT JOIN meal_item mi ON m.id = mi.meal_id
    WHERE m.user_id = ${userId}
      AND m.timestamp >= ${start.toISOString()}
      AND m.timestamp <= ${end.toISOString()}
    ORDER BY m.timestamp DESC
  `);

  const mealsMap = new Map<number, RawMeal>();

  for (const row of result.rows as any[]) {
    const mealId = row.meal_id;
    
    if (!mealsMap.has(mealId)) {
      mealsMap.set(mealId, {
        id: mealId,
        user_id: row.user_id,
        timestamp: new Date(row.timestamp),
        slot: row.slot,
        raw_input: row.raw_input,
        notes: row.notes,
        items: []
      });
    }

    if (row.item_id) {
      mealsMap.get(mealId)!.items.push({
        id: row.item_id,
        meal_id: mealId,
        food_id: row.food_id,
        grams: row.grams,
        nutrients_snapshot: row.nutrients_snapshot
      });
    }
  }

  return Array.from(mealsMap.values());
}

/**
 * Fetches nutrition stats for a specific day and the active goal profile.
 */
export async function getStatsForDayRaw(userId: string, date?: Date | string) {
  const { start, end } = getBerlinDayRange(date);
  const now = date ? new Date(date) : new Date();

  // 1. Get Goal Profile
  const goalsRes = await db.execute(sql`
    SELECT * FROM goal_profile
    WHERE user_id = ${userId}
      AND valid_from <= ${now.toISOString()}
      AND (valid_to IS NULL OR valid_to > ${now.toISOString()})
    ORDER BY valid_from DESC
    LIMIT 1
  `);
  
  const goal = goalsRes.rows[0] as any || null;

  // 2. Get Aggregated Consumption
  const consumedRes = await db.execute(sql`
    SELECT 
      COALESCE(SUM((mi.nutrients_snapshot->>'kcal')::numeric), 0) as kcal,
      COALESCE(SUM((mi.nutrients_snapshot->>'protein_g')::numeric), 0) as protein_g,
      COALESCE(SUM((mi.nutrients_snapshot->>'carbs_g')::numeric), 0) as carbs_g,
      COALESCE(SUM((mi.nutrients_snapshot->>'fat_g')::numeric), 0) as fat_g
    FROM meal m
    JOIN meal_item mi ON m.id = mi.meal_id
    WHERE m.user_id = ${userId}
      AND m.timestamp >= ${start.toISOString()}
      AND m.timestamp <= ${end.toISOString()}
  `);

  const consumed = consumedRes.rows[0] as any || { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

  return {
    goal,
    consumed: {
      kcal: Number(consumed.kcal),
      protein_g: Number(consumed.protein_g),
      carbs_g: Number(consumed.carbs_g),
      fat_g: Number(consumed.fat_g)
    }
  };
}

/**
 * Fetches daily aggregates for a period, mapped to the respective goal profiles.
 * Returns an entry for EVERY day in the period, even if consumption was zero.
 */
export async function getHistoryStatsRaw(userId: string, days: number) {
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  // 1. Get Daily Aggregates (grouped by day in Berlin time)
  const statsRes = await db.execute(sql`
    SELECT 
      DATE(m.timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin') as day,
      COALESCE(SUM((mi.nutrients_snapshot->>'kcal')::numeric), 0) as kcal,
      COALESCE(SUM((mi.nutrients_snapshot->>'protein_g')::numeric), 0) as protein_g,
      COALESCE(SUM((mi.nutrients_snapshot->>'carbs_g')::numeric), 0) as carbs_g,
      COALESCE(SUM((mi.nutrients_snapshot->>'fat_g')::numeric), 0) as fat_g
    FROM meal m
    JOIN meal_item mi ON m.id = mi.meal_id
    WHERE m.user_id = ${userId}
      AND m.timestamp >= ${startDate.toISOString()}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  // 2. Get Goal History for the same period
  const goalsRes = await db.execute(sql`
    SELECT * FROM goal_profile
    WHERE user_id = ${userId}
      AND (valid_to IS NULL OR valid_to >= ${startDate.toISOString()})
    ORDER BY valid_from ASC
  `);

  const dailyStatsMap = new Map<string, any>();
  for (const r of statsRes.rows as any[]) {
    const dStr = new Date(r.day).toISOString().split('T')[0];
    dailyStatsMap.set(dStr, r);
  }

  const goalHistory = goalsRes.rows.map((g: any) => ({
    validFrom: new Date(g.valid_from),
    validTo: g.valid_to ? new Date(g.valid_to) : null,
    kcal: g.kcal,
    protein_g: g.protein_g,
    carbs_g: g.carbs_g,
    fat_g: g.fat_g
  }));

  // 3. Generate array for ALL days
  const results = [];
  for (let i = 0; i < days; i++) {
    const currentDay = new Date(startDate);
    currentDay.setDate(startDate.getDate() + i);
    const dStr = currentDay.toISOString().split('T')[0];
    
    const stat = dailyStatsMap.get(dStr);
    
    // Find goal active on this day
    const goal = goalHistory.find(g => 
      currentDay >= g.validFrom && (!g.validTo || currentDay < g.validTo)
    ) || (goalHistory.length > 0 ? goalHistory[goalHistory.length - 1] : null);

    results.push({
      day: currentDay,
      kcal: stat ? Number(stat.kcal) : 0,
      protein_g: stat ? Number(stat.protein_g) : 0,
      carbs_g: stat ? Number(stat.carbs_g) : 0,
      fat_g: stat ? Number(stat.fat_g) : 0,
      goalKcal: goal?.kcal || 2000,
      goalProtein: goal?.protein_g || 150,
      goalCarbs: goal?.carbs_g || 230,
      goalFat: goal?.fat_g || 65
    });
  }

  return results;
}
