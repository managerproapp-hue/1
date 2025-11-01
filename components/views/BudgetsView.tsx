import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { CustomBarChart } from '../charts/BarChart';

const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const AnalysisView: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const { expenseCategories } = useAppContext();

    const dataByCategory = useMemo(() => {
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        
        const categoryData: { 
            [key: string]: { 
                total: number, 
                monthlyData: { name: string, Gasto: number }[] 
            } 
        } = {};

        // Initialize all categories
        expenseCategories.forEach(cat => {
            categoryData[cat] = {
                total: 0,
                monthlyData: monthNames.map(m => ({ name: m, Gasto: 0 }))
            };
        });

        // Populate with data from transactions for the selected year
        transactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .forEach(t => {
                const category = t.category;
                const monthIndex = t.date.getMonth();

                if (categoryData[category]) {
                    categoryData[category].total += t.amount;
                    categoryData[category].monthlyData[monthIndex].Gasto += t.amount;
                }
            });
        
        return categoryData;

    }, [transactions, expenseCategories]);

    const sortedCategories = useMemo(() => {
        return expenseCategories
            .filter(cat => dataByCategory[cat]?.total > 0)
            .sort((a, b) => (dataByCategory[b]?.total || 0) - (dataByCategory[a]?.total || 0));
    }, [expenseCategories, dataByCategory]);

    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                 <h2 className="text-2xl font-semibold">Análisis Detallado de Gastos</h2>
                 <p className="text-sm text-gray-400">Datos para el año seleccionado.</p>
            </div>
            <p className="text-gray-400 mb-6">Expande cada categoría para ver un desglose de tus gastos mes a mes durante el año seleccionado. Esto te ayudará a identificar tendencias y picos de gasto inesperados.</p>
            
            <div className="space-y-4">
                {sortedCategories.map(category => {
                    const categoryInfo = dataByCategory[category];
                    const monthlyAverage = categoryInfo.total / 12;

                    return (
                        <details key={category} className="bg-slate-700/50 rounded-lg overflow-hidden transition-all duration-300">
                            <summary className="p-4 cursor-pointer hover:bg-slate-600/50 flex justify-between items-center">
                                <div>
                                    <h4 className="font-semibold text-white text-lg">{category}</h4>
                                    <div className="flex items-center space-x-4 text-sm text-gray-300 mt-1">
                                        <span>Total Anual: <span className="font-bold text-violet-300">{formatCurrency(categoryInfo.total)}</span></span>
                                        <span>Promedio Mensual: <span className="font-bold text-sky-300">{formatCurrency(monthlyAverage)}</span></span>
                                    </div>
                                </div>
                                <span className="text-gray-400 text-xs transform transition-transform details-arrow">▼</span>
                            </summary>
                            <div className="p-4 bg-slate-800">
                                <h5 className="font-semibold mb-2">Evolución Mensual de {category}</h5>
                                <CustomBarChart 
                                    data={categoryInfo.monthlyData}
                                    bars={[{ dataKey: 'Gasto', fillColor: '#ec4899' }]}
                                />
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
