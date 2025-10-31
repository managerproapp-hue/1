import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, ChartData } from '../types';
import { MetricCard } from './MetricCard';
import { CustomBarChart } from './charts/BarChart';
import { CustomLineChart } from './charts/LineChart';
import { CustomPieChart } from './charts/PieChart';
import { DollarSignIcon, PiggyBankIcon, SparklesIcon, SpinnerIcon, TrendingDownIcon, TrendingUpIcon } from './icons';
import { GoogleGenAI } from '@google/genai';

interface DashboardProps {
  transactions: Transaction[];
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [summaryError, setSummaryError] = useState('');

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
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
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
  
  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setAiSummary('');
    setSummaryError('');

    const prompt = `
      Eres un asesor financiero amigable y servicial que se comunica en español.
      Basado en los siguientes datos financieros para un período específico, proporciona un análisis conciso y útil.

      **Métricas Clave:**
      - Ingresos Totales: ${formatCurrency(totalIncome)}
      - Gastos Totales: ${formatCurrency(totalExpenses)}
      - Margen Neto (Ahorro): ${formatCurrency(netMargin)}
      - Tasa de Ahorro: ${savingsRate.toFixed(1)}%

      **Top 5 Gastos por Categoría:**
      ${expenseDistributionData.slice(0, 5).map(d => `- ${d.name}: ${formatCurrency(d.value as number)}`).join('\n')}

      **Tu Tarea:**
      1.  Escribe un resumen de 2 a 3 frases sobre la salud financiera general durante este período.
      2.  Identifica la categoría con el mayor gasto y haz un breve comentario al respecto.
      3.  Ofrece un consejo práctico y positivo basado en los datos para mejorar la situación.
      4.  Mantén un tono alentador y fácil de entender. Usa saltos de línea para separar los puntos.
      `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        setAiSummary(response.text);
    } catch (error) {
        console.error("Error generando resumen de IA:", error);
        setSummaryError('No se pudo generar el resumen. Inténtelo de nuevo.');
    } finally {
        setIsGenerating(false);
    }
  };


  const pieChartColors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total de Ingresos" value={formatCurrency(totalIncome)} icon={<TrendingUpIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-violet-500 to-purple-600"/>
        <MetricCard title="Total de Gastos" value={formatCurrency(totalExpenses)} icon={<TrendingDownIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-pink-500 to-rose-600"/>
        <MetricCard title="Margen Neto" value={formatCurrency(netMargin)} icon={<DollarSignIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-blue-500 to-sky-600"/>
        <MetricCard title="Porcentaje de Ahorro" value={`${savingsRate.toFixed(1)}%`} icon={<PiggyBankIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-emerald-500 to-green-600"/>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Resumen Financiero con IA</h3>
        {aiSummary ? (
            <div className="text-gray-300 whitespace-pre-wrap font-sans">{aiSummary}</div>
        ) : (
            <div className="text-center text-gray-400 py-4">
                {isGenerating ? (
                    <div className="flex flex-col items-center">
                        <SpinnerIcon className="w-8 h-8 text-violet-400 animate-spin mb-2" />
                        <span>Analizando tus datos...</span>
                    </div>
                ) : (
                    <>
                        <p className="mb-4">Obtén un análisis y consejos personalizados sobre tus finanzas para este período.</p>
                         <button onClick={handleGenerateSummary} disabled={transactions.length === 0} className="flex items-center justify-center mx-auto space-x-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">
                            <SparklesIcon className="w-5 h-5" />
                            <span>Generar Resumen</span>
                        </button>
                    </>
                )}
                {summaryError && <p className="text-rose-400 mt-4">{summaryError}</p>}
            </div>
        )}
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