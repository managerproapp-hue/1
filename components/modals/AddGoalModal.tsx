import React, { useState, useEffect } from 'react';
import { Goal } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { XIcon } from '../icons';

interface AddGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    goalToEdit?: Goal;
}

const AddGoalModal: React.FC<AddGoalModalProps> = ({ isOpen, onClose, goalToEdit }) => {
    const { expenseCategories, handleAddGoal, handleUpdateGoal } = useAppContext();
    const isEditMode = !!goalToEdit;

    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState<number | ''>('');
    const [linkedCategory, setLinkedCategory] = useState(expenseCategories.includes('Ahorros') ? 'Ahorros' : expenseCategories[0]);

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setName(goalToEdit.name);
                setTargetAmount(goalToEdit.targetAmount);
                setLinkedCategory(goalToEdit.linkedCategory);
            } else {
                setName('');
                setTargetAmount('');
                setLinkedCategory(expenseCategories.includes('Ahorros') ? 'Ahorros' : expenseCategories[0]);
            }
        }
    }, [isOpen, goalToEdit, isEditMode, expenseCategories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || targetAmount === '' || targetAmount <= 0) {
            alert('Por favor, complete el nombre y un objetivo válido.');
            return;
        }

        const goalData = { name, targetAmount: targetAmount as number, linkedCategory };
        
        if (isEditMode) {
            handleUpdateGoal({ ...goalData, id: goalToEdit.id });
        } else {
            handleAddGoal(goalData);
        }

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg relative border border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-semibold">{isEditMode ? 'Editar' : 'Añadir Nueva'} Meta Financiera</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Cerrar modal">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="goal-name" className="block text-sm font-medium text-gray-300 mb-1">Nombre de la Meta</label>
                        <input type="text" id="goal-name" value={name} onChange={e => setName(e.target.value)} required placeholder="Ej: Viaje a Japón" className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500" />
                    </div>
                    <div>
                        <label htmlFor="goal-amount" className="block text-sm font-medium text-gray-300 mb-1">Monto Objetivo (€)</label>
                        <input type="number" id="goal-amount" value={targetAmount} onChange={e => setTargetAmount(parseFloat(e.target.value) || '')} min="1" step="any" required placeholder="0.00" className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500" />
                    </div>
                    <div>
                        <label htmlFor="goal-category" className="block text-sm font-medium text-gray-300 mb-1">Vincular a Categoría</label>
                        <select id="goal-category" value={linkedCategory} onChange={e => setLinkedCategory(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500">
                            {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">El progreso se calculará sumando las transacciones de esta categoría.</p>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">{isEditMode ? 'Guardar Cambios' : 'Guardar Meta'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddGoalModal;
