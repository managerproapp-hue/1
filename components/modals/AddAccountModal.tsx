import React, { useState, useEffect } from 'react';
import { Account } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { XIcon } from '../icons';

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountToEdit?: Account;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, accountToEdit }) => {
    const { handleAddAccount, handleUpdateAccount } = useAppContext();
    const isEditMode = !!accountToEdit;

    const [bankName, setBankName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setBankName(accountToEdit.bankName);
                setAccountName(accountToEdit.accountName);
                setAccountNumber(accountToEdit.accountNumber || '');
            } else {
                setBankName('');
                setAccountName('');
                setAccountNumber('');
            }
        }
    }, [isOpen, accountToEdit, isEditMode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!bankName || !accountName) {
            alert('El nombre del banco y el nombre de la cuenta son obligatorios.');
            return;
        }

        const accountData = { bankName, accountName, accountNumber };
        
        if (isEditMode) {
            handleUpdateAccount({ ...accountData, id: accountToEdit.id });
        } else {
            handleAddAccount(accountData);
        }

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg relative border border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-semibold">{isEditMode ? 'Editar' : 'Añadir Nueva'} Cuenta Bancaria</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Cerrar modal">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="bank-name" className="block text-sm font-medium text-gray-300 mb-1">Nombre del Banco</label>
                        <input type="text" id="bank-name" value={bankName} onChange={e => setBankName(e.target.value)} required placeholder="Ej: BBVA, Santander" className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500" />
                    </div>
                     <div>
                        <label htmlFor="account-name" className="block text-sm font-medium text-gray-300 mb-1">Nombre de la Cuenta</label>
                        <input type="text" id="account-name" value={accountName} onChange={e => setAccountName(e.target.value)} required placeholder="Ej: Cuenta Nómina, Ahorros" className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500" />
                    </div>
                    <div>
                        <label htmlFor="account-number" className="block text-sm font-medium text-gray-300 mb-1">Número de Cuenta (Opcional)</label>
                        <input type="text" id="account-number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="ESXX..." className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500" />
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">{isEditMode ? 'Guardar Cambios' : 'Guardar Cuenta'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAccountModal;