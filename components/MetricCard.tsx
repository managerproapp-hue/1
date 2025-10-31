
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  colorClass: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, colorClass }) => {
  return (
    <div className={`rounded-xl p-6 shadow-lg flex items-center space-x-4 ${colorClass}`}>
      <div className="bg-black bg-opacity-20 p-3 rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-white opacity-80">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
};
