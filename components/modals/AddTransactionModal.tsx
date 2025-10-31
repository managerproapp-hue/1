import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { XIcon } from '../icons';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionToEdit?: Transaction;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, transactionToEdit }) => {
    const { accounts, expenseCategories, incomeCategories, handleAddTransaction, handleUpdateTransaction } = useAppContext();
    const isEditMode = !!transactionToEdit;

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const [date, setDate] = useState(formatDate(new Date()));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
    const [category, setCategory] = useState('');
    const [accountId, setAccountId] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setDate(formatDate(new Date(transactionToEdit.date)));
                setDescription(transactionToEdit.description);
                setAmount(transactionToEdit.amount);
                setType(transactionToEdit.type);
                setCategory(transactionToEdit.category);
                setAccountId(transactionToEdit.accountId || '');
            } else {
                setDate(formatDate(new Date()));
                setDescription('');
                setAmount('');
                setType(TransactionType.EXPENSE);
                setCategory(expenseCategories[0] || 'Sin Categorizar');
                setAccountId(accounts[0]?.id || '');
            }
        }
    }, [isOpen, transactionToEdit, isEditMode, expenseCategories, accounts, incomeCategories]);

    useEffect(() => {
        if (!isEditMode) {
            if (type === TransactionType.EXPENSE) {
                setCategory(expenseCategories[0] || 'Sin Categorizar');
            } else {
                setCategory(incomeCategories[0] || 'Ingresos Varios');
            }
        }
    }, [type, isEditMode, expenseCategories, incomeCategories]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || amount === '' || amount <= 0 || !accountId) {
            alert('Por favor, complete todos los campos requeridos, incluyendo la cuenta.');
            return;
        }

        const transactionData = {
            date: new Date(`${date}T00:00:00`),
            description,
            amount: amount as number,
            type,
            category,
            accountId,
        };
        
        if (isEditMode) {
            handleUpdateTransaction({ ...transactionData, id: transactionToEdit.id });
        } else {
            handleAddTransaction(transactionData);
        }

        onClose();
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg relative border border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-semibold">{isEditMode ? 'Editar' : 'Añadir Nueva'} Transacción</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Cerrar modal">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">Fecha</label>
                            <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500" />
                        </div>
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">Monto (€)</label>
                            <input type="number" id="amount" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || '')} min="0.01" step="0.01" required placeholder="0.00" className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                        <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ej: Compra en supermercado" className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
                            <div className="flex space-x-4 items-center h-full">
                                <label className="flex items-center">
                                    <input type="radio" name="type" value={TransactionType.EXPENSE} checked={type === TransactionType.EXPENSE} onChange={() => setType(TransactionType.EXPENSE)} className="h-4 w-4 text-violet-600 bg-slate-700 border-slate-600 focus:ring-violet-500"/>
                                    <span className="ml-2 text-white">Gasto</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="radio" name="type" value={TransactionType.INCOME} checked={type === TransactionType.INCOME} onChange={() => setType(TransactionType.INCOME)} className="h-4 w-4 text-violet-600 bg-slate-700 border-slate-600 focus:ring-violet-500"/>
                                    <span className="ml-2 text-white">Ingreso</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="account" className="block text-sm font-medium text-gray-300 mb-1">Cuenta</label>
                            <select id="account" value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500">
                                {accounts.length === 0 ? (
                                    <option value="" disabled>Crea una cuenta primero</option>
                                ) : (
                                    accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName}</option>)
                                )}
                            </select>
                        </div>
                    </div>
                    
                    {type === TransactionType.EXPENSE && (
                         <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">Categoría de Gasto</label>
                            <select id="category" value={category} onChange={e => setCategory(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500">
                                {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    )}

                    {type === TransactionType.INCOME && (
                         <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">Categoría de Ingreso</label>
                            <select id="category" value={category} onChange={e => setCategory(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500">
                                {incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">{isEditMode ? 'Guardar Cambios' : 'Guardar Transacción'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTransactionModal;