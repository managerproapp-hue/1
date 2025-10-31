
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartData } from '../../types';

interface CustomLineChartProps {
  data: ChartData[];
  lines: { dataKey: string; stroke: string }[];
}

const formatYAxis = (tickItem: number) => `€${tickItem.toLocaleString()}`;

export const CustomLineChart: React.FC<CustomLineChartProps> = ({ data, lines }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatYAxis}/>
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            borderColor: '#8b5cf6',
            color: '#ffffff',
            borderRadius: '0.5rem',
          }}
        />
        <Legend wrapperStyle={{fontSize: "14px"}}/>
        {lines.map(line => (
          <Line key={line.dataKey} type="monotone" dataKey={line.dataKey} stroke={line.stroke} strokeWidth={2} activeDot={{ r: 8 }} dot={{ stroke: line.stroke, strokeWidth: 1, r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
