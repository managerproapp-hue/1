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

interface ActionResult {
    success: boolean;
    message?: string;
}

interface AppContextType {
    allTransactions: Transaction[];
    expenseCategories: string[];
    incomeCategories: string[];
    handleConfirmImport: (newTransactions: Transaction[]) => ActionResult;
    handleAddExpenseCategory: (category: string) => ActionResult;
    handleUpdateExpenseCategory: (oldCategory: string, newCategory: string) => ActionResult;
    handleDeleteExpenseCategory: (category: string) => void;
    handleAddIncomeCategory: (category: string) => ActionResult;
    handleUpdateIncomeCategory: (oldCategory: string, newCategory: string) => ActionResult;
    handleDeleteIncomeCategory: (category: string) => void;
    handleDownloadBackup: () => ActionResult;
    handleRestoreBackup: (file: File, callback: (result: ActionResult) => void) => void;
    handleAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    handleUpdateTransaction: (transaction: Transaction) => void;
    handleDeleteTransaction: (id: string) => void;
    goals: Goal[];
    handleAddGoal: (goal: Omit<Goal, 'id'>) => void;
    handleUpdateGoal: (goal: Goal) => void;
    handleDeleteGoal: (id: string) => void;
    accounts: Account[];
    handleAddAccount: (account: Omit<Account, 'id'>) => void;
    handleUpdateAccount: (account: Account) => ActionResult;
    handleDeleteAccount: (id: string) => ActionResult;
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
        const loadedAccounts = storedState.accounts || [];
        
        const loadedTransactions = (storedState.allTransactions || []).map((tx: any) => {
            if (tx.source && !tx.accountId) {
                const matchingAccount = loadedAccounts.find((acc: Account) => acc.accountName === tx.source);
                tx.accountId = matchingAccount ? matchingAccount.id : (loadedAccounts[0]?.id || 'unassigned');
            }
            delete tx.source;
            return { ...tx, date: new Date(tx.date) };
        });

