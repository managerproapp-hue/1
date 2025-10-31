
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartData } from '../../types';

interface CustomBarChartProps {
  data: ChartData[];
  dataKey: string;
  fillColor: string;
}

const formatYAxis = (tickItem: number) => `€${tickItem.toLocaleString()}`;

export const CustomBarChart: React.FC<CustomBarChartProps> = ({ data, dataKey, fillColor }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            borderColor: '#4f46e5',
            color: '#ffffff',
            borderRadius: '0.5rem',
          }}
          cursor={{ fill: 'rgba(79, 70, 229, 0.2)' }}
        />
        <Bar dataKey={dataKey} fill={fillColor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
