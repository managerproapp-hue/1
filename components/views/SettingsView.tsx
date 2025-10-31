import React, { useState } from 'react';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../icons';
import { useAppContext } from '../../contexts/AppContext';
import AddGoalModal from '../modals/AddGoalModal';
import AddAccountModal from '../modals/AddAccountModal';
import { Goal, Account } from '../../types';

const SettingsView: React.FC = () => {
    const { 
        expenseCategories, handleAddExpenseCategory, handleDeleteExpenseCategory, handleUpdateExpenseCategory,
        incomeCategories, handleAddIncomeCategory, handleDeleteIncomeCategory, handleUpdateIncomeCategory,
        goals, handleDeleteGoal,
        accounts, handleDeleteAccount,
    } = useAppContext();
    
    // State for Expense Categories
    const [newExpenseCategory, setNewExpenseCategory] = useState('');
    const [editingExpenseCategory, setEditingExpenseCategory] = useState<string | null>(null);
    const [editedExpenseCategoryName, setEditedExpenseCategoryName] = useState('');

    // State for Income Categories
    const [newIncomeCategory, setNewIncomeCategory] = useState('');
    const [editingIncomeCategory, setEditingIncomeCategory] = useState<string | null>(null);
    const [editedIncomeCategoryName, setEditedIncomeCategoryName] = useState('');
    
    // State for Modals
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(undefined);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);

    // Expense Category Handlers
    const handleExpenseCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleAddExpenseCategory(newExpenseCategory);
        setNewExpenseCategory('');
    };
    const handleStartEditingExpense = (category: string) => { setEditingExpenseCategory(category); setEditedExpenseCategoryName(category); };
    const handleCancelEditingExpense = () => { setEditingExpenseCategory(null); setEditedExpenseCategoryName(''); };
    const handleSaveEditingExpense = () => {
        if (editingExpenseCategory) handleUpdateExpenseCategory(editingExpenseCategory, editedExpenseCategoryName);
        handleCancelEditingExpense();
    };

    // Income Category Handlers
    const handleIncomeCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleAddIncomeCategory(newIncomeCategory);
        setNewIncomeCategory('');
    };
    const handleStartEditingIncome = (category: string) => { setEditingIncomeCategory(category); setEditedIncomeCategoryName(category); };
    const handleCancelEditingIncome = () => { setEditingIncomeCategory(null); setEditedIncomeCategoryName(''); };
    const handleSaveEditingIncome = () => {
        if (editingIncomeCategory) handleUpdateIncomeCategory(editingIncomeCategory, editedIncomeCategoryName);
        handleCancelEditingIncome();
    };

    // Modal Openers
    const openAddGoalModal = () => { setSelectedGoal(undefined); setIsGoalModalOpen(true); };
    const openEditGoalModal = (goal: Goal) => { setSelectedGoal(goal); setIsGoalModalOpen(true); };
    const onDeleteGoal = (id: string, name: string) => { if (window.confirm(`¿Eliminar la meta: "${name}"?`)) handleDeleteGoal(id); };
    const openAddAccountModal = () => { setSelectedAccount(undefined); setIsAccountModalOpen(true); };
    const openEditAccountModal = (account: Account) => { setSelectedAccount(account); setIsAccountModalOpen(true); };
    const onDeleteAccount = (id: string) => {
        // La confirmación y la lógica ahora están en el contexto
        handleDeleteAccount(id);
    };

    return (
        <>
            <div className="space-y-8 max-w-6xl mx-auto">
                {/* Accounts and Goals Management */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-2">Gestionar Cuentas Bancarias</h2>
                        <p className="text-gray-400 mb-4 text-sm">Añade aquí tus cuentas bancarias para organizar tus transacciones.</p>
                        <button onClick={openAddAccountModal} className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors mb-4">
                            <PlusCircleIcon className="w-5 h-5" /><span>Añadir Nueva Cuenta</span>
                        </button>
                        <div className="space-y-2">
                            {accounts.length > 0 ? accounts.map(acc => (
                                <div key={acc.id} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                    <div><p>{acc.accountName}</p><p className="text-xs text-gray-400">{acc.bankName} {acc.accountNumber && `- ${acc.accountNumber}`}</p></div>
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => openEditAccountModal(acc)} className="text-gray-400 hover:text-violet-400" title="Editar"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => onDeleteAccount(acc.id)} className="text-gray-400 hover:text-rose-500" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )) : <p className="text-center text-gray-500 py-4">No has añadido ninguna cuenta.</p>}
                        </div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4">Gestionar Metas Financieras</h2>
                        <button onClick={openAddGoalModal} className="w-full flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors mb-4">
                            <PlusCircleIcon className="w-5 h-5" /><span>Añadir Nueva Meta</span>
                        </button>
                        <div className="space-y-2">
                            {goals.length > 0 ? goals.map(goal => (
                                <div key={goal.id} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                    <div><p>{goal.name}</p><p className="text-xs text-gray-400">Objetivo: €{goal.targetAmount.toLocaleString()} | Cat: {goal.linkedCategory}</p></div>
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => openEditGoalModal(goal)} className="text-gray-400 hover:text-violet-400" title="Editar"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => onDeleteGoal(goal.id, goal.name)} className="text-gray-400 hover:text-rose-500" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )) : <p className="text-center text-gray-500 py-4">No has añadido ninguna meta.</p>}
                        </div>
                    </div>
                </div>

                {/* Categories Management */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Expense Categories */}
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4">Gestionar Categorías de Gastos</h2>
                        <form onSubmit={handleExpenseCategorySubmit} className="flex space-x-2 mb-6">
                            <input type="text" value={newExpenseCategory} onChange={(e) => setNewExpenseCategory(e.target.value)} placeholder="Nueva categoría de gasto" className="flex-grow bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:ring-violet-500 focus:border-violet-500" />
                            <button type="submit" className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded-lg"><PlusCircleIcon className="w-5 h-5" /><span>Añadir</span></button>
                        </form>
                        <div className="space-y-2">
                            {expenseCategories.map(cat => (
                                <div key={cat} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                    {editingExpenseCategory === cat ? (
                                        <><input type="text" value={editedExpenseCategoryName} onChange={(e) => setEditedExpenseCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditingExpense()} className="flex-grow bg-slate-600 p-1 rounded" autoFocus /><div className="flex items-center space-x-2 ml-2"><button onClick={handleSaveEditingExpense} className="text-emerald-400 text-xs font-bold">GUARDAR</button><button onClick={handleCancelEditingExpense} className="text-gray-400 text-xs">CANCELAR</button></div></>
                                    ) : (
                                        <>{cat}{cat !== 'Sin Categorizar' && (<div className="flex items-center space-x-3"><button onClick={() => handleStartEditingExpense(cat)} className="text-gray-400 hover:text-violet-400" title="Editar"><PencilIcon className="w-4 h-4" /></button><button onClick={() => handleDeleteExpenseCategory(cat)} className="text-gray-400 hover:text-rose-500" title="Eliminar"><TrashIcon className="w-4 h-4" /></button></div>)}</>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                     {/* Income Categories */}
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4">Gestionar Categorías de Ingresos</h2>
                        <form onSubmit={handleIncomeCategorySubmit} className="flex space-x-2 mb-6">
                            <input type="text" value={newIncomeCategory} onChange={(e) => setNewIncomeCategory(e.target.value)} placeholder="Nueva categoría de ingreso" className="flex-grow bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:ring-violet-500 focus:border-violet-500" />
                            <button type="submit" className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg"><PlusCircleIcon className="w-5 h-5" /><span>Añadir</span></button>
                        </form>
                        <div className="space-y-2">
                            {incomeCategories.map(cat => (
                                <div key={cat} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                    {editingIncomeCategory === cat ? (
                                         <><input type="text" value={editedIncomeCategoryName} onChange={(e) => setEditedIncomeCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditingIncome()} className="flex-grow bg-slate-600 p-1 rounded" autoFocus /><div className="flex items-center space-x-2 ml-2"><button onClick={handleSaveEditingIncome} className="text-emerald-400 text-xs font-bold">GUARDAR</button><button onClick={handleCancelEditingIncome} className="text-gray-400 text-xs">CANCELAR</button></div></>
                                    ) : (
                                        <>{cat}<div className="flex items-center space-x-3"><button onClick={() => handleStartEditingIncome(cat)} className="text-gray-400 hover:text-violet-400" title="Editar"><PencilIcon className="w-4 h-4" /></button><button onClick={() => handleDeleteIncomeCategory(cat)} className="text-gray-400 hover:text-rose-500" title="Eliminar"><TrashIcon className="w-4 h-4" /></button></div></>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <AddGoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} goalToEdit={selectedGoal} />
            <AddAccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} accountToEdit={selectedAccount} />
        </>
    );
};

export default SettingsView;