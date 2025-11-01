import React, { useMemo } from 'react';
import { TransactionType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { CustomBarChart } from '../charts/BarChart';

const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface AnalysisViewProps {
    selectedYears: number[];
    month: number | 'all';
    selectedAccountId: string | 'all';
}

type ChartMode = 'monthlyBreakdown' | 'yearlyTotalComparison' | 'yearlyMonthComparison';

const AnalysisView: React.FC<AnalysisViewProps> = ({ selectedYears, month, selectedAccountId }) => {
    const { allTransactions, categories } = useAppContext();
    const monthNames = useMemo(() => ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"], []);
    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    
    const expenseRootCategories = useMemo(() => categories.filter(c => c.type === TransactionType.EXPENSE && c.parentId === null), [categories]);

    const getRootCategoryId = (id: string): string => {
        let current = categoryMap.get(id);
        while (current && current.parentId) {
            current = categoryMap.get(current.parentId);
        }
        return current ? current.id : id;
    };
    
    const transactionsForAnalysis = useMemo(() => {
        let filtered = allTransactions;
        if (selectedAccountId !== 'all') {
            filtered = filtered.filter(t => t.accountId === selectedAccountId);
        }
        return filtered.filter(t => selectedYears.includes(t.date.getFullYear()));
    }, [allTransactions, selectedAccountId, selectedYears]);

    const chartMode: ChartMode = useMemo(() => {
        if (selectedYears.length === 1) return 'monthlyBreakdown';
        return month === 'all' ? 'yearlyTotalComparison' : 'yearlyMonthComparison';
    }, [selectedYears, month]);

    const chartDataByRootCategory = useMemo(() => {
        const data: { [rootCatId: string]: { name: string; Gasto: number }[] } = {};

        expenseRootCategories.forEach(rootCat => {
            if (chartMode === 'monthlyBreakdown') {
                data[rootCat.id] = monthNames.map(m => ({ name: m, Gasto: 0 }));
            } else {
                data[rootCat.id] = selectedYears.sort((a,b) => a - b).map(y => ({ name: String(y), Gasto: 0 }));
            }
        });

        transactionsForAnalysis
            .filter(t => t.type === TransactionType.EXPENSE)
            .forEach(t => {
                const rootId = getRootCategoryId(t.categoryId);
                if (!data[rootId]) return;

                if (chartMode === 'monthlyBreakdown') {
                    const monthIndex = t.date.getMonth();
                    data[rootId][monthIndex].Gasto += t.amount;
                } else {
                    if (chartMode === 'yearlyMonthComparison' && t.date.getMonth() !== month) return;
                    const year = String(t.date.getFullYear());
                    const yearData = data[rootId].find(d => d.name === year);
                    if (yearData) yearData.Gasto += t.amount;
                }
            });
            
        return data;
    }, [transactionsForAnalysis, expenseRootCategories, chartMode, month, monthNames, selectedYears, getRootCategoryId]);

    const totalSpendByRootCategory = useMemo(() => {
        const totals: { [key: string]: number } = {};
        expenseRootCategories.forEach(cat => {
            totals[cat.id] = chartDataByRootCategory[cat.id]?.reduce((sum, item) => sum + item.Gasto, 0) || 0;
        });
        return totals;
    }, [expenseRootCategories, chartDataByRootCategory]);
    
    const sortedRootCategories = useMemo(() => {
        return expenseRootCategories
            .filter(cat => totalSpendByRootCategory[cat.id] > 0)
            .sort((a, b) => totalSpendByRootCategory[b.id] - totalSpendByRootCategory[a.id]);
    }, [expenseRootCategories, totalSpendByRootCategory]);

    const getChartTitle = (categoryName: string) => {
        switch(chartMode) {
            case 'monthlyBreakdown': return `Evolución Mensual de ${categoryName} en ${selectedYears[0]}`;
            case 'yearlyTotalComparison': return `Comparación Anual de ${categoryName}`;
            case 'yearlyMonthComparison': return `Comparación de ${monthNames[month as number]} para ${categoryName}`;
        }
    };
    
    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-6">Análisis de Gastos por Categoría</h2>
            <div className="space-y-4">
                {sortedRootCategories.length === 0 && <p className="text-center text-gray-500 py-8">No hay datos de gastos para el período seleccionado.</p>}
                {sortedRootCategories.map(category => (
                    <details key={category.id} className="bg-slate-700/50 rounded-lg overflow-hidden transition-all duration-300">
                        <summary className="p-4 cursor-pointer hover:bg-slate-600/50 flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold text-white text-lg">{category.name}</h4>
                                <span className="text-sm text-gray-300 mt-1">Total en período: <span className="font-bold text-violet-300">{formatCurrency(totalSpendByRootCategory[category.id])}</span></span>
                            </div>
                            <span className="text-gray-400 text-xs transform transition-transform details-arrow">▼</span>
                        </summary>
                        <div className="p-4 bg-slate-800">
                            <h5 className="font-semibold mb-2">{getChartTitle(category.name)}</h5>
                            <CustomBarChart data={chartDataByRootCategory[category.id] || []} bars={[{ dataKey: 'Gasto', fillColor: '#ec4899' }]} />
                        </div>
                    </details>
                ))}
            </div>
            <style>{` details > summary { list-style: none; } details > summary::-webkit-details-marker { display: none; } details[open] .details-arrow { transform: rotate(180deg); } `}</style>
        </div>
    );
};
export default AnalysisView;