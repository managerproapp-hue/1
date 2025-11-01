import React, { useState } from 'react';
import { PlusCircleIcon, PencilIcon, TrashIcon, SparklesIcon, ChevronLeftIcon } from '../icons';
import { useAppContext } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
import AddAutomationRuleModal from '../modals/AddAutomationRuleModal';
import { AutomationRule, TransactionType } from '../../types';

interface AutomationRulesViewProps {
    onBack: () => void;
}

const AutomationRulesView: React.FC<AutomationRulesViewProps> = ({ onBack }) => {
    const { automationRules, handleDeleteAutomationRule, categories, handleApplyRulesToAllTransactions } = useAppContext();
    const { addToast } = useToast();
    const { confirm } = useModal();

    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [selectedRule, setSelectedRule] = useState<AutomationRule | undefined>(undefined);

    const onDeleteRule = async (rule: AutomationRule) => {
        const confirmed = await confirm('Eliminar Regla', `¿Seguro que quieres eliminar la regla para "${rule.keyword}"?`);
        if (confirmed) {
            handleDeleteAutomationRule(rule.id);
            addToast({ type: 'success', message: 'Regla de automatización eliminada.' });
        }
    };

    const handleGlobalApply = async () => {
        const confirmed = await confirm(
            'Aplicar Reglas a Todo', 
            `Esto recorrerá TODAS tus transacciones y aplicará las reglas. Puede tardar unos segundos. ¿Estás seguro?`
        );
        if (confirmed) {
            const updatedCount = handleApplyRulesToAllTransactions();
            if (updatedCount > 0) {
                addToast({ type: 'success', message: `Se actualizaron ${updatedCount} transacciones en toda la base de datos.` });
            } else {
                addToast({ type: 'info', message: 'No se encontraron nuevas transacciones para actualizar.' });
            }
        }
    };
    
    return (
        <>
            <div className="space-y-6 max-w-4xl mx-auto">
                <button onClick={onBack} className="flex items-center space-x-2 text-sm text-violet-400 hover:text-violet-300 font-semibold mb-4">
                    <ChevronLeftIcon className="w-5 h-5" />
                    <span>Volver</span>
                </button>

                <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-violet-400" />
                        Reglas de Automatización
                    </h2>
                    <p className="text-gray-400 mb-4 text-sm">Ahorra tiempo enseñando a la app cómo categorizar tus importaciones. Las reglas se aplican automáticamente al subir un archivo o al hacer clic en "Re-aplicar Reglas".</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <button onClick={() => { setSelectedRule(undefined); setIsRuleModalOpen(true); }} className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg">
                            <PlusCircleIcon className="w-5 h-5" />
                            <span>Crear Nueva Regla</span>
                        </button>
                        <button onClick={handleGlobalApply} className="w-full flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg">
                            <SparklesIcon className="w-5 h-5" />
                            <span>Aplicar a TODA la Base de Datos</span>
                        </button>
                    </div>
                    <div className="space-y-2">
                        {automationRules.map(rule => (
                            <div key={rule.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                                <div>
                                    <p className="font-semibold text-white">Si la descripción contiene: <span className="font-bold text-violet-300">"{rule.keyword}"</span></p>
                                    <p className="text-sm text-gray-400">Asignar a la categoría de {rule.type === TransactionType.EXPENSE ? 'gasto' : 'ingreso'}: <span className="font-semibold text-gray-200">{categories.find(c => c.id === rule.categoryId)?.name || 'N/A'}</span></p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button onClick={() => { setSelectedRule(rule); setIsRuleModalOpen(true); }} className="text-gray-400 hover:text-violet-400"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => onDeleteRule(rule)} className="text-gray-400 hover:text-rose-500"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                         {automationRules.length === 0 && (
                            <p className="text-center text-gray-500 py-4">No has creado ninguna regla de automatización todavía.</p>
                        )}
                    </div>
                </div>
            </div>
            <AddAutomationRuleModal isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)} ruleToEdit={selectedRule} />
        </>
    );
};

export default AutomationRulesView;