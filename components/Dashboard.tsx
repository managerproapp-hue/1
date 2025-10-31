
import React, { useMemo } from 'react';
import { Transaction, TransactionType, ChartData } from '../types';
import { MetricCard } from './MetricCard';
import { CustomBarChart } from './charts/BarChart';
import { CustomLineChart } from './charts/LineChart';
import { CustomPieChart } from './charts/PieChart';
import { DollarSignIcon, PiggyBankIcon, TrendingDownIcon, TrendingUpIcon } from './icons';

interface DashboardProps {
  transactions: Transaction[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {

  const { totalIncome, totalExpenses, netMargin, savingsRate } = useMemo(() => {
    const income = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    const margin = income - expenses;
    const rate = income > 0 ? (margin / income) * 100 : 0;
    return {
      totalIncome: income,
      totalExpenses: expenses,
      netMargin: margin,
      savingsRate: rate,
    };
  }, [transactions]);

  const monthlyPerformanceData = useMemo<ChartData[]>(() => {
    const monthlyData: { [key: string]: { Ingresos: number, Gastos: number, 'Margen Neto': number } } = {};
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    monthNames.forEach(name => {
        monthlyData[name] = { Ingresos: 0, Gastos: 0, 'Margen Neto': 0 };
    });

    transactions.forEach(t => {
      const month = monthNames[t.date.getMonth()];
      if (t.type === TransactionType.INCOME) {
        monthlyData[month].Ingresos += t.amount;
      } else {
        monthlyData[month].Gastos += t.amount;
      }
    });

    return monthNames.map(month => {
      const { Ingresos, Gastos } = monthlyData[month];
      return {
        name: month,
        Ingresos,
        Gastos,
        'Margen Neto': Ingresos - Gastos,
      };
    });
  }, [transactions]);

  const expenseDistributionData = useMemo<ChartData[]>(() => {
    const categoryTotals: { [key: string]: number } = {};
    transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });
    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const incomeSourceData = useMemo<ChartData[]>(() => {
    const sourceTotals: { [key: string]: number } = {};
    transactions
      .filter(t => t.type === TransactionType.INCOME && t.source)
      .forEach(t => {
        sourceTotals[t.source!] = (sourceTotals[t.source!] || 0) + t.amount;
      });
    return Object.entries(sourceTotals).map(([name, value]) => ({ name, value, total: value }));
  }, [transactions]);

  const pieChartColors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total de Ingresos" value={formatCurrency(totalIncome)} icon={<TrendingUpIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-violet-500 to-purple-600"/>
        <MetricCard title="Total de Gastos" value={formatCurrency(totalExpenses)} icon={<TrendingDownIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-pink-500 to-rose-600"/>
        <MetricCard title="Margen Neto" value={formatCurrency(netMargin)} icon={<DollarSignIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-blue-500 to-sky-600"/>
        <MetricCard title="Porcentaje de Ahorro" value={`${savingsRate.toFixed(1)}%`} icon={<PiggyBankIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-emerald-500 to-green-600"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Rendimiento Mensual</h3>
            <CustomLineChart 
                data={monthlyPerformanceData}
                lines={[
                    { dataKey: 'Ingresos', stroke: '#8b5cf6' },
                    { dataKey: 'Gastos', stroke: '#ec4899' },
                    { dataKey: 'Margen Neto', stroke: '#3b82f6' }
                ]}
            />
        </div>
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Distribución de Gastos</h3>
            <CustomPieChart data={expenseDistributionData} colors={pieChartColors} />
        </div>
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Gastos por Categoría</h3>
          <CustomBarChart data={expenseDistributionData} dataKey="value" fillColor="#ec4899" />
        </div>
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Rendimiento por Fuente de Ingreso</h3>
          <CustomBarChart data={incomeSourceData} dataKey="total" fillColor="#8b5cf6" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
