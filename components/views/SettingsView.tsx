import React, { useState } from 'react';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../icons';
import { useAppContext } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
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
    const { addToast } = useToast();
    const { confirm } = useModal();
    
    const [newExpenseCategory, setNewExpenseCategory] = useState('');
    const [editingExpenseCategory, setEditingExpenseCategory] = useState<string | null>(null);
    const [editedExpenseCategoryName, setEditedExpenseCategoryName] = useState('');
    const [newIncomeCategory, setNewIncomeCategory] = useState('');
    const [editingIncomeCategory, setEditingIncomeCategory] = useState<string | null>(null);
    const [editedIncomeCategoryName, setEditedIncomeCategoryName] = useState('');
    
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(undefined);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);

    const handleExpenseCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const result = handleAddExpenseCategory(newExpenseCategory);
        if (result.success) {
            addToast({ type: 'success', message: 'Categoría de gasto añadida.' });
            setNewExpenseCategory('');
        } else {
            addToast({ type: 'error', message: result.message! });
        }
    };

    const handleSaveEditingExpense = () => {
        if (editingExpenseCategory) {
            const result = handleUpdateExpenseCategory(editingExpenseCategory, editedExpenseCategoryName);
            if(result.success) {
                addToast({ type: 'success', message: result.message! });
            } else {
                addToast({ type: 'error', message: result.message! });
            }
        }
        setEditingExpenseCategory(null); setEditedExpenseCategoryName('');
    };

    const onDeleteExpenseCategory = async (category: string) => {
        if (category === 'Sin Categorizar') {
            addToast({ type: 'warning', message: 'No se puede eliminar la categoría por defecto.' }); return;
        }
        const confirmed = await confirm('Eliminar Categoría', `¿Eliminar "${category}"? Las transacciones asociadas se moverán a "Sin Categorizar".`);
        if(confirmed) {
            handleDeleteExpenseCategory(category);
            addToast({ type: 'success', message: `Categoría "${category}" eliminada.`});
        }
    };

    const handleIncomeCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const result = handleAddIncomeCategory(newIncomeCategory);
        if (result.success) {
            addToast({ type: 'success', message: 'Categoría de ingreso añadida.' });
            setNewIncomeCategory('');
        } else {
            addToast({ type: 'error', message: result.message! });
        }
    };
    
    const handleSaveEditingIncome = () => {
        if (editingIncomeCategory) {
            const result = handleUpdateIncomeCategory(editingIncomeCategory, editedIncomeCategoryName);
            if(result.success) {
                addToast({ type: 'success', message: result.message! });
            } else {
                addToast({ type: 'error', message: result.message! });
            }
        }
        setEditingIncomeCategory(null); setEditedIncomeCategoryName('');
    };

    const onDeleteIncomeCategory = async (category: string) => {
        const confirmed = await confirm('Eliminar Categoría', `¿Eliminar "${category}"? Las transacciones asociadas se moverán a "Ingresos Varios".`);
        if(confirmed) {
            handleDeleteIncomeCategory(category);
            addToast({ type: 'success', message: `Categoría "${category}" eliminada.`});
        }
    };

    const onDeleteGoal = async (id: string, name: string) => {
        const confirmed = await confirm('Eliminar Meta', `¿Estás seguro de que quieres eliminar la meta "${name}"?`);
        if (confirmed) {
            handleDeleteGoal(id);
            addToast({ type: 'success', message: 'Meta eliminada.' });
        }
    };

    const onDeleteAccount = async (account: Account) => {
        const confirmed = await confirm('Eliminar Cuenta', `¿Estás seguro de que quieres eliminar la cuenta "${account.accountName}"? Esta acción no se puede deshacer.`);
        if (confirmed) {
            const result = handleDeleteAccount(account.id);
            if (result.success) {
                addToast({ type: 'success', message: `Cuenta "${account.accountName}" eliminada.` });
            } else {
                addToast({ type: 'error', message: result.message! });
            }
        }
    };

    return (
        <>
            <div className="space-y-8 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4">Gestionar Cuentas Bancarias</h2>
                        <button onClick={() => { setSelectedAccount(undefined); setIsAccountModalOpen(true); }} className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg mb-4">
                            <PlusCircleIcon className="w-5 h-5" /><span>Añadir Nueva Cuenta</span>
                        </button>
                        <div className="space-y-2">
                            {accounts.map(acc => (
                                <div key={acc.id} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                    <div><p>{acc.accountName}</p><p className="text-xs text-gray-400">{acc.bankName} {acc.accountNumber && `- ${acc.accountNumber}`}</p></div>
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => { setSelectedAccount(acc); setIsAccountModalOpen(true); }} className="text-gray-400 hover:text-violet-400"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => onDeleteAccount(acc)} className="text-gray-400 hover:text-rose-500"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4">Gestionar Metas Financieras</h2>
                        <button onClick={() => { setSelectedGoal(undefined); setIsGoalModalOpen(true); }} className="w-full flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg mb-4">
                            <PlusCircleIcon className="w-5 h-5" /><span>Añadir Nueva Meta</span>
                        </button>
                        <div className="space-y-2">
                            {goals.map(goal => (
                                <div key={goal.id} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                    <div><p>{goal.name}</p><p className="text-xs text-gray-400">Objetivo: €{goal.targetAmount.toLocaleString()}</p></div>
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => { setSelectedGoal(goal); setIsGoalModalOpen(true); }} className="text-gray-400 hover:text-violet-400"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => onDeleteGoal(goal.id, goal.name)} className="text-gray-400 hover:text-rose-500"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4">Categorías de Gastos</h2>
                        <form onSubmit={handleExpenseCategorySubmit} className="flex space-x-2 mb-6">
                            <input type="text" value={newExpenseCategory} onChange={e => setNewExpenseCategory(e.target.value)} placeholder="Nueva categoría" className="flex-grow bg-slate-700 border-slate-600 rounded-md py-2 px-3" />
                            <button type="submit" className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded-lg"><PlusCircleIcon className="w-5 h-5" /></button>
                        </form>
                        <div className="space-y-2">
                            {expenseCategories.map(cat => (
                                <div key={cat} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                    {editingExpenseCategory === cat ? (<><input type="text" value={editedExpenseCategoryName} onChange={e => setEditedExpenseCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveEditingExpense()} className="flex-grow bg-slate-600 p-1 rounded" autoFocus /><div className="flex items-center space-x-2 ml-2"><button onClick={handleSaveEditingExpense} className="text-emerald-400 text-xs">GUARDAR</button><button onClick={() => setEditingExpenseCategory(null)} className="text-gray-400 text-xs">CANCELAR</button></div></>) : (<>{cat}{cat !== 'Sin Categorizar' && (<div className="flex items-center space-x-3"><button onClick={() => { setEditingExpenseCategory(cat); setEditedExpenseCategoryName(cat); }} className="text-gray-400 hover:text-violet-400"><PencilIcon className="w-4 h-4" /></button><button onClick={() => onDeleteExpenseCategory(cat)} className="text-gray-400 hover:text-rose-500"><TrashIcon className="w-4 h-4" /></button></div>)}</>)}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4">Categorías de Ingresos</h2>
                        <form onSubmit={handleIncomeCategorySubmit} className="flex space-x-2 mb-6">
                            <input type="text" value={newIncomeCategory} onChange={e => setNewIncomeCategory(e.target.value)} placeholder="Nueva categoría" className="flex-grow bg-slate-700 border-slate-600 rounded-md py-2 px-3" />
                            <button type="submit" className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg"><PlusCircleIcon className="w-5 h-5" /></button>
                        </form>
                        <div className="space-y-2">
                            {incomeCategories.map(cat => (
                                <div key={cat} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                    {editingIncomeCategory === cat ? (<><input type="text" value={editedIncomeCategoryName} onChange={e => setEditedIncomeCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveEditingIncome()} className="flex-grow bg-slate-600 p-1 rounded" autoFocus /><div className="flex items-center space-x-2 ml-2"><button onClick={handleSaveEditingIncome} className="text-emerald-400 text-xs">GUARDAR</button><button onClick={() => setEditingIncomeCategory(null)} className="text-gray-400 text-xs">CANCELAR</button></div></>) : (<>{cat}<div className="flex items-center space-x-3"><button onClick={() => { setEditingIncomeCategory(cat); setEditedIncomeCategoryName(cat); }} className="text-gray-400 hover:text-violet-400"><PencilIcon className="w-4 h-4" /></button><button onClick={() => onDeleteIncomeCategory(cat)} className="text-gray-400 hover:text-rose-500"><TrashIcon className="w-4 h-4" /></button></div></>)}
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