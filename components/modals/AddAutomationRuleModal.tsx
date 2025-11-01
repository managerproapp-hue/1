import React, { useState, useEffect } from 'react';
import { AutomationRule, TransactionType, Category } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { XIcon } from '../icons';

interface AddAutomationRuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    ruleToEdit?: AutomationRule;
}

const AddAutomationRuleModal: React.FC<AddAutomationRuleModalProps> = ({ isOpen, onClose, ruleToEdit }) => {
    const { categories, handleAddAutomationRule, handleUpdateAutomationRule } = useAppContext();
    const { addToast } = useToast();
    const isEditMode = !!ruleToEdit;
    
    const [keyword, setKeyword] = useState('');
    const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
    const [categoryId, setCategoryId] = useState('');
    
    const relevantCategories = categories.filter(c => c.type === type);

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setKeyword(ruleToEdit.keyword);
                setType(ruleToEdit.type);
                setCategoryId(ruleToEdit.categoryId);
            } else {
                setKeyword('');
                setType(TransactionType.EXPENSE);
                setCategoryId(relevantCategories.find(c => c.type === TransactionType.EXPENSE)?.id || '');
            }
        }
    }, [isOpen, ruleToEdit, isEditMode, categories]);
    
    useEffect(() => {
        if (!isEditMode) {
            setCategoryId(relevantCategories[0]?.id || '');
        }
    }, [type, isEditMode, relevantCategories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyword.trim() || !categoryId) {
            addToast({ type: 'error', message: 'La palabra clave y la categoría son obligatorias.' }); return;
        }
        const ruleData = { keyword: keyword.trim(), categoryId, type };
        const result = isEditMode ? handleUpdateAutomationRule({ ...ruleData, id: ruleToEdit.id }) : handleAddAutomationRule(ruleData);
        if (result.success) {
            addToast({ type: 'success', message: `Regla ${isEditMode ? 'actualizada' : 'creada'} con éxito.` }); onClose();
        } else { addToast({ type: 'error', message: result.message! }); }
    };

    const renderCategoryOptions = () => {
        const rootCategories = relevantCategories.filter(c => c.parentId === null);
        // FIX: Replaced JSX.Element with React.ReactElement to resolve namespace issue.
        const options: React.ReactElement[] = [];
        rootCategories.forEach(root => {
            options.push(<option key={root.id} value={root.id} className="font-bold">{root.name}</option>);
            const children = relevantCategories.filter(c => c.parentId === root.id);
            children.forEach(child => {
                 options.push(<option key={child.id} value={child.id}>&nbsp;&nbsp;&nbsp;{child.name}</option>);
            });
        });
        return options;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg relative border border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-semibold">{isEditMode ? 'Editar' : 'Crear'} Regla de Automatización</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Cerrar modal"><XIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div><label htmlFor="rule-keyword" className="block text-sm font-medium mb-1">Si la descripción contiene...</label><input id="rule-keyword" type="text" value={keyword} onChange={e => setKeyword(e.target.value)} required placeholder="Ej: Netflix, Mercadona" className="w-full input-style" /></div>
                    <div><label className="block text-sm font-medium mb-1">Para el tipo de transacción...</label><div className="flex space-x-4 items-center h-full"><label className="flex items-center"><input type="radio" name="type" value={TransactionType.EXPENSE} checked={type === TransactionType.EXPENSE} onChange={() => setType(TransactionType.EXPENSE)} className="radio-style" /><span className="ml-2">Gasto</span></label><label className="flex items-center"><input type="radio" name="type" value={TransactionType.INCOME} checked={type === TransactionType.INCOME} onChange={() => setType(TransactionType.INCOME)} className="radio-style" /><span className="ml-2">Ingreso</span></label></div></div>
                    <div><label htmlFor="rule-category" className="block text-sm font-medium mb-1">Asignar a la categoría...</label><select id="rule-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="w-full input-style">{renderCategoryOptions()}</select></div>
                    <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">{isEditMode ? 'Guardar Cambios' : 'Crear Regla'}</button></div>
                </form>
            </div>
            <style>{`.input-style { background-color: #334155; border: 1px solid #475569; border-radius: 0.375rem; padding: 0.5rem 0.75rem; color: white; transition: border-color 0.2s; } .input-style:focus { outline: none; border-color: #8b5cf6; ring: 1; ring-color: #8b5cf6; } .radio-style { height: 1rem; width: 1rem; color: #8b5cf6; background-color: #334155; border-color: #475569; } .radio-style:focus { ring: #8b5cf6; } .btn-primary { background-color: #7c3aed; font-weight: bold; padding: 0.5rem 1.5rem; border-radius: 0.5rem; transition: background-color 0.2s; } .btn-primary:hover { background-color: #6d28d9; } .btn-secondary { background-color: #475569; font-weight: 600; padding: 0.5rem 1.5rem; border-radius: 0.5rem; transition: background-color 0.2s; } .btn-secondary:hover { background-color: #64748b; }`}</style>
        </div>
    );
};
export default AddAutomationRuleModal;