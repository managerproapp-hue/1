import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { useDropzone } from 'react-dropzone';
import { useAppContext } from '../contexts/AppContext';
import { Transaction, TransactionType, StagedTransaction, ProcessingError } from '../types';
import { UploadCloudIcon, SparklesIcon, SpinnerIcon, FileIcon, XIcon, TrashIcon } from './icons';

// Declarar tipos de ventana para librerías de CDN para satisfacer a TypeScript
declare global {
  interface Window {
    pdfjsLib: any;
    XLSX: any;
  }
}

// Configurar el worker para pdf.js para asegurar compatibilidad
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js`;
}

const API_KEY = process.env.API_KEY;

const ImportView: React.FC = () => {
    const { expenseCategories, handleConfirmImport, accounts } = useAppContext();
    const [file, setFile] = useState<File | null>(null);
    const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>([]);
    const [processingErrors, setProcessingErrors] = useState<ProcessingError[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [selectedAccount, setSelectedAccount] = useState<string>(accounts.length > 0 ? accounts[0].id : '');

    const resetState = () => {
        setFile(null);
        setStagedTransactions([]);
        setProcessingErrors([]);
        setIsLoading(false);
        setLoadingMessage('');
    };

    const extractTextFromFile = async (fileToProcess: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    if (fileToProcess.type === 'application/pdf') {
                        if (!window.pdfjsLib) return reject(new Error('La librería PDF (pdf.js) no se ha cargado.'));
                        setLoadingMessage('Extrayendo texto de PDF...');
                        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                        }
                        resolve(fullText);
                    } else if (fileToProcess.name.endsWith('.xlsx')) {
                         if (!window.XLSX) return reject(new Error('La librería Excel (XLSX) no se ha cargado.'));
                        setLoadingMessage('Procesando archivo Excel...');
                        const workbook = window.XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        resolve(window.XLSX.utils.sheet_to_csv(worksheet));
                    } else {
                        setLoadingMessage('Leyendo archivo de texto...');
                        const textReader = new FileReader();
                        textReader.onload = (e) => resolve(e.target?.result as string);
                        textReader.onerror = (e) => reject(new Error("No se pudo leer el archivo de texto."));
                        textReader.readAsText(fileToProcess);
                    }
                } catch (error) { reject(error); }
            };
            reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
            reader.readAsArrayBuffer(fileToProcess);
        });
    };
    
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0];
        if (!selectedFile) return;

        if (accounts.length > 0 && !selectedAccount) {
            alert('Por favor, selecciona una cuenta para asociar las transacciones.');
            return;
        }

        setFile(selectedFile);
        setIsLoading(true);
        setStagedTransactions([]);
        setProcessingErrors([]);

        try {
            const textContent = await extractTextFromFile(selectedFile);
            await processWithAI(textContent);
        } catch (error) {
            console.error("Error en el proceso de importación:", error);
            const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
            setProcessingErrors([{ rawData: 'General', reason: `Error al procesar el archivo: ${errorMessage}` }]);
            setIsLoading(false);
        }
    }, [accounts, selectedAccount]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        maxFiles: 1,
    });
    
    const processWithAI = async (fileContent: string) => {
        setLoadingMessage('La IA está analizando los datos...');
        const selectedAccountInfo = accounts.find(a => a.id === selectedAccount);
        const source = selectedAccountInfo ? `${selectedAccountInfo.bankName} - ${selectedAccountInfo.accountName}` : 'Importado';

        const responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING, description: 'Fecha de la transacción en formato YYYY-MM-DD.' },
                    description: { type: Type.STRING, description: 'Descripción detallada de la transacción.' },
                    amount: { type: Type.NUMBER, description: 'Monto de la transacción. Positivo para ingresos, negativo para gastos.' },
                    category: { type: Type.STRING, description: `Categoría del gasto. Elige una de estas: ${expenseCategories.join(', ')}.` },
                }, required: ['date', 'description', 'amount'],
            },
        };
        
        try {
            const prompt = `Analiza el siguiente extracto bancario y extrae todas las transacciones. El monto debe ser negativo para gastos y positivo para ingresos. Asigna la categoría más adecuada para los gastos de entre las siguientes opciones: ${expenseCategories.join(', ')}. Para los ingresos, la categoría siempre debe ser 'Ingresos'. Si no puedes determinar una categoría para un gasto, usa 'Sin Categorizar'. La fecha debe estar en formato YYYY-MM-DD. Aquí está el extracto:\n\n${fileContent}`;
            
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt,
                config: { responseMimeType: 'application/json', responseSchema: responseSchema },
            });
            
            const jsonText = response.text.trim();
            const parsedTransactions = JSON.parse(jsonText);

            const newStagedTransactions: StagedTransaction[] = parsedTransactions.map((t: any, index: number) => {
                const amount = parseFloat(t.amount);
                const type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
                const isValidDate = t.date && !isNaN(new Date(t.date).getTime());
                return {
                    id: `staged-${Date.now()}-${index}`,
                    date: isValidDate ? t.date : new Date().toISOString().split('T')[0],
                    description: t.description || 'Descripción no encontrada',
                    amount: Math.abs(amount), type,
                    category: type === TransactionType.INCOME ? 'Ingresos' : (expenseCategories.includes(t.category) ? t.category : 'Sin Categorizar'),
                    isValid: !!(isValidDate && t.description && !isNaN(amount)), source,
                };
            });
            setStagedTransactions(newStagedTransactions);

        } catch (error) {
            console.error('Error procesando con Gemini:', error);
            const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
            setProcessingErrors([{ rawData: 'General', reason: `Error al contactar con el servicio de IA. ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleStagedChange = (id: string, field: keyof StagedTransaction, value: any) => {
        setStagedTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };
    
    const deleteStaged = (id: string) => {
        setStagedTransactions(prev => prev.filter(t => t.id !== id));
    };

    const confirmAndImport = () => {
        const transactionsToImport: Transaction[] = stagedTransactions
            .filter(t => t.isValid)
            .map(({ id, isValid, ...rest }) => ({
                id: crypto.randomUUID(),
                ...rest,
                date: new Date(`${rest.date}T00:00:00`),
            }));

        if (transactionsToImport.length > 0) {
            handleConfirmImport(transactionsToImport);
            resetState();
        } else {
            alert("No hay transacciones válidas para importar.");
        }
    };

    if (!API_KEY) {
        return (
            <div className="bg-rose-900/50 p-6 rounded-xl shadow-lg border border-rose-700 text-center">
                <h2 className="text-2xl font-semibold mb-2 text-rose-300">Error de Configuración</h2>
                <p className="text-rose-300">La clave de API de Google no está configurada. La importación inteligente está desactivada.</p>
                <p className="text-rose-400 mt-2">Por favor, asegúrate de que la variable de entorno <code className="bg-rose-800/50 px-2 py-1 rounded text-sm">API_KEY</code> esté definida en la configuración de tu proyecto en Vercel.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-2">Importación Automática</h2>
                <p className="text-gray-400 mb-4">Sube un archivo (.xlsx, .csv, .pdf). La IA lo analizará y preparará para importar.</p>
                
                {accounts.length > 0 ? (
                    <div className="mb-4">
                        <label htmlFor="account-select" className="block text-sm font-medium text-gray-300 mb-1">1. Selecciona una cuenta</label>
                        <select id="account-select" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} disabled={isLoading} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500 disabled:opacity-50">
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName}</option>)}
                        </select>
                    </div>
                ) : (
                     <div className="mb-4 p-4 bg-blue-900/50 rounded-lg border border-blue-700 text-center">
                        <p className="text-blue-300">Por favor, <a href="#" onClick={(e) => { e.preventDefault(); alert("Navega a la pestaña 'Configuración' para añadir tus cuentas."); }} className="font-semibold underline hover:text-blue-200">añade una cuenta bancaria</a> en la configuración antes de importar.</p>
                    </div>
                )}
                
                <label className="block text-sm font-medium text-gray-300 mb-1">2. Sube tu archivo</label>
                {!file ? (
                    <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-center ${isDragActive ? 'border-violet-500 bg-violet-900/50' : 'border-slate-600 hover:border-violet-500'} ${accounts.length === 0 || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input {...getInputProps()} disabled={accounts.length === 0 || isLoading} />
                        <UploadCloudIcon className="w-12 h-12 mx-auto text-gray-500 mb-2"/>
                        <p>Arrastra un archivo aquí, o haz clic para seleccionarlo.</p>
                        <p className="text-xs text-gray-500">(.xlsx, .csv, .pdf)</p>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <FileIcon className="w-6 h-6 text-violet-400"/>
                            <span className="font-semibold">{file.name}</span>
                        </div>
                        <button onClick={resetState} className="text-gray-400 hover:text-white"><XIcon className="w-5 h-5"/></button>
                    </div>
                )}
                 {isLoading && (
                    <div className="mt-4 text-center flex items-center justify-center space-x-2 text-violet-300">
                        <SpinnerIcon className="w-5 h-5 animate-spin"/>
                        <span>{loadingMessage || 'Procesando...'}</span>
                    </div>
                )}
            </div>

             {processingErrors.length > 0 && (
                <div className="bg-rose-900/50 p-4 rounded-lg border border-rose-700">
                    <h3 className="font-semibold text-rose-300 mb-2">Errores de Procesamiento</h3>
                    {processingErrors.map((err, i) => (
                        <p key={i} className="text-sm text-rose-300">{err.reason}</p>
                    ))}
                </div>
            )}
            
            {stagedTransactions.length > 0 && (
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-4">Revisa las Transacciones Encontradas</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-700 text-gray-400">
                                    <th className="p-2">Fecha</th>
                                    <th className="p-2">Descripción</th>
                                    <th className="p-2 text-right">Monto</th>
                                    <th className="p-2">Categoría</th>
                                    <th className="p-2 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stagedTransactions.map(t => (
                                    <tr key={t.id} className={`border-b border-slate-700 ${!t.isValid ? 'bg-rose-900/30' : ''}`}>
                                        <td className="p-2"><input type="date" value={t.date} onChange={e => handleStagedChange(t.id, 'date', e.target.value)} className="bg-slate-700 rounded-md p-1 w-full"/></td>
                                        <td className="p-2"><input type="text" value={t.description} onChange={e => handleStagedChange(t.id, 'description', e.target.value)} className="bg-slate-700 rounded-md p-1 w-full"/></td>
                                        <td className="p-2 text-right"><input type="number" value={t.amount} onChange={e => handleStagedChange(t.id, 'amount', parseFloat(e.target.value) || 0)} className="bg-slate-700 rounded-md p-1 w-24 text-right"/></td>
                                        <td className="p-2">
                                            {t.type === TransactionType.EXPENSE ? (
                                                <select value={t.category} onChange={e => handleStagedChange(t.id, 'category', e.target.value)} className="bg-slate-700 rounded-md p-1 w-full">
                                                    {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-900/50 text-emerald-300">Ingreso</span>
                                            )}
                                        </td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => deleteStaged(t.id)} className="text-gray-400 hover:text-rose-500" title="Eliminar"><TrashIcon className="w-4 h-4 mx-auto"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <div className="flex justify-end mt-6 space-x-4">
                        <button onClick={resetState} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Cancelar</button>
                        <button onClick={confirmAndImport} className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                            <SparklesIcon className="w-5 h-5"/>
                            <span>Confirmar e Importar</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportView;
