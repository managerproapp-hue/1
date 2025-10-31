import React, { useState } from 'react';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../icons';
import { useAppContext } from '../../contexts/AppContext';
import AddGoalModal from '../modals/AddGoalModal';
import AddAccountModal from '../modals/AddAccountModal';
import { Goal, Account } from '../../types';

const SettingsView: React.FC = () => {
    const { 
        expenseCategories, handleAddCategory, handleDeleteCategory,
        goals, handleDeleteGoal,
        accounts, handleDeleteAccount,
    } = useAppContext();
    const [newCategory, setNewCategory] = useState('');

    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(undefined);
    
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);

    const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleAddCategory(newCategory);
        setNewCategory('');
    };

    const openAddGoalModal = () => { setSelectedGoal(undefined); setIsGoalModalOpen(true); };
    const openEditGoalModal = (goal: Goal) => { setSelectedGoal(goal); setIsGoalModalOpen(true); };
    const onDeleteGoal = (id: string, name: string) => { if (window.confirm(`¿Eliminar la meta: "${name}"?`)) handleDeleteGoal(id); };

    const openAddAccountModal = () => { setSelectedAccount(undefined); setIsAccountModalOpen(true); };
    const openEditAccountModal = (account: Account) => { setSelectedAccount(account); setIsAccountModalOpen(true); };
    const onDeleteAccount = (id: string, name: string) => { if (window.confirm(`¿Eliminar la cuenta: "${name}"?`)) handleDeleteAccount(id); };

    return (
        <>
            <div className="space-y-8 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Account Management */}
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-2">Gestionar Cuentas Bancarias</h2>
                        <p className="text-gray-400 mb-4 text-sm">Añade aquí tus cuentas bancarias. Podrás seleccionarlas al importar extractos para mantener tus transacciones organizadas.</p>
                        <div className="text-center mb-6">
                            <button onClick={openAddAccountModal} className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                                <PlusCircleIcon className="w-5 h-5" /><span>Añadir Nueva Cuenta</span>
                            </button>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-2">Cuentas Actuales</h3>
                            {accounts.length > 0 ? accounts.map(acc => (
                                <div key={acc.id} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                    <div>
                                        <p>{acc.accountName}</p>
                                        <p className="text-xs text-gray-400">{acc.bankName} {acc.accountNumber && `- ${acc.accountNumber}`}</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => openEditAccountModal(acc)} className="text-gray-400 hover:text-violet-400" title="Editar Cuenta"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => onDeleteAccount(acc.id, acc.accountName)} className="text-gray-400 hover:text-rose-500" title="Eliminar Cuenta"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-gray-500 py-4">No has añadido ninguna cuenta.</p>
                            )}
                        </div>
                    </div>

                    {/* Category Management */}
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold mb-4">Gestionar Categorías</h2>
                        <form onSubmit={handleCategorySubmit} className="flex space-x-2 mb-6">
                            <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nueva categoría" className="flex-grow bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500" />
                            <button type="submit" className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                                <PlusCircleIcon className="w-5 h-5" /><span>Añadir</span>
                            </button>
                        </form>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-2">Categorías Actuales</h3>
                            {expenseCategories.map(cat => (
                                <div key={cat} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                    <span>{cat}</span>
                                    {cat !== 'Sin Categorizar' && (
                                        <button onClick={() => handleDeleteCategory(cat)} className="text-rose-500 hover:text-rose-400 text-xs font-bold">ELIMINAR</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Goal Management */}
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4">Gestionar Metas Financieras</h2>
                    <div className="text-center mb-6">
                        <button onClick={openAddGoalModal} className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            <PlusCircleIcon className="w-5 h-5" /><span>Añadir Nueva Meta</span>
                        </button>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-2">Metas Actuales</h3>
                        {goals.length > 0 ? goals.map(goal => (
                            <div key={goal.id} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                <div>
                                    <p>{goal.name}</p>
                                    <p className="text-xs text-gray-400">Objetivo: €{goal.targetAmount.toLocaleString()} | Categoría: {goal.linkedCategory}</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button onClick={() => openEditGoalModal(goal)} className="text-gray-400 hover:text-violet-400" title="Editar Meta"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => onDeleteGoal(goal.id, goal.name)} className="text-gray-400 hover:text-rose-500" title="Eliminar Meta"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 py-4">No has añadido ninguna meta todavía.</p>
                        )}
                    </div>
                </div>
            </div>
            <AddGoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} goalToEdit={selectedGoal} />
            <AddAccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} accountToEdit={selectedAccount} />
        </>
    );
};

export default SettingsView;