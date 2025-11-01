import React, { createContext, useState, useContext, ReactNode, FC, useEffect } from 'react';
import { Transaction, Goal, Account, RecurringTransaction, TransactionType } from '../types';

const STORAGE_KEY = 'budget-app-data';
const RECURRING_CHECK_KEY = 'budget-app-last-recurring-check';

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
    recurringTransactions: RecurringTransaction[];
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
    recurringTransactions: RecurringTransaction[];
    handleAddRecurringTransaction: (recurring: Omit<RecurringTransaction, 'id'>) => void;
    handleUpdateRecurringTransaction: (recurring: RecurringTransaction) => void;
    handleDeleteRecurringTransaction: (id: string) => void;
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
                recurringTransactions: [],
            };
        }
        const storedState = JSON.parse(serializedState);
        const loadedAccounts = storedState.accounts || [];
        
        const loadedTransactions = (storedState.allTransactions || []).map((tx: any) => ({ ...tx, date: new Date(tx.date) }));
        const loadedRecurring = (storedState.recurringTransactions || []).map((rtx: any) => ({ ...rtx, startDate: new Date(rtx.startDate), endDate: rtx.endDate ? new Date(rtx.endDate) : undefined }));

        return {
            allTransactions: loadedTransactions,
            expenseCategories: storedState.expenseCategories || INITIAL_EXPENSE_CATEGORIES,
            incomeCategories: storedState.incomeCategories || INITIAL_INCOME_CATEGORIES,
            goals: storedState.goals || [],
            accounts: loadedAccounts,
            recurringTransactions: loadedRecurring,
        };
    } catch (error) {
        console.error("Could not load state from localStorage", error);
        return {
            allTransactions: [], expenseCategories: INITIAL_EXPENSE_CATEGORIES, incomeCategories: INITIAL_INCOME_CATEGORIES,
            goals: [], accounts: [], recurringTransactions: [],
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
    const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>(initialState.recurringTransactions);

    useEffect(() => {
        try {
            const stateToSave = {
                allTransactions, expenseCategories, incomeCategories, goals, accounts, recurringTransactions,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Could not save state to localStorage", error);
        }
    }, [allTransactions, expenseCategories, incomeCategories, goals, accounts, recurringTransactions]);

    useEffect(() => {
        const lastCheckStr = localStorage.getItem(RECURRING_CHECK_KEY);
        const lastCheckDate = lastCheckStr ? new Date(lastCheckStr) : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
        const today = new Date();
        
        if (recurringTransactions.length === 0 || accounts.length === 0) {
             localStorage.setItem(RECURRING_CHECK_KEY, today.toISOString());
             return; // No need to run if no recurring tx or accounts exist
        }

        const newTransactions: Transaction[] = [];
        let currentDate = new Date(lastCheckDate.getFullYear(), lastCheckDate.getMonth(), 1);

        while (currentDate <= today) {
            for (const recurring of recurringTransactions) {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                
                if (currentDate < recurring.startDate || (recurring.endDate && currentDate > recurring.endDate)) continue;

                const dayToUse = recurring.dayOfMonth || 1;
                const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
                const transactionDay = Math.min(dayToUse, lastDayOfMonth);
                const transactionDate = new Date(year, month, transactionDay);

                if (transactionDate > today) continue;

                const alreadyExists = allTransactions.some(t => 
                    t.recurringTransactionId === recurring.id &&
                    new Date(t.date).getFullYear() === year &&
                    new Date(t.date).getMonth() === month
                );

                if (!alreadyExists) {
                    newTransactions.push({
                        id: crypto.randomUUID(),
                        date: transactionDate,
                        description: recurring.description,
                        amount: recurring.amount ?? 0,
                        type: recurring.type,
                        category: recurring.category,
                        accountId: recurring.accountId,
                        recurringTransactionId: recurring.id,
                    });
                }
            }
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        if (newTransactions.length > 0) {
            setAllTransactions(prev => [...prev, ...newTransactions].sort((a, b) => b.date.getTime() - a.date.getTime()));
        }

        localStorage.setItem(RECURRING_CHECK_KEY, today.toISOString());
    }, []); // Runs once on app load


    const handleAddRecurringTransaction = (recurringData: Omit<RecurringTransaction, 'id'>) => {
        const newRecurring: RecurringTransaction = { ...recurringData, id: crypto.randomUUID() };
        setRecurringTransactions(prev => [...prev, newRecurring]);
    };
    const handleUpdateRecurringTransaction = (updatedRecurring: RecurringTransaction) => {
        setRecurringTransactions(prev => prev.map(r => r.id === updatedRecurring.id ? updatedRecurring : r));
    };
    const handleDeleteRecurringTransaction = (id: string) => {
        setRecurringTransactions(prev => prev.filter(r => r.id !== id));
    };

    const handleConfirmImport = (newTransactions: Transaction[]): ActionResult => {
        const combined = [...allTransactions, ...newTransactions];
        const uniqueTransactions = Array.from(new Map(combined.map(t => [`${t.date.toISOString()}-${t.description}-${t.amount}-${t.accountId}`, t])).values());
        setAllTransactions(uniqueTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));
        return { success: true, message: `${newTransactions.length} transacciones importadas con éxito.` };
    };
    
    const handleAddExpenseCategory = (newCategory: string): ActionResult => {
        if (!newCategory.trim()) return { success: false, message: 'El nombre no puede estar vacío.' };
        if (expenseCategories.some(c => c.toLowerCase() === newCategory.toLowerCase())) {
            return { success: false, message: `La categoría "${newCategory}" ya existe.` };
        }
        setExpenseCategories(prev => [...prev, newCategory.trim()].sort());
        return { success: true };
    };

    const handleUpdateExpenseCategory = (oldCategory: string, newCategory: string): ActionResult => {
        if (!newCategory.trim()) return { success: false, message: 'El nombre no puede estar vacío.' };
        if (expenseCategories.some(c => c.toLowerCase() === newCategory.toLowerCase() && c.toLowerCase() !== oldCategory.toLowerCase())) {
            return { success: false, message: `La categoría "${newCategory}" ya existe.` };
        }
        setExpenseCategories(prev => prev.map(c => c === oldCategory ? newCategory.trim() : c).sort());
        setAllTransactions(prev => prev.map(t => t.category === oldCategory ? { ...t, category: newCategory.trim() } : t));
        return { success: true, message: 'Categoría actualizada.' };
    };

    const handleDeleteExpenseCategory = (category: string) => {
        setExpenseCategories(prev => prev.filter(c => c !== category));
        setAllTransactions(prev => prev.map(t => t.category === category ? { ...t, category: 'Sin Categorizar' } : t));
    };

    const handleAddIncomeCategory = (newCategory: string): ActionResult => {
        if (!newCategory.trim()) return { success: false, message: 'El nombre no puede estar vacío.' };
        if (incomeCategories.some(c => c.toLowerCase() === newCategory.toLowerCase())) {
            return { success: false, message: `La categoría "${newCategory}" ya existe.` };
        }
        setIncomeCategories(prev => [...prev, newCategory.trim()].sort());
        return { success: true };
    };

    const handleUpdateIncomeCategory = (oldCategory: string, newCategory: string): ActionResult => {
        if (!newCategory.trim()) return { success: false, message: 'El nombre no puede estar vacío.' };
        if (incomeCategories.some(c => c.toLowerCase() === newCategory.toLowerCase() && c.toLowerCase() !== oldCategory.toLowerCase())) {
            return { success: false, message: `La categoría "${newCategory}" ya existe.` };
        }
        setIncomeCategories(prev => prev.map(c => c === oldCategory ? newCategory.trim() : c).sort());
        setAllTransactions(prev => prev.map(t => t.category === oldCategory && t.type === TransactionType.INCOME ? { ...t, category: newCategory.trim() } : t));
        return { success: true, message: 'Categoría actualizada.' };
    };

    const handleDeleteIncomeCategory = (category: string) => {
        setIncomeCategories(prev => prev.filter(c => c !== category));
        setAllTransactions(prev => prev.map(t => t.category === category && t.type === TransactionType.INCOME ? { ...t, category: 'Ingresos Varios' } : t));
    };

    const handleDownloadBackup = (): ActionResult => {
        try {
            const stateToSave = { allTransactions, expenseCategories, incomeCategories, goals, accounts, recurringTransactions };
            const dataStr = JSON.stringify(stateToSave, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `budget_backup_${new Date().toISOString().slice(0, 10)}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            return { success: true, message: 'Copia de seguridad descargada.' };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Error al crear la copia de seguridad.' };
        }
    };
    const handleRestoreBackup = (file: File, callback: (result: ActionResult) => void) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                if (typeof result !== 'string') throw new Error("Invalid file content");
                const restoredState = JSON.parse(result);
                
                if (!restoredState.allTransactions || !restoredState.expenseCategories || !restoredState.incomeCategories) {
                    throw new Error("El archivo no tiene el formato correcto.");
                }
                
                setAllTransactions((restoredState.allTransactions || []).map((tx: any) => ({ ...tx, date: new Date(tx.date) })));
                setExpenseCategories(restoredState.expenseCategories || INITIAL_EXPENSE_CATEGORIES);
                setIncomeCategories(restoredState.incomeCategories || INITIAL_INCOME_CATEGORIES);
                setGoals(restoredState.goals || []);
                setAccounts(restoredState.accounts || []);
                setRecurringTransactions((restoredState.recurringTransactions || []).map((rtx: any) => ({ ...rtx, startDate: new Date(rtx.startDate), endDate: rtx.endDate ? new Date(rtx.endDate) : undefined })));
                
                callback({ success: true, message: 'Copia de seguridad restaurada con éxito.' });
            } catch (error) {
                console.error(error);
                const message = error instanceof Error ? error.message : 'Error al procesar el archivo.';
                callback({ success: false, message });
            }
        };
        reader.readAsText(file);
    };

    const handleAddTransaction = (transactionData: Omit<Transaction, 'id'>) => {
        const newTransaction: Transaction = { ...transactionData, id: crypto.randomUUID() };
        setAllTransactions(prev => [...prev, newTransaction].sort((a, b) => b.date.getTime() - a.date.getTime()));
    };

    const handleUpdateTransaction = (updatedTransaction: Transaction) => {
        setAllTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a, b) => b.date.getTime() - a.date.getTime()));
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
        setAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
        return { success: true };
    };

    const handleDeleteAccount = (id: string): ActionResult => {
        if (allTransactions.some(t => t.accountId === id)) {
            return { success: false, message: 'No se puede eliminar una cuenta con transacciones asociadas.' };
        }
        if (recurringTransactions.some(rt => rt.accountId === id)) {
            return { success: false, message: 'No se puede eliminar una cuenta con transacciones recurrentes asociadas.' };
        }
        setAccounts(prev => prev.filter(acc => acc.id !== id));
        return { success: true };
    };

    const value = {
        allTransactions, expenseCategories, incomeCategories, handleConfirmImport,
        handleAddExpenseCategory, handleUpdateExpenseCategory, handleDeleteExpenseCategory,
        handleAddIncomeCategory, handleUpdateIncomeCategory, handleDeleteIncomeCategory,
        handleDownloadBackup, handleRestoreBackup, handleAddTransaction, handleUpdateTransaction,
        handleDeleteTransaction, goals, handleAddGoal, handleUpdateGoal, handleDeleteGoal,
        accounts, handleAddAccount, handleUpdateAccount, handleDeleteAccount,
        recurringTransactions, handleAddRecurringTransaction, handleUpdateRecurringTransaction, handleDeleteRecurringTransaction
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