        return {
            allTransactions: loadedTransactions,
            expenseCategories: storedState.expenseCategories || INITIAL_EXPENSE_CATEGORIES,
            incomeCategories: storedState.incomeCategories || INITIAL_INCOME_CATEGORIES,
            goals: storedState.goals || [],
            accounts: loadedAccounts,
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

    const handleConfirmImport = (newTransactions: Transaction[]): ActionResult => {
        setAllTransactions(prev => [...prev, ...newTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        return { success: true, message: `${newTransactions.length} transacciones importadas con éxito.` };
    };

    const handleAddExpenseCategory = (newCategory: string): ActionResult => {
        const trimmed = newCategory.trim();
        if (trimmed && !expenseCategories.find(c => c.toLowerCase() === trimmed.toLowerCase())) {
            setExpenseCategories(prev => [...prev, trimmed].sort());
            return { success: true };
        }
        return { success: false, message: "La categoría no puede estar vacía o ya existe." };
    };
    
    const handleUpdateExpenseCategory = (oldCategory: string, newCategory: string): ActionResult => {
        const trimmedNew = newCategory.trim();
        if (!trimmedNew) return { success: false, message: "El nombre de la categoría no puede estar vacío." };
        if (oldCategory === 'Sin Categorizar') return { success: false, message: 'No se puede modificar la categoría por defecto.' };
        if (expenseCategories.find(c => c.toLowerCase() === trimmedNew.toLowerCase() && c.toLowerCase() !== oldCategory.toLowerCase())) {
            return { success: false, message: "Esa categoría ya existe." };
        }

        setExpenseCategories(prev => prev.map(c => (c === oldCategory ? trimmedNew : c)).sort());
        setAllTransactions(prev => prev.map(t => (t.category === oldCategory ? { ...t, category: trimmedNew } : t)));
        setGoals(prev => prev.map(g => (g.linkedCategory === oldCategory ? { ...g, linkedCategory: trimmedNew } : g)));
        return { success: true, message: `Categoría "${oldCategory}" actualizada a "${trimmedNew}".` };
    };
  
    const handleDeleteExpenseCategory = (category: string) => {
        setExpenseCategories(prev => prev.filter(c => c !== category));
        setAllTransactions(prev => prev.map(t => t.category === category ? {...t, category: 'Sin Categorizar'} : t));
    };

    const handleAddIncomeCategory = (newCategory: string): ActionResult => {
        const trimmed = newCategory.trim();
        if (trimmed && !incomeCategories.find(c => c.toLowerCase() === trimmed.toLowerCase())) {
            setIncomeCategories(prev => [...prev, trimmed].sort());
            return { success: true };
        }
        return { success: false, message: "La categoría no puede estar vacía o ya existe." };
    };

    const handleUpdateIncomeCategory = (oldCategory: string, newCategory: string): ActionResult => {
        const trimmedNew = newCategory.trim();
        if (!trimmedNew) return { success: false, message: "El nombre de la categoría no puede estar vacío." };
        if (incomeCategories.find(c => c.toLowerCase() === trimmedNew.toLowerCase() && c.toLowerCase() !== oldCategory.toLowerCase())) {
            return { success: false, message: "Esa categoría ya existe." };
        }
        setIncomeCategories(prev => prev.map(c => (c === oldCategory ? trimmedNew : c)).sort());
        setAllTransactions(prev => prev.map(t => (t.category === oldCategory ? { ...t, category: trimmedNew } : t)));
        return { success: true, message: `Categoría "${oldCategory}" actualizada a "${trimmedNew}".` };
    };

    const handleDeleteIncomeCategory = (category: string) => {
        const fallbackCategory = 'Ingresos Varios';
        if (!incomeCategories.includes(fallbackCategory)) {
             setIncomeCategories(prev => [...prev, fallbackCategory]);
        }
        setIncomeCategories(prev => prev.filter(c => c !== category));
        setAllTransactions(prev => prev.map(t => t.category === category ? {...t, category: fallbackCategory} : t));
    };

    const handleDownloadBackup = (): ActionResult => {
        if (allTransactions.length === 0 && accounts.length === 0 && goals.length === 0) {
            return { success: false, message: "No hay datos para exportar." };
        }
        try {
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
            return { success: true, message: "Copia de seguridad descargada." };
        } catch (error) {
            console.error("Backup download error:", error);
            return { success: false, message: "Error al generar la copia de seguridad." };
        }
    };

    const handleRestoreBackup = (file: File, callback: (result: ActionResult) => void) => {
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
                
                callback({ success: true, message: `Copia restaurada con éxito.`});
            } catch (error) {
                console.error("Backup restore error:", error);
                callback({ success: false, message: "Error al procesar el archivo." });
            }
        };
        reader.readAsText(file);
    };

    const handleAddTransaction = (transaction: Omit<Transaction, 'id'>) => {
        const newTransaction: Transaction = { ...transaction, id: crypto.randomUUID() };
        setAllTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const handleUpdateTransaction = (updatedTransaction: Transaction) => {
        setAllTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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

    const handleUpdateAccount = (updatedAccount: Account): ActionResult => {
        setAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a));
        return { success: true, message: `Cuenta "${updatedAccount.accountName}" actualizada.` };
    };

    const handleDeleteAccount = (id: string): ActionResult => {
        const accountToDelete = accounts.find(a => a.id === id);
        if (!accountToDelete) return { success: false, message: "La cuenta no existe." };
    
        const transactionsInAccount = allTransactions.some(t => t.accountId === id);
        if (transactionsInAccount) {
            return { success: false, message: `No se puede eliminar "${accountToDelete.accountName}" porque tiene transacciones asociadas.` };
        }
        
        setAccounts(prev => prev.filter(a => a.id !== id));
        return { success: true };
    };

    const value = {
        allTransactions, expenseCategories, incomeCategories, handleConfirmImport,
        handleAddExpenseCategory, handleUpdateExpenseCategory, handleDeleteExpenseCategory,
        handleAddIncomeCategory, handleUpdateIncomeCategory, handleDeleteIncomeCategory,
        handleDownloadBackup, handleRestoreBackup, handleAddTransaction, handleUpdateTransaction,
        handleDeleteTransaction, goals, handleAddGoal, handleUpdateGoal, handleDeleteGoal,
        accounts, handleAddAccount, handleUpdateAccount, handleDeleteAccount,
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