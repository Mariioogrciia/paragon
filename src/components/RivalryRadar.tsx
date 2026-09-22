"use client";

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from "recharts";

interface RadarData {
  subject: string;
  A: number;
  B: number;
  fullMark: number;
}

interface RivalryRadarProps {
  data: RadarData[];
  userA: { name: string; color: string };
  userB: { name: string; color: string };
}

export function RivalryRadar({ data, userA, userB }: RivalryRadarProps) {
  return (
    <div className="h-[400px] w-full rounded-2xl bg-surface/50 border border-border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 'bold' }} 
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={false} 
            axisLine={false} 
          />
          
          <Radar
            name={userA.name}
            dataKey="A"
            stroke={userA.color}
            fill={userA.color}
            fillOpacity={0.4}
          />
          <Radar
            name={userB.name}
            dataKey="B"
            stroke={userB.color}
            fill={userB.color}
            fillOpacity={0.4}
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
            itemStyle={{ fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
