import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { CustomBarChart } from '../charts/BarChart';

const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface AnalysisViewProps {
    transactions: Transaction[];
    month: number | 'all';
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ transactions, month }) => {
    const { expenseCategories, allTransactions } = useAppContext();

    const monthlyDataByCategory = useMemo(() => {
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const categoryData: { 
            [key: string]: { total: number; monthlyData: { name: string; Gasto: number }[] } 
        } = {};

        expenseCategories.forEach(cat => {
            categoryData[cat] = { total: 0, monthlyData: monthNames.map(m => ({ name: m, Gasto: 0 })) };
        });

        transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
            const category = t.category;
            const monthIndex = t.date.getMonth();
            if (categoryData[category]) {
                categoryData[category].total += t.amount;
                categoryData[category].monthlyData[monthIndex].Gasto += t.amount;
            }
        });
        
        return categoryData;
    }, [transactions, expenseCategories]);
    
    const yearlyComparisonData = useMemo(() => {
        const data: { [category: string]: { name: string; Gasto: number }[] } = {};
        const availableYears = [...new Set(allTransactions.map(t => t.date.getFullYear()))].sort();

        expenseCategories.forEach(cat => {
            data[cat] = availableYears.map(year => ({ name: String(year), Gasto: 0 }));
        });

        allTransactions.forEach(t => {
            if (t.type === TransactionType.EXPENSE) {
                const year = t.date.getFullYear();
                const category = t.category;
                const categoryYearData = data[category]?.find(d => d.name === String(year));
                if (categoryYearData) {
                    categoryYearData.Gasto += t.amount;
                }
            }
        });
        return data;
    }, [allTransactions, expenseCategories]);

    const sortedCategories = useMemo(() => {
        return expenseCategories
            .filter(cat => monthlyDataByCategory[cat]?.total > 0)
            .sort((a, b) => (monthlyDataByCategory[b]?.total || 0) - (monthlyDataByCategory[a]?.total || 0));
    }, [expenseCategories, monthlyDataByCategory]);

    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                 <h2 className="text-2xl font-semibold">Análisis Detallado de Gastos</h2>
                 <p className="text-sm text-gray-400">{month === 'all' ? 'Mostrando comparación anual' : 'Mostrando desglose mensual del año'}</p>
            </div>
            <p className="text-gray-400 mb-6">
                Expande cada categoría. Si has seleccionado "Anual", verás una comparación año a año. Si has seleccionado un mes, verás el desglose mensual para el año en curso.
            </p>
            
            <div className="space-y-4">
                {sortedCategories.map(category => {
                    const categoryInfo = monthlyDataByCategory[category];
                    const monthlyAverage = categoryInfo.total / 12;

                    return (
                        <details key={category} className="bg-slate-700/50 rounded-lg overflow-hidden transition-all duration-300">
                            <summary className="p-4 cursor-pointer hover:bg-slate-600/50 flex justify-between items-center">
                                <div>
                                    <h4 className="font-semibold text-white text-lg">{category}</h4>
                                    <div className="flex items-center space-x-4 text-sm text-gray-300 mt-1">
                                        <span>Total ({transactions[0]?.date.getFullYear() || 'Año'}): <span className="font-bold text-violet-300">{formatCurrency(categoryInfo.total)}</span></span>
                                        <span>Promedio Mensual: <span className="font-bold text-sky-300">{formatCurrency(monthlyAverage)}</span></span>
                                    </div>
                                </div>
                                <span className="text-gray-400 text-xs transform transition-transform details-arrow">▼</span>
                            </summary>
                            <div className="p-4 bg-slate-800">
                                {month === 'all' ? (
                                    <>
                                        <h5 className="font-semibold mb-2">Comparación Anual de {category}</h5>
                                        <CustomBarChart 
                                            data={yearlyComparisonData[category] || []}
                                            bars={[{ dataKey: 'Gasto', fillColor: '#8b5cf6' }]}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <h5 className="font-semibold mb-2">Evolución Mensual de {category}</h5>
                                        <CustomBarChart 
                                            data={categoryInfo.monthlyData}
                                            bars={[{ dataKey: 'Gasto', fillColor: '#ec4899' }]}
                                        />
                                    </>
                                )}
                            </div>
                        </details>
                    );
                })}
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