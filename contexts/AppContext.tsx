import React, { createContext, useState, useContext, ReactNode, FC, useEffect, useCallback, useMemo } from 'react';
import { Transaction, Goal, Account, AutomationRule, TransactionType, Category } from '../types';

const STORAGE_KEY = 'budget-app-data';
const DATA_STRUCTURE_VERSION = 2; // Version for subcategories

// --- Data Migration ---
const migrateDataStructure = (data: any): AppState => {
    if (data.dataStructureVersion === DATA_STRUCTURE_VERSION) {
        // Data is up to date, just parse dates
        data.allTransactions = (data.allTransactions || []).map((tx: any) => ({ ...tx, date: new Date(tx.date) }));
        return data;
    }

    console.log("Migrating data to new structure (v2)...");
    
    // Default categories for new users
    const defaultExpenseCategories: Category[] = [
      { id: 'cat-uncategorized', name: 'Sin Categorizar', parentId: null, type: TransactionType.EXPENSE },
      { id: crypto.randomUUID(), name: 'Vivienda', parentId: null, type: TransactionType.EXPENSE },
      { id: crypto.randomUUID(), name: 'Transporte', parentId: null, type: TransactionType.EXPENSE },
      { id: crypto.randomUUID(), name: 'Comida', parentId: null, type: TransactionType.EXPENSE },
      { id: crypto.randomUUID(), name: 'Ocio', parentId: null, type: TransactionType.EXPENSE },
    ];
    const defaultIncomeCategories: Category[] = [
      { id: 'cat-income-various', name: 'Ingresos Varios', parentId: null, type: TransactionType.INCOME },
      { id: crypto.randomUUID(), name: 'Nómina', parentId: null, type: TransactionType.INCOME },
    ];

    let newCategories: Category[] = [...defaultExpenseCategories, ...defaultIncomeCategories];
    let newTransactions: Transaction[] = [];
    let newGoals: Goal[] = data.goals || [];
    let newAutomationRules: AutomationRule[] = data.automationRules || [];
    
    // If old data exists, migrate it
    if (data.expenseCategories && Array.isArray(data.expenseCategories)) {
        const oldCategoryMap = new Map<string, string>(); // Map old name to new ID

        const expenseCats = data.expenseCategories.map((name: string) => {
            const id = name === 'Sin Categorizar' ? 'cat-uncategorized' : crypto.randomUUID();
            oldCategoryMap.set(name, id);
            return { id, name, parentId: null, type: TransactionType.EXPENSE };
        });

        const incomeCats = data.incomeCategories.map((name: string) => {
            const id = name === 'Ingresos Varios' ? 'cat-income-various' : crypto.randomUUID();
            oldCategoryMap.set(name, id);
            return { id, name, parentId: null, type: TransactionType.INCOME };
        });

        newCategories = [...expenseCats, ...incomeCats];

        newTransactions = (data.allTransactions || []).map((tx: any) => ({
            ...tx,
            date: new Date(tx.date),
            categoryId: oldCategoryMap.get(tx.category) || (tx.type === TransactionType.EXPENSE ? 'cat-uncategorized' : 'cat-income-various'),
        }));
        
        newGoals = (data.goals || []).map((goal: any) => ({
            ...goal,
            linkedCategoryId: oldCategoryMap.get(goal.linkedCategory) || 'cat-uncategorized',
        }));

        newAutomationRules = (data.automationRules || []).map((rule: any) => ({
             ...rule,
             categoryId: oldCategoryMap.get(rule.categoryId) || 'cat-uncategorized'
        }));
    }

    return {
        allTransactions: newTransactions,
        categories: newCategories,
        goals: newGoals,
        accounts: data.accounts || [],
        automationRules: newAutomationRules,
        dataStructureVersion: DATA_STRUCTURE_VERSION,
    };
};


interface AppState {
    allTransactions: Transaction[];
    categories: Category[];
    goals: Goal[];
    accounts: Account[];
    automationRules: AutomationRule[];
    dataStructureVersion?: number;
}

interface ActionResult {
    success: boolean;
    message?: string;
}

