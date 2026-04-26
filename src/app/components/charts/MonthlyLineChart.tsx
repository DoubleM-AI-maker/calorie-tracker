'use client';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';

import { useRouter } from 'next/navigation';

interface MonthlyLineChartProps {
  data: {
    name: string;
    kcal: number;
    avg7: number;
    goal: number;
    fullDate: string;
  }[];
}

export default function MonthlyLineChart({ data }: MonthlyLineChartProps) {
  const router = useRouter();
  const currentGoal = data[data.length - 1]?.goal || 2000;

  const handlePointClick = (data: any) => {
    if (data && data.fullDate) {
      router.push(`/tagebuch?date=${data.fullDate}`);
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        onClick={(e) => {
          if (e && e.activePayload && e.activePayload[0]) {
            handlePointClick(e.activePayload[0].payload);
          }
        }}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-container-high)" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: 'var(--outline)', fontSize: 10 }} 
          interval={4}
          dy={10}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: 'var(--outline)', fontSize: 10 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--surface-container-lowest)', 
            borderRadius: '16px', 
            border: 'none',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            fontSize: '12px'
          }}
        />
        <ReferenceLine 
          y={currentGoal} 
          stroke="var(--outline)" 
          strokeDasharray="4 4" 
          opacity={0.5}
        />
        
        {/* Daily Kcal (Light Line/Dots) */}
        <Line 
          type="monotone" 
          dataKey="kcal" 
          stroke="var(--secondary)" 
          strokeWidth={1} 
          dot={{ r: 2, fill: 'var(--secondary)', strokeWidth: 0 }}
          activeDot={{ r: 4 }}
          opacity={0.4}
          style={{ cursor: 'pointer' }}
        />

        {/* 7-Day Average (Main Thick Line) */}
        <Line 
          type="monotone" 
          dataKey="avg7" 
          stroke="var(--primary)" 
          strokeWidth={3} 
          dot={false}
          activeDot={{ r: 4 }}
          style={{ cursor: 'pointer' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
