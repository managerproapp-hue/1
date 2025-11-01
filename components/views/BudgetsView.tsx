import React, { useMemo } from 'react';
import { TransactionType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { CustomBarChart } from '../charts/BarChart';

const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface AnalysisViewProps {
    selectedYears: number[];
    month: number | 'all';
}

type ChartMode = 'monthlyBreakdown' | 'yearlyTotalComparison' | 'yearlyMonthComparison';

const AnalysisView: React.FC<AnalysisViewProps> = ({ selectedYears, month }) => {
    const { allTransactions, expenseCategories } = useAppContext();
    const monthNames = useMemo(() => ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"], []);

    const chartMode: ChartMode = useMemo(() => {
        if (selectedYears.length === 1) {
            return 'monthlyBreakdown';
        }
        if (selectedYears.length > 1) {
            return month === 'all' ? 'yearlyTotalComparison' : 'yearlyMonthComparison';
        }
        return 'monthlyBreakdown'; // Fallback
    }, [selectedYears, month]);

    const chartDataByCategory = useMemo(() => {
        const data: { [category: string]: { name: string; Gasto: number }[] } = {};

        // Pre-filter transactions to only what's needed for the selected years/month
        const relevantTransactions = allTransactions.filter(t => 
            t.type === TransactionType.EXPENSE &&
            selectedYears.includes(t.date.getFullYear())
        );

        expenseCategories.forEach(cat => {
            if (chartMode === 'monthlyBreakdown') {
                const year = selectedYears[0];
                data[cat] = monthNames.map(m => ({ name: m, Gasto: 0 }));
                relevantTransactions
                    .filter(t => t.category === cat && t.date.getFullYear() === year)
                    .forEach(t => {
                        const monthIndex = t.date.getMonth();
                        data[cat][monthIndex].Gasto += t.amount;
                    });
            } else { // yearlyTotalComparison or yearlyMonthComparison
                data[cat] = selectedYears.sort((a,b) => a - b).map(y => ({ name: String(y), Gasto: 0 }));
                 relevantTransactions
                    .filter(t => {
                        if (t.category !== cat) return false;
                        if (chartMode === 'yearlyMonthComparison' && t.date.getMonth() !== month) return false;
                        return true;
                    })
                    .forEach(t => {
                        const year = t.date.getFullYear();
                        const yearData = data[cat].find(d => d.name === String(year));
                        if (yearData) {
                            yearData.Gasto += t.amount;
                        }
                    });
            }
        });
        return data;
    }, [allTransactions, expenseCategories, selectedYears, month, chartMode, monthNames]);

    const totalSpendByCategory = useMemo(() => {
        const totals: { [key: string]: number } = {};
        expenseCategories.forEach(cat => {
            totals[cat] = chartDataByCategory[cat]?.reduce((sum, item) => sum + item.Gasto, 0) || 0;
        });
        return totals;
    }, [expenseCategories, chartDataByCategory]);
    
    const sortedCategories = useMemo(() => {
        return expenseCategories
            .filter(cat => totalSpendByCategory[cat] > 0)
            .sort((a, b) => totalSpendByCategory[b] - totalSpendByCategory[a]);
    }, [expenseCategories, totalSpendByCategory]);

    const getChartTitle = (category: string) => {
        switch(chartMode) {
            case 'monthlyBreakdown':
                return `Evolución Mensual de ${category} en ${selectedYears[0]}`;
            case 'yearlyTotalComparison':
                return `Comparación Anual de ${category}`;
            case 'yearlyMonthComparison':
                return `Comparación de ${monthNames[month as number]} para ${category}`;
        }
    };
    
    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-2">
                 <h2 className="text-2xl font-semibold">Análisis de Gastos por Categoría</h2>
            </div>
            
            <div className="space-y-4">
                {sortedCategories.length === 0 && <p className="text-center text-gray-500 py-8">No hay datos de gastos para el período seleccionado.</p>}
                {sortedCategories.map(category => (
                    <details key={category} className="bg-slate-700/50 rounded-lg overflow-hidden transition-all duration-300">
                        <summary className="p-4 cursor-pointer hover:bg-slate-600/50 flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold text-white text-lg">{category}</h4>
                                <div className="flex items-center space-x-4 text-sm text-gray-300 mt-1">
                                    <span>Total en período: <span className="font-bold text-violet-300">{formatCurrency(totalSpendByCategory[category])}</span></span>
                                </div>
                            </div>
                            <span className="text-gray-400 text-xs transform transition-transform details-arrow">▼</span>
                        </summary>
                        <div className="p-4 bg-slate-800">
                            <h5 className="font-semibold mb-2">{getChartTitle(category)}</h5>
                            <CustomBarChart 
                                data={chartDataByCategory[category] || []}
                                bars={[{ dataKey: 'Gasto', fillColor: '#ec4899' }]}
                            />
                        </div>
                    </details>
                ))}
            </div>
            <style>{`
                details > summary { list-style: none; }
                details > summary::-webkit-details-marker { display: none; }
                details[open] .details-arrow { transform: rotate(180deg); }
            `}</style>
        </div>
    );
};

export default AnalysisView;