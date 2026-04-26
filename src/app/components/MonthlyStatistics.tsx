import { getUserId } from '@/lib/auth';
import { getHistoryStatsRaw } from '@/lib/db/queries';
import MonthlyLineChart from './charts/MonthlyLineChart';
import Link from 'next/link';

export default async function MonthlyStatistics() {
  const userId = await getUserId();
  const data = await getHistoryStatsRaw(userId, 30);

  // Calculate 7-day moving average
  const chartData = data.map((d, idx) => {
    const last7 = data.slice(Math.max(0, idx - 6), idx + 1);
    const avg = last7.reduce((s, r) => s + r.kcal, 0) / last7.length;
    return {
      name: new Date(d.day).getDate().toString(),
      kcal: d.kcal,
      avg7: Math.round(avg),
      goal: d.goalKcal,
      fullDate: new Date(d.day).toISOString().split('T')[0]
    };
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Line Chart Card */}
      <div className="bg-surface-container-lowest shadow-ambient rounded-3xl p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="title-md">Kalorien-Trend (30 Tage)</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-secondary" />
               <span className="text-[10px] text-outline">Ist</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-primary" />
               <span className="text-[10px] text-outline">7-Tage-Schnitt</span>
            </div>
          </div>
        </div>
        <div className="h-64 w-full">
          <MonthlyLineChart data={chartData} />
        </div>
      </div>

      {/* Adherence Heatmap */}
      <div className="bg-surface-container-lowest shadow-ambient rounded-3xl p-6 flex flex-col gap-4">
        <h3 className="title-md">Ziel-Erreichung</h3>
        <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
          {data.map((d, idx) => {
            const adherence = d.kcal > 0 ? (d.kcal / d.goalKcal) : 0;
            let bgColor = 'var(--surface-container-high)';
            let title = `${new Date(d.day).toLocaleDateString()}: 0 kcal`;
            
            if (d.kcal > 0) {
              const diff = Math.abs(d.kcal - d.goalKcal);
              const isGood = diff / d.goalKcal < 0.15; // Within 15% range
              bgColor = isGood ? 'var(--secondary)' : (d.kcal > d.goalKcal ? 'var(--primary)' : '#d97706');
              title = `${new Date(d.day).toLocaleDateString()}: ${d.kcal} kcal (${Math.round(adherence * 100)}%)`;
            }

            return (
              <Link
                key={idx} 
                href={`/tagebuch?date=${new Date(d.day).toISOString().split('T')[0]}`}
                title={title}
                className="aspect-square rounded-md transition-transform hover:scale-110"
                style={{ background: bgColor, opacity: d.kcal > 0 ? 0.7 : 0.3 }}
              />
            );
          })}
        </div>
        <p className="text-[10px] text-outline">
          <span className="inline-block w-2 h-2 rounded bg-secondary mr-1"></span> Im Ziel &nbsp;
          <span className="inline-block w-2 h-2 rounded bg-primary mr-1"></span> Drüber &nbsp;
          <span className="inline-block w-2 h-2 rounded bg-[#d97706] mr-1"></span> Drunter
        </p>
      </div>
    </div>
  );
}
