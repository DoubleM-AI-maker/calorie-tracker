import { getUserId } from '@/lib/auth';
import { getHistoryStatsRaw } from '@/lib/db/queries';
import WeeklyBarChart from './charts/WeeklyBarChart';

export default async function WeeklyStatistics() {
  const userId = await getUserId();
  const data = await getHistoryStatsRaw(userId, 7);

  const avgKcal = Math.round(data.reduce((s, r) => s + r.kcal, 0) / 7);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-container-lowest shadow-ambient rounded-3xl p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="title-md">Kalorien (7 Tage)</h3>
          <span className="label-sm text-outline">∅ {avgKcal} kcal</span>
        </div>
        <div className="h-64 w-full">
          <WeeklyBarChart data={data.map(d => ({
            name: new Date(d.day).toLocaleDateString('de-DE', { weekday: 'short' }),
            kcal: d.kcal,
            goal: d.goalKcal,
            fullDate: new Date(d.day).toISOString().split('T')[0]
          }))} />
        </div>
      </div>

      {/* Macro Averages */}
      <div className="grid grid-cols-3 gap-3">
         <MacroCard label="🥩 Protein" value={data.reduce((s, r) => s + r.protein_g, 0) / 7} color="var(--secondary)" />
         <MacroCard label="🥖 Carbs" value={data.reduce((s, r) => s + r.carbs_g, 0) / 7} color="#d97706" />
         <MacroCard label="🥑 Fett" value={data.reduce((s, r) => s + r.fat_g, 0) / 7} color="var(--primary)" />
      </div>
    </div>
  );
}

function MacroCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-container-lowest p-4 rounded-2xl flex flex-col gap-1 shadow-sm">
      <span className="label-sm text-outline uppercase">{label}</span>
      <span className="text-xl font-bold" style={{ color }}>{Math.round(value)}g</span>
      <span className="text-[10px] text-outline italic">∅ / Tag</span>
    </div>
  );
}
