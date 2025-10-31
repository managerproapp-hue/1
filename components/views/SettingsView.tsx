import React, { useState } from 'react';
import { PlusCircleIcon } from '../icons';
import { useAppContext } from '../../contexts/AppContext';

const SettingsView: React.FC = () => {
    const { expenseCategories, handleAddCategory, handleDeleteCategory } = useAppContext();
    const [newCategory, setNewCategory] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleAddCategory(newCategory);
        setNewCategory('');
    };

    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg max-w-lg mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Gestionar Categorías de Gasto</h2>
            <form onSubmit={handleSubmit} className="flex space-x-2 mb-6">
                <input 
                    type="text" 
                    value={newCategory} 
                    onChange={(e) => setNewCategory(e.target.value)} 
                    placeholder="Nueva categoría" 
                    className="flex-grow bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500"
                />
                <button 
                    type="submit" 
                    className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                    <PlusCircleIcon className="w-5 h-5" /><span>Añadir</span>
                </button>
            </form>
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-2">Categorías Actuales</h3>
                {expenseCategories.map(cat => (
                    <div key={cat} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                        <span>{cat}</span>
                        {cat !== 'Sin Categorizar' && (
                            <button onClick={() => handleDeleteCategory(cat)} className="text-rose-500 hover:text-rose-400 text-xs font-bold">
                                ELIMINAR
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SettingsView;
