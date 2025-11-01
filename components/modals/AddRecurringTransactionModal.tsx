import React, { useState, useEffect } from 'react';
import { RecurringTransaction, TransactionType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { XIcon } from '../icons';

interface AddRecurringTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    recurringTransactionToEdit?: RecurringTransaction;
}

const AddRecurringTransactionModal: React.FC<AddRecurringTransactionModalProps> = ({ isOpen, onClose, recurringTransactionToEdit }) => {
    const { 
        accounts, expenseCategories, incomeCategories, 
        handleAddRecurringTransaction, handleUpdateRecurringTransaction 
    } = useAppContext();
    const isEditMode = !!recurringTransactionToEdit;

    const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];
    
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
    const [category, setCategory] = useState('');
    const [accountId, setAccountId] = useState('');
    const [dayOfMonth, setDayOfMonth] = useState<number | ''>(1);
    const [startDate, setStartDate] = useState(formatDateForInput(new Date()));
    const [endDate, setEndDate] = useState('');
    const [hasEndDate, setHasEndDate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setDescription(recurringTransactionToEdit.description);
                setAmount(recurringTransactionToEdit.amount);
                setType(recurringTransactionToEdit.type);
                setCategory(recurringTransactionToEdit.category);
                setAccountId(recurringTransactionToEdit.accountId);
                setDayOfMonth(recurringTransactionToEdit.dayOfMonth);
                setStartDate(formatDateForInput(new Date(recurringTransactionToEdit.startDate)));
                setHasEndDate(!!recurringTransactionToEdit.endDate);
                setEndDate(recurringTransactionToEdit.endDate ? formatDateForInput(new Date(recurringTransactionToEdit.endDate)) : '');
            } else {
                // Reset form for new entry
                setDescription('');
                setAmount('');
                setType(TransactionType.EXPENSE);
                setCategory(expenseCategories[0] || '');
                setAccountId(accounts[0]?.id || '');
                setDayOfMonth(1);
                setStartDate(formatDateForInput(new Date()));
                setEndDate('');
                setHasEndDate(false);
            }
        }
    }, [isOpen, recurringTransactionToEdit, isEditMode, expenseCategories, accounts]);
    
    useEffect(() => {
        // Auto-switch category list when type changes in "add" mode
        if (!isEditMode) {
            setCategory(type === TransactionType.EXPENSE ? (expenseCategories[0] || '') : (incomeCategories[0] || ''));
        }
    }, [type, isEditMode, expenseCategories, incomeCategories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || amount === '' || amount <= 0 || !accountId || dayOfMonth === '' || dayOfMonth < 1 || dayOfMonth > 31) {
            alert('Por favor, complete todos los campos requeridos correctamente.');
            return;
        }

        const recurringData: Omit<RecurringTransaction, 'id'> = {
            description,
            amount: amount as number,
            type,
            category,
            accountId,
            frequency: 'monthly',
            dayOfMonth: dayOfMonth as number,
            startDate: new Date(`${startDate}T00:00:00`),
            endDate: hasEndDate && endDate ? new Date(`${endDate}T00:00:00`) : undefined,
        };
        
        if (isEditMode) {
            handleUpdateRecurringTransaction({ ...recurringData, id: recurringTransactionToEdit.id });
        } else {
            handleAddRecurringTransaction(recurringData);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg relative border border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-semibold">{isEditMode ? 'Editar' : 'Añadir'} Transacción Recurrente</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Cerrar modal"><XIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    {/* Basic Info */}
                    <div><label htmlFor="rec-desc" className="block text-sm font-medium mb-1">Descripción</label><input id="rec-desc" type="text" value={description} onChange={e => setDescription(e.target.value)} required className="w-full input-style" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label htmlFor="rec-amount" className="block text-sm font-medium mb-1">Monto (€)</label><input id="rec-amount" type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || '')} min="0.01" step="0.01" required className="w-full input-style" /></div>
                        <div><label className="block text-sm font-medium mb-1">Tipo</label><div className="flex space-x-4 items-center h-full"><label className="flex items-center"><input type="radio" name="type" value={TransactionType.EXPENSE} checked={type === TransactionType.EXPENSE} onChange={() => setType(TransactionType.EXPENSE)} className="radio-style" /><span className="ml-2">Gasto</span></label><label className="flex items-center"><input type="radio" name="type" value={TransactionType.INCOME} checked={type === TransactionType.INCOME} onChange={() => setType(TransactionType.INCOME)} className="radio-style" /><span className="ml-2">Ingreso</span></label></div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label htmlFor="rec-account" className="block text-sm font-medium mb-1">Cuenta</label><select id="rec-account" value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full input-style">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName}</option>)}</select></div>
                        <div><label htmlFor="rec-category" className="block text-sm font-medium mb-1">Categoría</label><select id="rec-category" value={category} onChange={e => setCategory(e.target.value)} required className="w-full input-style">{(type === TransactionType.EXPENSE ? expenseCategories : incomeCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                    </div>

                    {/* Recurrence Rules */}
                    <div className="border-t border-slate-700 pt-4">
                        <h3 className="text-lg font-semibold mb-2">Reglas de Recurrencia</h3>
                        <div className="grid grid-cols-2 gap-4">
                             <div><label htmlFor="rec-day" className="block text-sm font-medium mb-1">Día del Mes</label><input id="rec-day" type="number" value={dayOfMonth} onChange={e => setDayOfMonth(parseInt(e.target.value) || '')} min="1" max="31" required className="w-full input-style" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div><label htmlFor="rec-start" className="block text-sm font-medium mb-1">Fecha de Inicio</label><input id="rec-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full input-style" /></div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha de Fin</label>
                                <div className="flex items-center space-x-2"><input type="checkbox" checked={hasEndDate} onChange={e => setHasEndDate(e.target.checked)} className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"/><span>Establecer fin</span></div>
                            </div>
                        </div>
                        {hasEndDate && <div className="mt-4"><label htmlFor="rec-end" className="block text-sm font-medium mb-1">Fecha Final</label><input id="rec-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required={hasEndDate} className="w-full input-style" /></div>}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">{isEditMode ? 'Guardar Cambios' : 'Guardar'}</button></div>
                </form>
            </div>
            <style>{`
                .input-style { background-color: #334155; border: 1px solid #475569; border-radius: 0.375rem; padding: 0.5rem 0.75rem; color: white; transition: border-color 0.2s; }
                .input-style:focus { outline: none; border-color: #8b5cf6; ring: 1; ring-color: #8b5cf6; }
                .radio-style { height: 1rem; width: 1rem; color: #8b5cf6; background-color: #334155; border-color: #475569; }
                .radio-style:focus { ring: #8b5cf6; }
                .btn-primary { background-color: #7c3aed; font-weight: bold; padding: 0.5rem 1.5rem; border-radius: 0.5rem; transition: background-color 0.2s; }
                .btn-primary:hover { background-color: #6d28d9; }
                .btn-secondary { background-color: #475569; font-weight: 600; padding: 0.5rem 1.5rem; border-radius: 0.5rem; transition: background-color 0.2s; }
                .btn-secondary:hover { background-color: #64748b; }
            `}</style>
        </div>
    );
};

export default AddRecurringTransactionModal;