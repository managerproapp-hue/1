import React, { createContext, useState, useContext, ReactNode, FC, useEffect } from 'react';
import { Transaction, Goal, Account } from '../types';

const STORAGE_KEY = 'budget-app-data';

const INITIAL_EXPENSE_CATEGORIES = [
  'Sin Categorizar', 'Gastos niñas', 'Supermercados', 'Gasolina', 'Seguros', 'Ropa / Otros', 'Teléfono / Internet', 'TV de Pago', 'Agua', 'Manutención', 'Prestamos', 'Luz', 'Mascotas', 'Ayuntamiento', 'Ahorros', 'Vivienda', 'Transporte', 'Comida',
];

const INITIAL_INCOME_CATEGORIES = [
    'Nómina', 'Ventas', 'Ingresos Varios'
];

interface AppState {
    allTransactions: Transaction[];
    expenseCategories: string[];
    incomeCategories: string[];
    goals: Goal[];
    accounts: Account[];
}

interface AppContextType {
    allTransactions: Transaction[];
    expenseCategories: string[];
    incomeCategories: string[];
    handleConfirmImport: (newTransactions: Transaction[]) => void;
    handleAddExpenseCategory: (category: string) => void;
    handleUpdateExpenseCategory: (oldCategory: string, newCategory: string) => void;
    handleDeleteExpenseCategory: (category: string) => void;
    handleAddIncomeCategory: (category: string) => void;
    handleUpdateIncomeCategory: (oldCategory: string, newCategory: string) => void;
    handleDeleteIncomeCategory: (category: string) => void;
    handleDownloadBackup: () => void;
    handleRestoreBackup: (file: File, callback: () => void) => void;
    handleAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    handleUpdateTransaction: (transaction: Transaction) => void;
    handleDeleteTransaction: (id: string) => void;
    goals: Goal[];
    handleAddGoal: (goal: Omit<Goal, 'id'>) => void;
    handleUpdateGoal: (goal: Goal) => void;
    handleDeleteGoal: (id: string) => void;
    accounts: Account[];
    handleAddAccount: (account: Omit<Account, 'id'>) => void;
    handleUpdateAccount: (account: Account) => void;
    handleDeleteAccount: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const loadInitialState = (): AppState => {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return {
                allTransactions: [],
                expenseCategories: INITIAL_EXPENSE_CATEGORIES,
                incomeCategories: INITIAL_INCOME_CATEGORIES,
                goals: [],
                accounts: [],
            };
        }
        const storedState = JSON.parse(serializedState);
        return {
            allTransactions: (storedState.allTransactions || []).map((tx: any) => ({ ...tx, date: new Date(tx.date) })),
            expenseCategories: storedState.expenseCategories || INITIAL_EXPENSE_CATEGORIES,
            incomeCategories: storedState.incomeCategories || INITIAL_INCOME_CATEGORIES,
            goals: storedState.goals || [],
            accounts: storedState.accounts || [],
        };
    } catch (error) {
        console.error("Could not load state from localStorage", error);
        return {
            allTransactions: [],
            expenseCategories: INITIAL_EXPENSE_CATEGORIES,
            incomeCategories: INITIAL_INCOME_CATEGORIES,
            goals: [],
            accounts: [],
        };
    }
};

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const initialState = loadInitialState();
    const [allTransactions, setAllTransactions] = useState<Transaction[]>(initialState.allTransactions);
    const [expenseCategories, setExpenseCategories] = useState<string[]>(initialState.expenseCategories);
    const [incomeCategories, setIncomeCategories] = useState<string[]>(initialState.incomeCategories);
    const [accounts, setAccounts] = useState<Account[]>(initialState.accounts);
    const [goals, setGoals] = useState<Goal[]>(initialState.goals);

    useEffect(() => {
        try {
            const stateToSave = {
                allTransactions,
                expenseCategories,
                incomeCategories,
                goals,
                accounts,
            };
            const serializedState = JSON.stringify(stateToSave);
            localStorage.setItem(STORAGE_KEY, serializedState);
        } catch (error) {
            console.error("Could not save state to localStorage", error);
        }
    }, [allTransactions, expenseCategories, incomeCategories, goals, accounts]);

    const handleConfirmImport = (newTransactions: Transaction[]) => {
        setAllTransactions(prev => [...prev, ...newTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        alert(`${newTransactions.length} transacciones importadas con éxito.`);
    };

    const handleAddExpenseCategory = (newCategory: string) => {
        const trimmed = newCategory.trim();
        if (trimmed && !expenseCategories.find(c => c.toLowerCase() === trimmed.toLowerCase())) {
            setExpenseCategories(prev => [...prev, trimmed].sort());
        } else {
            alert("La categoría no puede estar vacía o ya existe.");
        }
    };
    
    const handleUpdateExpenseCategory = (oldCategory: string, newCategory: string) => {
        const trimmedNew = newCategory.trim();
        if (!trimmedNew) {
            alert("El nombre de la categoría no puede estar vacío.");
            return;
        }
        if (oldCategory === 'Sin Categorizar') {
            alert('No se puede modificar la categoría por defecto.');
            return;
        }
        if (expenseCategories.find(c => c.toLowerCase() === trimmedNew.toLowerCase() && c.toLowerCase() !== oldCategory.toLowerCase())) {
            alert("Esa categoría ya existe.");
            return;
        }

        setExpenseCategories(prev => prev.map(c => (c === oldCategory ? trimmedNew : c)).sort());
        setAllTransactions(prev => prev.map(t => (t.category === oldCategory ? { ...t, category: trimmedNew } : t)));
        setGoals(prev => prev.map(g => (g.linkedCategory === oldCategory ? { ...g, linkedCategory: trimmedNew } : g)));
        alert(`Categoría de gasto "${oldCategory}" actualizada a "${trimmedNew}".`);
    };
  
    const handleDeleteExpenseCategory = (category: string) => {
        if (category === 'Sin Categorizar') {
            alert('No se puede eliminar la categoría por defecto.');
            return;
        }
        if (window.confirm(`¿Eliminar la categoría "${category}"? Las transacciones asociadas se moverán a "Sin Categorizar".`)) {
            setExpenseCategories(prev => prev.filter(c => c !== category));
            setAllTransactions(prev => prev.map(t => t.category === category ? {...t, category: 'Sin Categorizar'} : t));
        }
    };

    const handleAddIncomeCategory = (newCategory: string) => {
        const trimmed = newCategory.trim();
        if (trimmed && !incomeCategories.find(c => c.toLowerCase() === trimmed.toLowerCase())) {
            setIncomeCategories(prev => [...prev, trimmed].sort());
        } else {
            alert("La categoría no puede estar vacía o ya existe.");
        }
    };

    const handleUpdateIncomeCategory = (oldCategory: string, newCategory: string) => {
        const trimmedNew = newCategory.trim();
        if (!trimmedNew) {
            alert("El nombre de la categoría no puede estar vacío.");
            return;
        }
        if (incomeCategories.find(c => c.toLowerCase() === trimmedNew.toLowerCase() && c.toLowerCase() !== oldCategory.toLowerCase())) {
            alert("Esa categoría ya existe.");
            return;
        }
        setIncomeCategories(prev => prev.map(c => (c === oldCategory ? trimmedNew : c)).sort());
        setAllTransactions(prev => prev.map(t => (t.category === oldCategory ? { ...t, category: trimmedNew } : t)));
        alert(`Categoría de ingreso "${oldCategory}" actualizada a "${trimmedNew}".`);
    };

    const handleDeleteIncomeCategory = (category: string) => {
        const fallbackCategory = 'Ingresos Varios';
        if (!incomeCategories.includes(fallbackCategory)) {
             setIncomeCategories(prev => [...prev, fallbackCategory]);
        }
        if (window.confirm(`¿Eliminar la categoría "${category}"? Las transacciones asociadas se moverán a "${fallbackCategory}".`)) {
            setIncomeCategories(prev => prev.filter(c => c !== category));
            setAllTransactions(prev => prev.map(t => t.category === category ? {...t, category: fallbackCategory} : t));
        }
    };

    const handleDownloadBackup = () => {
        if (allTransactions.length === 0 && accounts.length === 0 && goals.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }
        const backupData = {
            lastUpdated: new Date().toISOString(),
            transactions: allTransactions,
            expenseCategories: expenseCategories,
            incomeCategories: incomeCategories,
            goals: goals,
            accounts: accounts,
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
                const transactionsToLoad = (data.transactions || []).map((tx: any) => ({ ...tx, date: new Date(tx.date) }));
                const expenseCategoriesToLoad = data.expenseCategories || INITIAL_EXPENSE_CATEGORIES;
                const incomeCategoriesToLoad = data.incomeCategories || INITIAL_INCOME_CATEGORIES;
                const goalsToLoad = data.goals || [];
                const accountsToLoad = data.accounts || [];

                setAllTransactions(transactionsToLoad);
                setExpenseCategories(expenseCategoriesToLoad);
                setIncomeCategories(incomeCategoriesToLoad);
                setGoals(goalsToLoad);
                setAccounts(accountsToLoad);

                alert(`Copia de seguridad restaurada. Última actualización: ${new Date(data.lastUpdated || Date.now()).toLocaleString()}`);
                callback(); 
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

    const handleAddAccount = (accountData: Omit<Account, 'id'>) => {
        const newAccount: Account = { ...accountData, id: crypto.randomUUID() };
        setAccounts(prev => [...prev, newAccount]);
    };

    const handleUpdateAccount = (updatedAccount: Account) => {
        const oldAccount = accounts.find(a => a.id === updatedAccount.id);
        if (oldAccount && oldAccount.accountName !== updatedAccount.accountName) {
            setAllTransactions(prev => 
                prev.map(t => 
                    t.source === oldAccount.accountName ? { ...t, source: updatedAccount.accountName } : t
                )
            );
        }
        setAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a));
        alert(`Cuenta "${oldAccount?.accountName || updatedAccount.accountName}" actualizada.`);
    };

    const handleDeleteAccount = (id: string) => {
        const accountToDelete = accounts.find(a => a.id === id);
        if (!accountToDelete) return;
    
        const transactionsInAccount = allTransactions.some(t => t.source === accountToDelete.accountName);
        if (transactionsInAccount) {
            alert(`No se puede eliminar la cuenta "${accountToDelete.accountName}" porque tiene transacciones asociadas. Por favor, primero mueva o elimine esas transacciones.`);
            return;
        }
        
        if (window.confirm(`¿Estás seguro de que quieres eliminar la cuenta "${accountToDelete.accountName}"?`)) {
            setAccounts(prev => prev.filter(a => a.id !== id));
        }
    };

    const value = {
        allTransactions,
        expenseCategories,
        incomeCategories,
        handleConfirmImport,
        handleAddExpenseCategory,
        handleUpdateExpenseCategory,
        handleDeleteExpenseCategory,
        handleAddIncomeCategory,
        handleUpdateIncomeCategory,
        handleDeleteIncomeCategory,
        handleDownloadBackup,
        handleRestoreBackup,
        handleAddTransaction,
        handleUpdateTransaction,
        handleDeleteTransaction,
        goals,
        handleAddGoal,
        handleUpdateGoal,
        handleDeleteGoal,
        accounts,
        handleAddAccount,
        handleUpdateAccount,
        handleDeleteAccount,
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