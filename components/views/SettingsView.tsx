import React, { useState, useMemo } from 'react';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../icons';
import { useAppContext } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
import AddGoalModal from '../modals/AddGoalModal';
import AddAccountModal from '../modals/AddAccountModal';
import { Goal, Account, TransactionType, Category } from '../../types';

interface CategoryModalState {
    isOpen: boolean;
    isEdit: boolean;
    category?: Category;
    parentId?: string | null;
}

const CategoryManager: React.FC<{ type: TransactionType }> = ({ type }) => {
    const { categories, handleAddCategory, handleUpdateCategory, handleDeleteCategory } = useAppContext();
    const { addToast } = useToast();
    const { confirm } = useModal();

    const [modalState, setModalState] = useState<CategoryModalState>({ isOpen: false, isEdit: false });
    const [categoryName, setCategoryName] = useState('');
    
    const rootCategories = useMemo(() => categories.filter(c => c.type === type && c.parentId === null).sort((a,b) => a.name.localeCompare(b.name)), [categories, type]);
    const subCategories = useMemo(() => {
        const map = new Map<string, Category[]>();
        categories.filter(c => c.type === type && c.parentId !== null).forEach(c => {
            if (!map.has(c.parentId!)) map.set(c.parentId!, []);
            map.get(c.parentId!)!.push(c);
        });
        map.forEach(subCats => subCats.sort((a, b) => a.name.localeCompare(b.name)));
        return map;
    }, [categories, type]);

    const openModal = (isEdit = false, category?: Category, parentId: string | null = null) => {
        setCategoryName(isEdit ? category!.name : '');
        setModalState({ isOpen: true, isEdit, category, parentId });
    };

    const closeModal = () => { setModalState({ isOpen: false, isEdit: false }); setCategoryName(''); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { isEdit, category, parentId } = modalState;
        const result = isEdit 
            ? handleUpdateCategory({ ...category!, name: categoryName })
            : handleAddCategory({ name: categoryName, parentId: parentId!, type });

        if (result.success) {
            addToast({ type: 'success', message: `Categoría ${isEdit ? 'actualizada' : 'añadida'}.` });
            closeModal();
        } else {
            addToast({ type: 'error', message: result.message! });
        }
    };
    
    const onDelete = async (category: Category) => {
        if (category.id === 'cat-uncategorized' || category.id === 'cat-income-various') {
            addToast({ type: 'warning', message: 'No se puede eliminar la categoría por defecto.' }); return;
        }
        const message = subCategories.has(category.id) ? `¿Eliminar "${category.name}"? Esto NO eliminará sus subcategorías.` : `¿Eliminar "${category.name}"?`;
        const confirmed = await confirm('Eliminar Categoría', message);
        if (confirmed) {
            const result = handleDeleteCategory(category.id);
            if (result.success) addToast({ type: 'success', message: `Categoría "${category.name}" eliminada.` });
            else addToast({ type: 'error', message: result.message! });
        }
    };

    const renderCategory = (cat: Category, isSub: boolean) => (
         <div key={cat.id} className={`flex justify-between items-center bg-slate-700 p-2 rounded-md ${isSub ? 'ml-6' : ''}`}>
            <span>{cat.name}</span>
            <div className="flex items-center space-x-3">
                {!isSub && <button onClick={() => openModal(false, undefined, cat.id)} className="text-gray-400 hover:text-emerald-400"><PlusCircleIcon className="w-4 h-4"/></button>}
                <button onClick={() => openModal(true, cat)} className="text-gray-400 hover:text-violet-400"><PencilIcon className="w-4 h-4"/></button>
                <button onClick={() => onDelete(cat)} className="text-gray-400 hover:text-rose-500"><TrashIcon className="w-4 h-4"/></button>
            </div>
        </div>
    );
    
    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Categorías de {type === TransactionType.EXPENSE ? 'Gastos' : 'Ingresos'}</h2>
            <button onClick={() => openModal(false, undefined, null)} className="w-full flex items-center justify-center space-x-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded-lg mb-4">
                <PlusCircleIcon className="w-5 h-5"/><span>Añadir Categoría Principal</span>
            </button>
            <div className="space-y-2">
                {rootCategories.map(cat => (
                    <div key={cat.id} className="space-y-2">
                        {renderCategory(cat, false)}
                        {subCategories.get(cat.id)?.map(sub => renderCategory(sub, true))}
                    </div>
                ))}
            </div>
            {modalState.isOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={closeModal}>
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">{modalState.isEdit ? 'Editar' : 'Añadir'} Categoría</h3>
                        <form onSubmit={handleSubmit}>
                            <input type="text" value={categoryName} onChange={e => setCategoryName(e.target.value)} className="w-full bg-slate-700 p-2 rounded" autoFocus />
                            <div className="flex justify-end space-x-2 mt-4">
                                <button type="button" onClick={closeModal} className="px-4 py-2 rounded bg-slate-600">Cancelar</button>
                                <button type="submit" className="px-4 py-2 rounded bg-violet-600">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const SettingsView: React.FC = () => {
    const { goals, handleDeleteGoal, accounts, handleDeleteAccount } = useAppContext();
    const { addToast } = useToast(); const { confirm } = useModal();
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false); const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(undefined);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false); const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);
    
    const onDeleteGoal = async (id: string, name: string) => { const confirmed = await confirm('Eliminar Meta', `¿Estás seguro de que quieres eliminar la meta "${name}"?`); if (confirmed) { handleDeleteGoal(id); addToast({ type: 'success', message: 'Meta eliminada.' }); } };
    const onDeleteAccount = async (account: Account) => { const confirmed = await confirm('Eliminar Cuenta', `¿Estás seguro de que quieres eliminar la cuenta "${account.accountName}"? Esta acción no se puede deshacer.`); if (confirmed) { const result = handleDeleteAccount(account.id); if (result.success) { addToast({ type: 'success', message: `Cuenta "${account.accountName}" eliminada.` }); } else { addToast({ type: 'error', message: result.message! }); } } };
    
    return (
        <>
            <div className="space-y-8 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg"><h2 className="text-2xl font-semibold mb-4">Gestionar Cuentas Bancarias</h2><button onClick={() => { setSelectedAccount(undefined); setIsAccountModalOpen(true); }} className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg mb-4"><PlusCircleIcon className="w-5 h-5" /><span>Añadir Nueva Cuenta</span></button><div className="space-y-2">{accounts.map(acc => (<div key={acc.id} className="flex justify-between items-center bg-slate-700 p-2 rounded-md"><div><p>{acc.accountName}</p><p className="text-xs text-gray-400">{acc.bankName} {acc.accountNumber && `- ${acc.accountNumber}`}</p></div><div className="flex items-center space-x-3"><button onClick={() => { setSelectedAccount(acc); setIsAccountModalOpen(true); }} className="text-gray-400 hover:text-violet-400"><PencilIcon className="w-4 h-4" /></button><button onClick={() => onDeleteAccount(acc)} className="text-gray-400 hover:text-rose-500"><TrashIcon className="w-4 h-4" /></button></div></div>))}</div></div>
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg"><h2 className="text-2xl font-semibold mb-4">Gestionar Metas Financieras</h2><button onClick={() => { setSelectedGoal(undefined); setIsGoalModalOpen(true); }} className="w-full flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg mb-4"><PlusCircleIcon className="w-5 h-5" /><span>Añadir Nueva Meta</span></button><div className="space-y-2">{goals.map(goal => (<div key={goal.id} className="flex justify-between items-center bg-slate-700 p-2 rounded-md"><div><p>{goal.name}</p><p className="text-xs text-gray-400">Objetivo: €{goal.targetAmount.toLocaleString()}</p></div><div className="flex items-center space-x-3"><button onClick={() => { setSelectedGoal(goal); setIsGoalModalOpen(true); }} className="text-gray-400 hover:text-violet-400"><PencilIcon className="w-4 h-4" /></button><button onClick={() => onDeleteGoal(goal.id, goal.name)} className="text-gray-400 hover:text-rose-500"><TrashIcon className="w-4 h-4" /></button></div></div>))}</div></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <CategoryManager type={TransactionType.EXPENSE} />
                    <CategoryManager type={TransactionType.INCOME} />
                </div>
            </div>
            <AddGoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} goalToEdit={selectedGoal} />
            <AddAccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} accountToEdit={selectedAccount} />
        </>
    );
};
export default SettingsView;