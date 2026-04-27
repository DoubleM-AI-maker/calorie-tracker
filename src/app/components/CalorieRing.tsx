'use client';

import Link from 'next/link';

interface CalorieRingProps {
  consumed: number;
  goal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbsGoal: number;
  fat: number;
  fatGoal: number;
}

export default function CalorieRing({
  consumed,
  goal,
  protein,
  proteinGoal,
  carbs,
  carbsGoal,
  fat,
  fatGoal,
}: CalorieRingProps) {
  const diff = goal - consumed;
  const isOver = consumed > goal;
  const progress = Math.min(consumed / goal, 1);

  // SVG ring math
  const size = 220;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const macroBarPercent = (val: number, total: number) =>
    Math.min((val / total) * 100, 100);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Calorie Ring */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Track */}
        <svg
          width={size}
          height={size}
          className="absolute rotate-[-90deg]"
          style={{ overflow: 'visible' }}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-container)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isOver ? 'var(--primary)' : 'var(--primary)'} // Both red in our system, but isOver can be even brighter
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
          {/* Extra Glow if over */}
          {isOver && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="animate-pulse opacity-40"
              style={{ filter: 'blur(4px)' }}
            />
          )}
        </svg>

        {/* Center text — clickable link to diary */}
        <Link href="/tagebuch" className="flex flex-col items-center gap-1 z-10 group">
          <span className={`label-sm transition-colors ${isOver ? 'text-primary font-bold' : 'text-outline group-hover:text-primary'}`}>
            {isOver ? 'ZUVIEL' : 'VERBLEIBEND'}
          </span>
          <span
            className="font-semibold tracking-tight leading-none tabular-nums"
            style={{ fontSize: '2.75rem', color: isOver ? 'var(--primary)' : 'var(--on-surface)' }}
          >
            {Math.abs(diff).toLocaleString('de-DE')}
          </span>
          <div className="flex items-center gap-3 mt-1">
            <div className="text-center">
              <span className="label-sm text-outline block">GEGESSEN</span>
              <span className="text-sm font-semibold tabular-nums">{consumed.toLocaleString('de-DE')}</span>
            </div>
            <div className="w-px h-6 bg-outline-variant" />
            <div className="text-center">
              <span className="label-sm block" style={{ color: 'var(--secondary)' }}>ZIEL</span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--secondary)' }}>
                {goal.toLocaleString('de-DE')}
              </span>
            </div>
          </div>
          <span className="text-xs text-outline mt-1 opacity-60 group-hover:opacity-100 transition-opacity">↗ Details</span>
        </Link>
      </div>

      {/* Macro bars */}
      <div className="w-full grid grid-cols-3 gap-6">
        {/* Protein */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="label-sm text-outline truncate" style={{ color: 'var(--tertiary)' }}>🥩 PROTEIN</span>
          </div>
          <span className={`text-xl font-semibold tabular-nums ${protein > proteinGoal ? 'text-primary' : ''}`}>
            {protein.toFixed(0)}g
          </span>
          <div className="h-1.5 rounded-full overflow-hidden bg-surface-container">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${macroBarPercent(protein, proteinGoal)}%`,
                backgroundColor: protein > proteinGoal ? 'var(--primary)' : 'var(--tertiary)',
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-outline tabular-nums">von {proteinGoal}g</span>
            {protein > proteinGoal && (
               <span className="text-[10px] text-primary font-bold">+{Math.round(protein - proteinGoal)}g</span>
            )}
          </div>
        </div>

        {/* Carbs */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="label-sm text-outline truncate" style={{ color: '#d97706' }}>🥖 CARBS</span>
          </div>
          <span className={`text-xl font-semibold tabular-nums ${carbs > carbsGoal ? 'text-primary' : ''}`}>
            {carbs.toFixed(0)}g
          </span>
          <div className="h-1.5 rounded-full overflow-hidden bg-surface-container">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${macroBarPercent(carbs, carbsGoal)}%`,
                backgroundColor: carbs > carbsGoal ? 'var(--primary)' : '#d97706',
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-outline tabular-nums">von {carbsGoal}g</span>
            {carbs > carbsGoal && (
               <span className="text-[10px] text-primary font-bold">+{Math.round(carbs - carbsGoal)}g</span>
            )}
          </div>
        </div>

        {/* Fat */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="label-sm text-outline truncate" style={{ color: '#0d9488' }}>🥑 FETT</span>
          </div>
          <span className={`text-xl font-semibold tabular-nums ${fat > fatGoal ? 'text-primary' : ''}`}>
            {fat.toFixed(0)}g
          </span>
          <div className="h-1.5 rounded-full overflow-hidden bg-surface-container">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${macroBarPercent(fat, fatGoal)}%`,
                backgroundColor: fat > fatGoal ? 'var(--primary)' : '#0d9488',
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-outline tabular-nums">von {fatGoal}g</span>
            {fat > fatGoal && (
               <span className="text-[10px] text-primary font-bold">+{Math.round(fat - fatGoal)}g</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