interface AppContextType {
    allTransactions: Transaction[];
    categories: Category[];
    handleConfirmImport: (newTransactions: Transaction[]) => ActionResult;
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
    automationRules: AutomationRule[];
    handleAddAutomationRule: (rule: Omit<AutomationRule, 'id'>) => ActionResult;
    handleUpdateAutomationRule: (rule: AutomationRule) => ActionResult;
    handleDeleteAutomationRule: (id: string) => void;
    handleReapplyAutomationRules: (transactionIds: string[]) => { updatedCount: number };
    // New category handlers
    handleAddCategory: (category: Omit<Category, 'id'>) => ActionResult;
    handleUpdateCategory: (category: Category) => ActionResult;
    handleDeleteCategory: (id: string) => ActionResult;
    getCategoryWithDescendants: (categoryId: string) => string[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const loadInitialState = (): AppState => {
    try {
        const serializedState = localStorage.getItem(STORAGE_KEY);
        if (serializedState === null) {
            return migrateDataStructure({}); // Get defaults for a new user
        }
        const storedData = JSON.parse(serializedState);
        return migrateDataStructure(storedData);

    } catch (error) {
        console.error("Could not load state from localStorage", error);
        return migrateDataStructure({});
    }
};

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const initialState = loadInitialState();
    const [allTransactions, setAllTransactions] = useState<Transaction[]>(initialState.allTransactions);
    const [categories, setCategories] = useState<Category[]>(initialState.categories);
    const [accounts, setAccounts] = useState<Account[]>(initialState.accounts);
    const [goals, setGoals] = useState<Goal[]>(initialState.goals);
    const [automationRules, setAutomationRules] = useState<AutomationRule[]>(initialState.automationRules);

    useEffect(() => {
        try {
            const stateToSave = {
                allTransactions, categories, goals, accounts, automationRules, dataStructureVersion: DATA_STRUCTURE_VERSION
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Could not save state to localStorage", error);
        }
    }, [allTransactions, categories, goals, accounts, automationRules]);
    
    const getCategoryWithDescendants = useCallback((categoryId: string): string[] => {
        const result = [categoryId];
        const children = categories.filter(c => c.parentId === categoryId);
        for (const child of children) {
            result.push(...getCategoryWithDescendants(child.id));
        }
        return result;
    }, [categories]);

    const handleAddCategory = useCallback((categoryData: Omit<Category, 'id'>): ActionResult => {
        if (!categoryData.name.trim()) return { success: false, message: 'El nombre no puede estar vacío.' };
        if (categories.some(c => c.name.toLowerCase() === categoryData.name.toLowerCase() && c.parentId === categoryData.parentId)) {
            return { success: false, message: `La categoría "${categoryData.name}" ya existe en este nivel.` };
        }
        const newCategory: Category = { ...categoryData, id: crypto.randomUUID() };
        setCategories(prev => [...prev, newCategory]);
        return { success: true };
    }, [categories]);
    
    const handleUpdateCategory = useCallback((updatedCategory: Category): ActionResult => {
        if (!updatedCategory.name.trim()) return { success: false, message: 'El nombre no puede estar vacío.' };
        if (categories.some(c => c.id !== updatedCategory.id && c.name.toLowerCase() === updatedCategory.name.toLowerCase() && c.parentId === updatedCategory.parentId)) {
            return { success: false, message: `La categoría "${updatedCategory.name}" ya existe en este nivel.` };
        }
        setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
        return { success: true };
    }, [categories]);

    const handleDeleteCategory = useCallback((id: string): ActionResult => {
        const hasChildren = categories.some(c => c.parentId === id);
        if (hasChildren) {
            return { success: false, message: 'No se puede eliminar una categoría con subcategorías.' };
        }
        
        const defaultCategoryId = categories.find(c => c.id === 'cat-uncategorized') ? 'cat-uncategorized' : (categories.find(c => c.type === TransactionType.EXPENSE)?.id || '');

        setAllTransactions(prev => prev.map(t => t.categoryId === id ? { ...t, categoryId: defaultCategoryId } : t));
        setAutomationRules(prev => prev.filter(r => r.categoryId !== id));
        setGoals(prev => prev.map(g => g.linkedCategoryId === id ? { ...g, linkedCategoryId: defaultCategoryId } : g));
        setCategories(prev => prev.filter(c => c.id !== id));
        
        return { success: true };
    }, [categories]);

    const handleReapplyAutomationRules = useCallback((transactionIds: string[]): { updatedCount: number } => {
        const idsToUpdate = new Set(transactionIds); let updatedCount = 0;
        const updatedTransactions = allTransactions.map(t => {
            if (idsToUpdate.has(t.id)) {
                for (const rule of automationRules) {
                    if (t.type === rule.type && t.description.toLowerCase().includes(rule.keyword.toLowerCase())) {
                        if (t.categoryId !== rule.categoryId) { updatedCount++; return { ...t, categoryId: rule.categoryId }; }
                        break;
                    }
                }
            }
            return t; 
        });
        setAllTransactions(updatedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));
        return { updatedCount };
    }, [allTransactions, automationRules]);

    const handleAddAutomationRule = useCallback((ruleData: Omit<AutomationRule, 'id'>): ActionResult => {
        if (automationRules.some(r => r.keyword.toLowerCase() === ruleData.keyword.toLowerCase())) { return { success: false, message: `Ya existe una regla para la palabra clave "${ruleData.keyword}".` }; }
        setAutomationRules(prev => [...prev, { ...ruleData, id: crypto.randomUUID() }]);
        return { success: true };
    }, [automationRules]);
    
    const handleUpdateAutomationRule = useCallback((updatedRule: AutomationRule): ActionResult => {
        if (automationRules.some(r => r.id !== updatedRule.id && r.keyword.toLowerCase() === updatedRule.keyword.toLowerCase())) { return { success: false, message: `Ya existe otra regla para la palabra clave "${updatedRule.keyword}".` }; }
        setAutomationRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
        return { success: true };
    }, [automationRules]);
    
    const handleDeleteAutomationRule = useCallback((id: string) => { setAutomationRules(prev => prev.filter(r => r.id !== id)); }, []);

    const handleConfirmImport = useCallback((newTransactions: Transaction[]): ActionResult => {
        setAllTransactions(prev => {
            const combined = [...prev, ...newTransactions];
            const uniqueTransactions = Array.from(new Map(combined.map(t => [`${t.date.toISOString()}-${t.description}-${t.amount}-${t.accountId}`, t])).values());
            return uniqueTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
        });
        return { success: true, message: `${newTransactions.length} transacciones importadas con éxito.` };
    }, []);
    
    const handleDownloadBackup = useCallback((): ActionResult => {
        try {
            const stateToSave = { allTransactions, categories, goals, accounts, automationRules, dataStructureVersion: DATA_STRUCTURE_VERSION };
            const dataStr = JSON.stringify(stateToSave, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `budget_backup_${new Date().toISOString().slice(0, 10)}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            return { success: true, message: 'Copia de seguridad descargada.' };
        } catch (error) { console.error(error); return { success: false, message: 'Error al crear la copia de seguridad.' }; }
    }, [allTransactions, categories, goals, accounts, automationRules]);

    const handleRestoreBackup = useCallback((file: File, callback: (result: ActionResult) => void) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                if (typeof result !== 'string') throw new Error("Invalid file content");
                const restoredState = migrateDataStructure(JSON.parse(result));
                if (!restoredState.allTransactions || !restoredState.categories) throw new Error("El archivo no tiene el formato correcto.");
                setAllTransactions(restoredState.allTransactions);
                setCategories(restoredState.categories);
                setGoals(restoredState.goals || []);
                setAccounts(restoredState.accounts || []);
                setAutomationRules(restoredState.automationRules || []);
                callback({ success: true, message: 'Copia de seguridad restaurada con éxito.' });
            } catch (error) { const message = error instanceof Error ? error.message : 'Error al procesar el archivo.'; callback({ success: false, message }); }
        };
        reader.readAsText(file);
    }, []);

    const handleAddTransaction = useCallback((transactionData: Omit<Transaction, 'id'>) => { setAllTransactions(prev => [...prev, { ...transactionData, id: crypto.randomUUID() }].sort((a, b) => b.date.getTime() - a.date.getTime())); }, []);
    const handleUpdateTransaction = useCallback((updatedTransaction: Transaction) => { setAllTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a, b) => b.date.getTime() - a.date.getTime())); }, []);
    const handleDeleteTransaction = useCallback((id: string) => { setAllTransactions(prev => prev.filter(t => t.id !== id)); }, []);
    const handleAddGoal = useCallback((goalData: Omit<Goal, 'id'>) => { setGoals(prev => [...prev, { ...goalData, id: crypto.randomUUID() }]); }, []);
    const handleUpdateGoal = useCallback((updatedGoal: Goal) => { setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g)); }, []);
    const handleDeleteGoal = useCallback((id: string) => { setGoals(prev => prev.filter(g => g.id !== id)); }, []);
    const handleAddAccount = useCallback((accountData: Omit<Account, 'id'>) => { setAccounts(prev => [...prev, { ...accountData, id: crypto.randomUUID() }]); }, []);
    const handleUpdateAccount = useCallback((updatedAccount: Account): ActionResult => { setAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc)); return { success: true }; }, []);
    
    const handleDeleteAccount = useCallback((id: string): ActionResult => {
        if (allTransactions.some(t => t.accountId === id)) { return { success: false, message: 'No se puede eliminar una cuenta con transacciones asociadas.' }; }
        setAccounts(prev => prev.filter(acc => acc.id !== id)); return { success: true };
    }, [allTransactions]);

    const value = useMemo(() => ({
        allTransactions, categories, handleConfirmImport,
        handleDownloadBackup, handleRestoreBackup, handleAddTransaction, handleUpdateTransaction,
        handleDeleteTransaction, goals, handleAddGoal, handleUpdateGoal, handleDeleteGoal,
        accounts, handleAddAccount, handleUpdateAccount, handleDeleteAccount,
        automationRules, handleAddAutomationRule, handleUpdateAutomationRule, handleDeleteAutomationRule,
        handleReapplyAutomationRules, handleAddCategory, handleUpdateCategory, handleDeleteCategory,
        getCategoryWithDescendants,
    }), [
        allTransactions, categories, goals, accounts, automationRules,
        handleConfirmImport, handleDownloadBackup, handleRestoreBackup, handleAddTransaction, handleUpdateTransaction,
        handleDeleteTransaction, handleAddGoal, handleUpdateGoal, handleDeleteGoal,
        handleAddAccount, handleUpdateAccount, handleDeleteAccount,
        handleAddAutomationRule, handleUpdateAutomationRule, handleDeleteAutomationRule,
        handleReapplyAutomationRules, handleAddCategory, handleUpdateCategory, handleDeleteCategory,
        getCategoryWithDescendants
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) { throw new Error('useAppContext must be used within an AppProvider'); }
    return context;
};