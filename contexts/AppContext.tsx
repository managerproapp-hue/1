import React, { createContext, useState, useContext, ReactNode, FC } from 'react';
import { Transaction, Goal } from '../types';

const INITIAL_EXPENSE_CATEGORIES = [
  'Sin Categorizar', 'Gastos niñas', 'Supermercados', 'Gasolina', 'Seguros', 'Ropa / Otros', 'Teléfono / Internet', 'TV de Pago', 'Agua', 'Manutención', 'Prestamos', 'Luz', 'Mascotas', 'Ayuntamiento', 'Ahorros', 'Vivienda', 'Transporte', 'Comida',
];

interface AppContextType {
    allTransactions: Transaction[];
    expenseCategories: string[];
    handleConfirmImport: (newTransactions: Transaction[]) => void;
    handleAddCategory: (category: string) => void;
    handleDeleteCategory: (category: string) => void;
    handleDownloadBackup: () => void;
    handleRestoreBackup: (file: File, callback: () => void) => void;
    handleAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    handleUpdateTransaction: (transaction: Transaction) => void;
    handleDeleteTransaction: (id: string) => void;
    goals: Goal[];
    handleAddGoal: (goal: Omit<Goal, 'id'>) => void;
    handleUpdateGoal: (goal: Goal) => void;
    handleDeleteGoal: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<string[]>(INITIAL_EXPENSE_CATEGORIES);
    const [goals, setGoals] = useState<Goal[]>([
        { id: 'goal-1', name: 'Fondo de Emergencia', targetAmount: 3000, linkedCategory: 'Ahorros' },
        { id: 'goal-2', name: 'Vacaciones Verano 2025', targetAmount: 1500, linkedCategory: 'Ahorros' },
    ]);

    const handleConfirmImport = (newTransactions: Transaction[]) => {
        setAllTransactions(prev => [...prev, ...newTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        alert(`${newTransactions.length} transacciones importadas con éxito.`);
    };

    const handleAddCategory = (newCategory: string) => {
        const trimmed = newCategory.trim();
        if (trimmed && !expenseCategories.find(c => c.toLowerCase() === trimmed.toLowerCase())) {
            setExpenseCategories(prev => [...prev, trimmed].sort());
        } else {
            alert("La categoría no puede estar vacía o ya existe.");
        }
    };
  
    const handleDeleteCategory = (category: string) => {
        if (category === 'Sin Categorizar') {
            alert('No se puede eliminar la categoría por defecto.');
            return;
        }
        if (window.confirm(`¿Eliminar la categoría "${category}"? Las transacciones asociadas no se eliminarán pero podrían necesitar ser recategorizadas.`)) {
            setExpenseCategories(prev => prev.filter(c => c !== category));
        }
    };

    const handleDownloadBackup = () => {
        if (allTransactions.length === 0) {
            alert("No hay transacciones para exportar.");
            return;
        }
        const backupData = {
            lastUpdated: new Date().toISOString(),
            transactions: allTransactions,
            categories: expenseCategories,
            goals: goals,
        };
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(url);
        link.remove();
    };

    const handleRestoreBackup = (file: File, callback: () => void) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                const transactionsToLoad = (data.transactions || data).map((tx: any) => ({ ...tx, date: new Date(tx.date) }));
                const categoriesToLoad = data.categories || INITIAL_EXPENSE_CATEGORIES;
                const goalsToLoad = data.goals || [];
                setAllTransactions(transactionsToLoad);
                setExpenseCategories(categoriesToLoad);
                setGoals(goalsToLoad);
                alert(`Copia de seguridad restaurada. Última actualización: ${new Date(data.lastUpdated || Date.now()).toLocaleString()}`);
                callback(); // Navigate back to dashboard on success
            } catch (error) {
                console.error("Backup restore error:", error);
                alert("Error al procesar el archivo de copia de seguridad.");
            }
        };
        reader.readAsText(file);
    };

    const handleAddTransaction = (transaction: Omit<Transaction, 'id'>) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: crypto.randomUUID(),
        };
        setAllTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const handleUpdateTransaction = (updatedTransaction: Transaction) => {
        setAllTransactions(prev =>
            prev.map(t => (t.id === updatedTransaction.id ? updatedTransaction : t))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
    };

    const handleDeleteTransaction = (id: string) => {
        setAllTransactions(prev => prev.filter(t => t.id !== id));
    };

    const handleAddGoal = (goalData: Omit<Goal, 'id'>) => {
        const newGoal: Goal = { ...goalData, id: crypto.randomUUID() };
        setGoals(prev => [...prev, newGoal]);
    };

    const handleUpdateGoal = (updatedGoal: Goal) => {
        setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    };

    const handleDeleteGoal = (id: string) => {
        setGoals(prev => prev.filter(g => g.id !== id));
    };

    const value = {
        allTransactions,
        expenseCategories,
        handleConfirmImport,
        handleAddCategory,
        handleDeleteCategory,
        handleDownloadBackup,
        handleRestoreBackup,
        handleAddTransaction,
        handleUpdateTransaction,
        handleDeleteTransaction,
        goals,
        handleAddGoal,
        handleUpdateGoal,
        handleDeleteGoal,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
