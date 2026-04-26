'use client';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Cell
} from 'recharts';

import { useRouter } from 'next/navigation';

interface WeeklyBarChartProps {
  data: {
    name: string;
    kcal: number;
    goal: number;
    fullDate: string;
  }[];
}

export default function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  const router = useRouter();
  // Goal line from the most recent day in the set
  const currentGoal = data[data.length - 1]?.goal || 2000;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-container-high)" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: 'var(--outline)', fontSize: 12 }} 
          dy={10}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: 'var(--outline)', fontSize: 10 }}
        />
        <Tooltip 
          cursor={{ fill: 'var(--surface-container-low)', opacity: 0.4 }}
          contentStyle={{ 
            backgroundColor: 'var(--surface-container-lowest)', 
            borderRadius: '16px', 
            border: 'none',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            fontSize: '12px'
          }}
          itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
        />
        <ReferenceLine 
          y={currentGoal} 
          stroke="var(--primary)" 
          strokeDasharray="4 4" 
          label={{ 
            position: 'right', 
            fill: 'var(--primary)', 
            value: 'Ziel', 
            fontSize: 10,
            fontWeight: 'bold'
          }} 
        />
        <Bar 
          dataKey="kcal" 
          radius={[6, 6, 0, 0]}
          barSize={32}
          style={{ cursor: 'pointer' }}
          onClick={(data) => {
            if (data && data.fullDate) {
              router.push(`/tagebuch?date=${data.fullDate}`);
            }
          }}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.kcal > entry.goal ? 'var(--primary)' : 'var(--secondary)'} 
              fillOpacity={entry.kcal > entry.goal ? 0.8 : 0.6}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
