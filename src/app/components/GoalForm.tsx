'use client';

import { useState, useTransition, useEffect } from 'react';
import { updateGoalsAction } from '../actions';
import { DEFAULT_GOAL } from '@/lib/constants';

interface GoalProfile {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number | null;
}

export default function GoalForm({ initial }: { initial?: GoalProfile }) {
  const [kcal, setKcal] = useState(initial?.kcal || DEFAULT_GOAL.kcal);
  const [protein, setProtein] = useState(initial?.proteinG || DEFAULT_GOAL.protein_g);
  const [fat, setFat] = useState(initial?.fatG || DEFAULT_GOAL.fat_g);
  const [carbs, setCarbs] = useState(initial?.carbsG || DEFAULT_GOAL.carbs_g);
  const [fiber, setFiber] = useState(initial?.fiberG || DEFAULT_GOAL.fiber_g);
  
  const [mode, setMode] = useState<'grams' | 'percent'>('grams');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // Derived percentages
  const pKcal = protein * 4;
  const fKcal = fat * 9;
  const cKcal = carbs * 4;
  const totalMacroKcal = pKcal + fKcal + cKcal;
  
  const pPct = Math.round((pKcal / kcal) * 100);
  const fPct = Math.round((fKcal / kcal) * 100);
  const cPct = Math.round((cKcal / kcal) * 100);

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateGoalsAction({ kcal, protein, fat, carbs, fiber });
      if (res.success) {
        setMessage('Ziele erfolgreich aktualisiert!');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage('Fehler beim Speichern.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-xl">
      {/* Current Selection / Totals Overlay */}
      <section className="bg-surface-container-lowest shadow-ambient rounded-[2rem] p-8 flex flex-col gap-6 backdrop-blur-xl bg-opacity-80">
        <div className="flex flex-col gap-1">
          <span className="label-sm text-outline uppercase tracking-widest">Tagesziel</span>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tighter text-on-surface">{kcal.toLocaleString('de-DE')}</span>
            <span className="headline-lg text-outline font-normal">kcal</span>
          </div>
        </div>

        {/* Distribution Bar */}
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-surface-container-highest/40">
          <div style={{ width: `${pPct}%`, background: 'var(--secondary)' }} className="h-full transition-all duration-500 ease-out" />
          <div style={{ width: `${cPct}%`, background: '#d97706' }} className="h-full transition-all duration-500 ease-out" />
          <div style={{ width: `${fPct}%`, background: 'var(--primary)' }} className="h-full transition-all duration-500 ease-out" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="label-sm text-outline">🥩 Protein</span>
            <span className="title-md font-bold" style={{ color: 'var(--secondary)' }}>{protein}g <span className="text-[10px] font-normal opacity-60">({pPct}%)</span></span>
          </div>
          <div className="flex flex-col">
            <span className="label-sm text-outline">🥖 Carbs</span>
            <span className="title-md font-bold" style={{ color: '#d97706' }}>{carbs}g <span className="text-[10px] font-normal opacity-60">({cPct}%)</span></span>
          </div>
          <div className="flex flex-col">
            <span className="label-sm text-outline">🥑 Fett</span>
            <span className="title-md font-bold" style={{ color: 'var(--primary)' }}>{fat}g <span className="text-[10px] font-normal opacity-60">({fPct}%)</span></span>
          </div>
        </div>

        {Math.abs(kcal - totalMacroKcal) > 50 && (
          <div className="bg-error/5 p-3 rounded-xl flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <p className="text-xs text-error/80 leading-snug">
              Die Makros ergeben {totalMacroKcal} kcal. Das weicht von deinem Ziel ({kcal} kcal) ab.
            </p>
          </div>
        )}
      </section>

      {/* Editor Section */}
      <section className="bg-surface-container-low p-8 rounded-[2rem] flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h2 className="title-md font-semibold">Konfiguration</h2>
          <div className="bg-surface-container flex p-1 rounded-full">
            <button 
              onClick={() => setMode('grams')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${mode === 'grams' ? 'bg-surface-container-lowest shadow-sm text-on-surface' : 'text-outline'}`}>
              Gramm
            </button>
            <button 
              onClick={() => setMode('percent')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${mode === 'percent' ? 'bg-surface-container-lowest shadow-sm text-on-surface' : 'text-outline'}`}>
              Prozent
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Calorie Slider */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="label-sm text-outline uppercase font-bold">Kalorien-Limit</label>
              <span className="text-lg font-bold">{kcal}</span>
            </div>
            <input 
              type="range" min="1200" max="5000" step="50" 
              value={kcal} onChange={(e) => setKcal(parseInt(e.target.value))}
              className="w-full accent-primary bg-surface-container-highest h-2 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <hr className="opacity-0 my-2" />

          {/* Macro Sliders */}
          <div className="space-y-8">
            <MacroRow label="🥩 Protein" value={protein} setValue={setProtein} color="var(--secondary)" max={300} />
            <MacroRow label="🥖 Carbs" value={carbs} setValue={setCarbs} color="#d97706" max={600} />
            <MacroRow label="🥑 Fett" value={fat} setValue={setFat} color="var(--primary)" max={200} />
            <MacroRow label="🥬 Ballaststoffe" value={fiber} setValue={setFiber} color="var(--outline)" max={100} />
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-4">
          {message && (
            <p className={`text-center text-sm font-medium ${message.includes('Erfolg') ? 'text-secondary' : 'text-error'}`}>
              {message}
            </p>
          )}
          <button 
            onClick={handleSave}
            disabled={isPending}
            className="w-full py-5 rounded-[1.5rem] font-bold text-on-primary shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            style={{ 
              background: 'linear-gradient(135deg, var(--primary) 0%, #e2241f 100%)'
            }}>
            {isPending ? 'Speichere...' : 'Ziele anpassen'}
          </button>
        </div>
      </section>
    </div>
  );
}

function MacroRow({ label, value, setValue, color, max }: any) {
  return (
    <div className="flex flex-col gap-3 group">
      <div className="flex justify-between items-center">
        <label className="label-sm text-outline uppercase tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">{label}</label>
        <span className="text-base font-bold tabular-nums" style={{ color }}>{value}g</span>
      </div>
      <div className="relative flex items-center h-2">
        <input 
          type="range" min="0" max={max} step="1" 
          value={value} onChange={(e) => setValue(parseInt(e.target.value))}
          className="w-full h-full bg-surface-container-highest rounded-full appearance-none cursor-pointer z-10 accent-current"
          style={{ color }}
        />
      </div>
    </div>
  );
}
