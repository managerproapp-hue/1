import React, { useMemo } from 'react';
import { Transaction, Account, TransactionType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { MetricCard } from '../MetricCard';
import { CustomBarChart } from '../charts/BarChart';
import { DollarSignIcon, TrendingDownIcon, TrendingUpIcon } from '../icons';

interface AccountMetrics {
    income: number;
    expenses: number;
    netMargin: number;
    transactionCount: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const AccountComparisonView: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const { accounts } = useAppContext();

    const accountData = useMemo(() => {
        const dataByAccount: Map<string, AccountMetrics> = new Map();

        // Initialize all accounts from context to ensure they appear even with 0 transactions
        accounts.forEach(acc => {
            dataByAccount.set(acc.accountName, {
                income: 0,
                expenses: 0,
                netMargin: 0,
                transactionCount: 0
            });
        });
        
        // Populate with transaction data
        transactions.forEach(t => {
            const accountName = t.source || 'Sin Asignar';
            if (!dataByAccount.has(accountName)) {
                 dataByAccount.set(accountName, { income: 0, expenses: 0, netMargin: 0, transactionCount: 0 });
            }
            
            const current = dataByAccount.get(accountName)!;
            if (t.type === TransactionType.INCOME) {
                current.income += t.amount;
            } else {
                current.expenses += t.amount;
            }
            current.transactionCount++;
        });

        // Calculate net margin for each
        dataByAccount.forEach(data => {
            data.netMargin = data.income - data.expenses;
        });
        
        return dataByAccount;
    }, [transactions, accounts]);
    
    const consolidatedMetrics = useMemo(() => {
        let totalIncome = 0;
        let totalExpenses = 0;
        accountData.forEach(data => {
            totalIncome += data.income;
            totalExpenses += data.expenses;
        });
        return {
            totalIncome,
            totalExpenses,
            netMargin: totalIncome - totalExpenses,
        };
    }, [accountData]);
    
    const chartData = useMemo(() => {
        return Array.from(accountData.entries())
            .filter(([, metrics]) => metrics.transactionCount > 0)
            .map(([accountName, metrics]) => ({
                name: accountName,
                Ingresos: metrics.income,
                Gastos: metrics.expenses,
            }));
    }, [accountData]);

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-4">Resumen Consolidado</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard title="Ingresos Totales" value={formatCurrency(consolidatedMetrics.totalIncome)} icon={<TrendingUpIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-violet-500 to-purple-600"/>
                    <MetricCard title="Gastos Totales" value={formatCurrency(consolidatedMetrics.totalExpenses)} icon={<TrendingDownIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-pink-500 to-rose-600"/>
                    <MetricCard title="Margen Neto Total" value={formatCurrency(consolidatedMetrics.netMargin)} icon={<DollarSignIcon className="w-6 h-6 text-white"/>} colorClass="bg-gradient-to-br from-blue-500 to-sky-600"/>
                </div>
            </div>

            <div className="space-y-4">
                 <h2 className="text-2xl font-semibold mt-8 mb-4">Desglose por Cuenta</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from(accountData.entries()).map(([accountName, metrics]) => (
                        <div key={accountName} className="bg-slate-800 p-6 rounded-xl shadow-lg">
                            <h3 className="text-xl font-semibold mb-3 truncate">{accountName}</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-emerald-400">
                                    <span>Ingresos:</span>
                                    <span className="font-bold">{formatCurrency(metrics.income)}</span>
                                </div>
                                <div className="flex justify-between items-center text-rose-400">
                                    <span>Gastos:</span>
                                    <span className="font-bold">{formatCurrency(metrics.expenses)}</span>
                                </div>
                                <hr className="border-slate-700"/>
                                <div className={`flex justify-between items-center ${metrics.netMargin >= 0 ? 'text-sky-400' : 'text-amber-400'}`}>
                                    <span>Margen Neto:</span>
                                    <span className="font-bold">{formatCurrency(metrics.netMargin)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-4">Gráfico Comparativo de Cuentas</h2>
                <CustomBarChart 
                    data={chartData} 
                    bars={[
                        { dataKey: 'Ingresos', fillColor: '#8b5cf6' },
                        { dataKey: 'Gastos', fillColor: '#ec4899' }
                    ]} 
                />
            </div>
        </div>
    );
};

export default AccountComparisonView;