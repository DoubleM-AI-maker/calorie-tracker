import { db } from '@/db';
import { goalProfiles, userAliases, ingestionLogs, users } from '@/db/schema';
import { eq, desc, and, lte, sql } from 'drizzle-orm';
import { getUserId, getUserEmail } from '@/lib/auth';
import GoalForm from '../components/GoalForm';
import AliasList from '../components/AliasList';
import { User, Target, Brain, BarChart3, Database, ShieldCheck, Zap } from 'lucide-react';

export default async function EinstellungenPage() {
  const userId = await getUserId();
  const userEmail = await getUserEmail();
  const now = new Date();

  // 1. Goal Profile
  const activeGoal = await db.query.goalProfiles.findFirst({
    where: and(eq(goalProfiles.userId, userId), lte(goalProfiles.validFrom, now)),
    orderBy: [desc(goalProfiles.validFrom)],
  });

  // 2. Aliases
  const rawAliases = await db.query.userAliases.findMany({
    where: eq(userAliases.userId, userId),
    orderBy: [desc(userAliases.usageCount)],
    with: {
      resolvedFood: true
    }
  } as any); // Using 'as any' because with relation might need proper schema typing in db.query

  const aliases = rawAliases.map((a: any) => ({
    id: a.id,
    triggerPhrase: a.triggerPhrase,
    usageCount: a.usageCount,
    foodName: a.resolvedFood?.nameDe || a.resolvedFood?.displayName
  }));

  // 3. Stats (Observability)
  const stats = await db.select({
    count: sql<number>`count(*)::int`,
    avgLatency: sql<number>`avg(latency_ms)::int`,
    totalTokens: sql<number>`sum(prompt_tokens + completion_tokens)::int`,
    totalCost: sql<number>`sum(cost_usd)::numeric`
  })
  .from(ingestionLogs)
  .where(eq(ingestionLogs.userId, userId));

  const userStats = stats[0] || { count: 0, avgLatency: 0, totalTokens: 0, totalCost: 0 };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-8 pb-32 bg-surface-bright">
      <div className="w-full max-w-xl flex flex-col gap-10 z-10">
        
        {/* Header */}
        <header className="flex flex-col gap-2">
          <h1 className="headline-lg">Profil & Ziele</h1>
          <p className="body-md text-outline">Verwalte deine Identität, deine körperlichen Ziele und die KI-Intelligenz.</p>
        </header>

        {/* User Card */}
        <section className="bg-surface-container-lowest shadow-ambient rounded-[2rem] p-6 flex items-center gap-5 border border-outline-variant/30">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="title-md font-bold text-on-surface">{userId}</span>
            <span className="body-sm text-outline flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {userEmail}
            </span>
          </div>
        </section>

        {/* Goals Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="title-md font-semibold">Dein Ziele-Atelier</h2>
          </div>
          <GoalForm initial={activeGoal ? {
            kcal: activeGoal.kcal,
            proteinG: activeGoal.proteinG,
            fatG: activeGoal.fatG,
            carbsG: activeGoal.carbsG,
            fiberG: activeGoal.fiberG,
          } : undefined} />
        </section>

        {/* Aliases Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2">
            <Brain className="w-5 h-5 text-secondary" />
            <h2 className="title-md font-semibold">Gelernte Aliase</h2>
          </div>
          <p className="text-xs text-outline px-2 mb-2 leading-relaxed">
            Die KI lernt aus deinen Korrekturen. Hier siehst du alle Phrasen, die wir für dich automatisiert haben.
          </p>
          <AliasList aliases={aliases} />
        </section>

        {/* Stats Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2">
            <BarChart3 className="w-5 h-5 text-outline" />
            <h2 className="title-md font-semibold">Observability & Kosten</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard 
              icon={<Zap className="w-4 h-4" />} 
              label="Durchschn. Latenz" 
              value={`${userStats.avgLatency || 0}ms` }
              color="text-amber-600"
            />
            <StatCard 
              icon={<Database className="w-4 h-4" />} 
              label="Logs (30 Tage)" 
              value={`${userStats.count}`}
              color="text-secondary"
            />
            <StatCard 
              icon={<Database className="w-4 h-4" />} 
              label="Tokens gesamt" 
              value={`${(userStats.totalTokens || 0).toLocaleString('de-DE')}`}
              color="text-outline"
            />
             <StatCard 
              icon={<Database className="w-4 h-4" />} 
              label="Gesch. Kosten" 
              value={`$${Number(userStats.totalCost || 0).toFixed(2)}`}
              color="text-primary"
            />
          </div>
        </section>

        {/* App Info Footer */}
        <footer className="mt-8 text-center">
          <p className="label-sm text-outline opacity-40 italic">Kalorie Tracker v1.2 — Precision Atelier Edition</p>
        </footer>
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className="bg-surface-container-low p-4 rounded-2xl flex flex-col gap-2">
      <div className="flex items-center gap-2 text-outline">
        {icon}
        <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
      </div>
      <span className={`text-xl font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
