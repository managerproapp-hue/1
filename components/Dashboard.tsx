import React, { useMemo } from 'react';
import { Transaction, TransactionType, ChartData, Category } from '../types';
import { MetricCard } from './MetricCard';
import { CustomBarChart } from './charts/BarChart';
import { CustomLineChart } from './charts/LineChart';
import { CustomPieChart } from './charts/PieChart';
import { DollarSignIcon, PiggyBankIcon, TargetIcon, TrendingDownIcon, TrendingUpIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';

// --- Sub-componente para la tarjeta de progreso de la meta ---
interface GoalProgressCardProps {
    name: string;
    currentAmount: number;
    targetAmount: number;
}
const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ name, currentAmount, targetAmount }) => {
    const progress = Math.min((currentAmount / targetAmount) * 100, 100);
    const formatCurrencyLocal = (value: number) => `€${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="bg-slate-700/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-1">
                <p className="font-semibold text-white">{name}</p>
                <p className="text-sm text-violet-300 font-medium">{progress.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-slate-600 rounded-full h-2.5 mb-1">
                <div className="bg-violet-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-right text-xs text-gray-400">{formatCurrencyLocal(currentAmount)} / {formatCurrencyLocal(targetAmount)}</p>
        </div>
    );
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

interface DashboardProps {
    transactions: Transaction[];
    onNavigateToSearch: (categoryId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, onNavigateToSearch }) => {
  const { allTransactions, goals, categories, getCategoryWithDescendants } = useAppContext();
  
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const getCategoryName = (id: string) => categoryMap.get(id)?.name || 'Desconocida';
  const getRootCategoryId = (id: string): string => {
      let current = categoryMap.get(id);
      while (current && current.parentId) {
          current = categoryMap.get(current.parentId);
      }
      return current ? current.id : id;
  };

  const { totalIncome, totalExpenses, netMargin, savingsRate } = useMemo(() => {
    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const margin = income - expenses;
    const rate = income > 0 ? (margin / income) * 100 : 0;
    return { totalIncome: income, totalExpenses: expenses, netMargin: margin, savingsRate: rate };
  }, [transactions]);

  const monthlyPerformanceData = useMemo<ChartData[]>(() => {
    const monthlyData: { [key: string]: { Ingresos: number, Gastos: number, 'Margen Neto': number } } = {};
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    monthNames.forEach(name => { monthlyData[name] = { Ingresos: 0, Gastos: 0, 'Margen Neto': 0 }; });
    transactions.forEach(t => {
      const month = monthNames[t.date.getMonth()];
      if (t.type === TransactionType.INCOME) monthlyData[month].Ingresos += t.amount;
      else monthlyData[month].Gastos += t.amount;
    });
    return monthNames.map(month => {
      const { Ingresos, Gastos } = monthlyData[month];
      return { name: month, Ingresos, Gastos, 'Margen Neto': Ingresos - Gastos };
    });
  }, [transactions]);

  const expenseDistributionData = useMemo<ChartData[]>(() => {
    const categoryTotals: { [key: string]: { name: string, value: number, id: string } } = {};
    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
        const rootId = getRootCategoryId(t.categoryId);
        if (!categoryTotals[rootId]) {
            categoryTotals[rootId] = { name: getCategoryName(rootId), value: 0, id: rootId };
        }
        categoryTotals[rootId].value += t.amount;
      });
    return Object.values(categoryTotals).sort((a, b) => b.value - a.value);
  }, [transactions, getCategoryName, getRootCategoryId]);
  
  const incomeByCategoryData = useMemo<ChartData[]>(() => {
    const categoryTotals: { [key: string]: { name: string, value: number, id: string } } = {};
    transactions.filter(t => t.type === TransactionType.INCOME).forEach(t => {
        const rootId = getRootCategoryId(t.categoryId);
        if (!categoryTotals[rootId]) {
            categoryTotals[rootId] = { name: getCategoryName(rootId), value: 0, id: rootId };
        }
        categoryTotals[rootId].value += t.amount;
      });
    return Object.values(categoryTotals).sort((a, b) => b.value - a.value);
  }, [transactions, getCategoryName, getRootCategoryId]);
  
  const goalsWithProgress = useMemo(() => {
    return goals.map(goal => {
        const allCategoryIds = getCategoryWithDescendants(goal.linkedCategoryId);
        const categoryIdsSet = new Set(allCategoryIds);
        
        const currentAmount = allTransactions.reduce((sum, t) => {
            if (t.type === TransactionType.EXPENSE && categoryIdsSet.has(t.categoryId)) {
                return sum + t.amount;
            }
            return sum;
        }, 0);

        return {
            ...goal,
            currentAmount,
        };
    });
  }, [allTransactions, goals, getCategoryWithDescendants]);

  const pieChartColors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
  
  const handleChartClick = (data: any) => {
      const clickedData = expenseDistributionData.find(d => d.name === data.name);
      if (clickedData && 'id' in clickedData) {
          onNavigateToSearch(clickedData.id as string);
      }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total de Ingresos" value={formatCurrency(totalIncome)} icon={<TrendingUpIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-violet-500 to-purple-600"/>
        <MetricCard title="Total de Gastos" value={formatCurrency(totalExpenses)} icon={<TrendingDownIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-pink-500 to-rose-600"/>
        <MetricCard title="Margen Neto" value={formatCurrency(netMargin)} icon={<DollarSignIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-blue-500 to-sky-600"/>
        <MetricCard title="Porcentaje de Ahorro" value={`${savingsRate.toFixed(1)}%`} icon={<PiggyBankIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-emerald-500 to-green-600"/>
      </div>

      {goalsWithProgress.length > 0 && (
          <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                  <TargetIcon className="w-6 h-6 text-violet-400"/>
                  <h3 className="text-xl font-semibold">Metas Financieras</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {goalsWithProgress.map(goal => (
                      <GoalProgressCard key={goal.id} name={goal.name} currentAmount={goal.currentAmount} targetAmount={goal.targetAmount} />
                  ))}
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Rendimiento Mensual</h3>
            <CustomLineChart data={monthlyPerformanceData} lines={[ { dataKey: 'Ingresos', stroke: '#8b5cf6' }, { dataKey: 'Gastos', stroke: '#ec4899' }, { dataKey: 'Margen Neto', stroke: '#3b82f6' } ]} />
        </div>
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Distribución de Gastos</h3>
            <CustomPieChart data={expenseDistributionData} colors={pieChartColors} onSliceClick={handleChartClick} />
        </div>
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Gastos por Categoría</h3>
          <CustomBarChart data={expenseDistributionData} bars={[{ dataKey: 'value', fillColor: '#ec4899' }]} onBarClick={(catName) => handleChartClick({name: catName})} />
        </div>
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Ingresos por Categoría</h3>
          <CustomBarChart data={incomeByCategoryData} bars={[{ dataKey: 'value', fillColor: '#8b5cf6' }]} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;