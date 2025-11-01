import React, { useState, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { StagedTransaction, Transaction, TransactionType, Account, AutomationRule, Category } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SparklesIcon, SpinnerIcon, UploadCloudIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

declare const pdfjsLib: any;
declare global {
  interface Window { XLSX: any; }
}

type Step = 'upload' | 'mapping' | 'review';
type CSVMapping = { date: number | null; description: number | null; amount: number | null; };


const AiImportView: React.FC<{ 
    setActiveTab: (tab: 'dashboard' | 'settings') => void,
    onImportComplete: () => void;
}> = ({ setActiveTab, onImportComplete }) => {
    const { handleConfirmImport, categories, accounts, automationRules } = useAppContext();
    const { addToast } = useToast();
    
    const [step, setStep] = useState<Step>('upload');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [mapping, setMapping] = useState<CSVMapping>({ date: null, description: null, amount: null });
    const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>([]);

    const expenseCategories = useMemo(() => categories.filter(c => c.type === TransactionType.EXPENSE), [categories]);
    const incomeCategories = useMemo(() => categories.filter(c => c.type === TransactionType.INCOME), [categories]);
    const defaultExpenseCatId = 'cat-uncategorized';
    const defaultIncomeCatId = 'cat-income-various';
    
    const resetState = () => {
        setStep('upload'); setIsLoading(false); setLoadingMessage(''); setFile(null);
        setCsvHeaders([]); setCsvData([]); setMapping({ date: null, description: null, amount: null });
        setStagedTransactions([]);
    };

    const applyAutomationRules = (transactions: StagedTransaction[]): StagedTransaction[] => {
        const sortedRules = [...automationRules].sort((a, b) => b.keyword.length - a.keyword.length);
        if (sortedRules.length === 0) return transactions;

        return transactions.map(t => {
            for (const rule of sortedRules) {
                if (t.type === rule.type && t.description.toLowerCase().includes(rule.keyword.toLowerCase())) {
                    return { ...t, categoryId: rule.categoryId, automatedByRuleId: rule.id };
                }
            }
            return t;
        });
    };

    const processStructuredFile = (selectedFile: File) => {
        if (typeof window.XLSX === 'undefined') { addToast({ type: 'error', message: 'La librería para leer archivos Excel no está cargada.' }); return; }
        setLoadingMessage('Procesando archivo...'); setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
                const rows: string[][] = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" }).map(row => row.map(String));
                setCsvHeaders(rows[0]); setCsvData(rows.slice(1));
                const newMapping: CSVMapping = { date: null, description: null, amount: null };
                rows[0].forEach((h, i) => { const header = h.toLowerCase(); if (newMapping.date === null && (header.includes('fecha') || header.includes('date'))) newMapping.date = i; if (newMapping.description === null && (header.includes('descrip') || header.includes('concept'))) newMapping.description = i; if (newMapping.amount === null && (header.includes('importe') || header.includes('amount') || header.includes('monto'))) newMapping.amount = i; });
                setMapping(newMapping); setStep('mapping');
            } catch (error) { addToast({ type: 'error', message: 'Error al leer el archivo Excel/CSV.' }); } finally { setIsLoading(false); }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const processPdfFile = async (selectedFile: File) => {
        setLoadingMessage('Extrayendo texto del PDF...'); setIsLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let textContent = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent += text.items.map((s: any) => s.str).join(' ');
                }
                await processTextWithAI(textContent);
            };
            reader.readAsArrayBuffer(selectedFile);
        } catch (error) { addToast({ type: 'error', message: 'Hubo un error al leer el archivo PDF.' }); setIsLoading(false); }
    };

    const processTextWithAI = async (text: string) => {
        setLoadingMessage('Analizando transacciones con IA...'); setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, description: { type: Type.STRING }, amount: { type: Type.NUMBER } }, required: ['date', 'description', 'amount'] } };
            const prompt = `Analiza el siguiente extracto bancario. Extrae cada transacción. Ignora texto irrelevante. Devuelve un array JSON. 'amount' debe ser negativo para gastos. Fechas en AAAA-MM-DD. Texto: --- ${text} ---`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema } });
            const parsedTransactions = JSON.parse(response.text.trim());
            if (!Array.isArray(parsedTransactions)) throw new Error("La respuesta de la IA no es un array.");
            let initialStaged = parsedTransactions.map(parseAIRow).filter(t => t.isValid);
            initialStaged = applyAutomationRules(initialStaged);
            setStagedTransactions(initialStaged); 
            setStep('review');
        } catch (error) { addToast({ type: 'error', message: 'Error al procesar los datos con la IA.' }); } finally { setIsLoading(false); }
    };
    
    const handleFileSelect = (selectedFile: File | null) => {
        if (!selectedFile) return; if (!selectedAccountId) { addToast({ type: 'warning', message: 'Selecciona una cuenta de destino primero.' }); return; }
        setFile(selectedFile); const fileType = selectedFile.name.toLowerCase();
        if (fileType.endsWith('.csv') || fileType.endsWith('.xls') || fileType.endsWith('.xlsx')) processStructuredFile(selectedFile);
        else if (fileType.endsWith('.pdf')) processPdfFile(selectedFile);
        else addToast({ type: 'error', message: 'Formato no soportado. Sube PDF, Excel o CSV.' });
    };

    const handleMappingConfirm = () => {
        if (mapping.date === null || mapping.description === null || mapping.amount === null) { addToast({ type: 'warning', message: 'Por favor, mapea Fecha, Descripción y Monto.' }); return; }
        let initialStaged = csvData.map(parseMappedRow).filter(t => t.isValid);
        initialStaged = applyAutomationRules(initialStaged);
        setStagedTransactions(initialStaged); 
        setStep('review');
    };
    
    const parseMappedRow = (row: string[], i: number): StagedTransaction => {
        const amountStr = String(row[mapping.amount!]).replace(/[€,]/g, '').replace(',', '.'); const amount = parseFloat(amountStr);
        const description = String(row[mapping.description!]); const dateRaw = row[mapping.date!];
        let dateObj = new Date(dateRaw);
        const isValid = !isNaN(amount) && description && !isNaN(dateObj.getTime());
        const type = amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
        return { id: `staged-${i}`, date: isValid ? dateObj.toISOString().split('T')[0] : 'Fecha inválida', description, amount: Math.abs(amount), type, categoryId: type === TransactionType.EXPENSE ? defaultExpenseCatId : defaultIncomeCatId, isValid, accountId: selectedAccountId, };
    };

    const parseAIRow = (t: any, i: number): StagedTransaction => {
        const amount = parseFloat(t.amount); const description = String(t.description); const dateObj = new Date(t.date);
        const isValid = !isNaN(amount) && description && !isNaN(dateObj.getTime());
        const type = amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
        return { id: `staged-${i}`, date: isValid ? dateObj.toISOString().split('T')[0] : 'Fecha inválida', description, amount: Math.abs(amount), type, categoryId: type === TransactionType.EXPENSE ? defaultExpenseCatId : defaultIncomeCatId, isValid, accountId: selectedAccountId, };
    };

    const handleAiCategorize = async () => {
        const toCategorize = stagedTransactions.filter(t => t.type === TransactionType.EXPENSE && t.categoryId === defaultExpenseCatId);
        if (toCategorize.length === 0) { addToast({ type: 'info', message: 'No hay transacciones sin categorizar.' }); return; }
        setLoadingMessage('Categorizando con IA...'); setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const categoryNames = expenseCategories.map(c => c.name);
            const descriptions = toCategorize.map(t => ({ id: t.id, description: t.description }));
            const prompt = `Dadas estas categorías: [${categoryNames.join(', ')}]. Asigna la más apropiada a cada transacción. Devuelve SÓLO un array JSON con "id" y "category". Asegúrate que la categoría asignada sea una de la lista. \n${JSON.stringify(descriptions)}`;
            const schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, category: { type: Type.STRING } }, required: ['id', 'category'] } };
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema } });
            const categorized: { id: string; category: string }[] = JSON.parse(response.text.trim());
            const categoryMap = new Map(categorized.map(item => [item.id, item.category]));
            setStagedTransactions(prev => prev.map(t => {
                const newCategoryName = categoryMap.get(t.id);
                const matchedCategory = expenseCategories.find(c => c.name === newCategoryName);
                return (matchedCategory) ? { ...t, categoryId: matchedCategory.id } : t;
            }));
            addToast({ type: 'success', message: `${categorized.length} transacciones categorizadas.` });
        } catch (error) { console.error("Error en categorización con IA:", error); addToast({ type: 'error', message: 'Error al categorizar transacciones.' }); } finally { setIsLoading(false); }
    };
    
    const updateStagedTransaction = (id: string, field: keyof StagedTransaction, value: any) => setStagedTransactions(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));

    const handleConfirm = () => {
        const transactionsToImport: Transaction[] = stagedTransactions.map(({ id, isValid, ...rest }) => ({ ...rest, id: crypto.randomUUID(), date: new Date(`${rest.date}T00:00:00`), }));
        const result = handleConfirmImport(transactionsToImport);
        addToast({ type: 'success', message: result.message! });
        resetState(); 
        onImportComplete();
    };
    
    const CategorySelect: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; type: TransactionType }> = ({ value, onChange, type }) => {
        const cats = type === TransactionType.EXPENSE ? expenseCategories : incomeCategories;
        const rootCats = cats.filter(c => c.parentId === null);

        return <select value={value} onChange={onChange} className="w-full bg-slate-700 border-slate-600 rounded p-1">
            {rootCats.map(root => (
                <optgroup key={root.id} label={root.name}>
                    <option value={root.id}>{root.name}</option>
                    {cats.filter(c => c.parentId === root.id).map(child => (
                        <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                </optgroup>
            ))}
        </select>;
    };

    if (accounts.length === 0) return (<div className="bg-slate-800 p-6 rounded-xl text-center max-w-lg mx-auto"><h3 className="text-xl font-semibold mb-2">Primer Paso: Añadir una Cuenta</h3><p className="text-gray-400 mb-4">Para importar, necesitas crear al menos una cuenta bancaria.</p><button onClick={() => setActiveTab('settings')} className="bg-violet-600 hover:bg-violet-700 font-semibold py-2 px-6 rounded-lg">Ir a Configuración</button></div>);

    const renderStep = () => {
        switch(step) {
            case 'upload': return (<div><h2 className="text-2xl font-semibold mb-2 flex items-center gap-2 justify-center"><SparklesIcon className="w-6 h-6 text-violet-400" />Importación de Extractos</h2><p className="text-gray-400 mb-4 text-center">Sube tu extracto (PDF, CSV, Excel) y nosotros haremos el resto.</p><div className="space-y-4"><div><label htmlFor="account-select" className="block text-sm font-medium mb-1">1. Selecciona la cuenta</label><select id="account-select" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md py-2 px-3 focus:ring-violet-500">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName}</option>)}</select></div><div><label className="block text-sm font-medium mb-1">2. Sube el archivo</label><label className="mt-1 flex justify-center w-full h-32 px-4 transition bg-slate-900/50 border-2 border-slate-600 border-dashed rounded-md cursor-pointer hover:border-violet-400"><span className="flex items-center space-x-2"><UploadCloudIcon className="w-8 h-8 text-gray-400" /><span className="font-medium text-gray-400">{file ? `Archivo: ${file.name}` : 'Arrastra o haz clic para seleccionar'}</span></span><input type="file" className="hidden" accept=".pdf,.csv,.xls,.xlsx" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} /></label></div></div></div>);
            case 'mapping': return (<div><h2 className="text-2xl font-semibold mb-2">Mapeo de Columnas</h2><p className="text-gray-400 mb-6">Ayúdanos a entender tu archivo. Asigna las columnas correctas.</p><div className="space-y-4">{(['date', 'description', 'amount'] as const).map(key => (<div key={key}><label className="block text-sm font-medium mb-1 capitalize">{key === 'date' ? 'Fecha' : key === 'description' ? 'Descripción' : 'Monto'}</label><select value={mapping[key] ?? ''} onChange={e => setMapping(prev => ({ ...prev, [key]: parseInt(e.target.value) }))} className="w-full bg-slate-700 border-slate-600 rounded-md py-2 px-3">{csvHeaders.map((h, i) => (<option key={i} value={i}>{h}</option>))}</select></div>))}</div><div className="flex justify-between items-center mt-6"><button onClick={resetState} className="bg-slate-600 hover:bg-slate-700 font-semibold py-2 px-4 rounded-lg">Volver a Subir</button><button onClick={handleMappingConfirm} className="bg-violet-600 hover:bg-violet-700 font-bold py-2 px-6 rounded-lg">Confirmar Mapeo</button></div></div>);
            case 'review': return (<div><div className="flex justify-between items-center mb-4 flex-wrap gap-2"><h2 className="text-2xl font-semibold">Revisar y Confirmar Transacciones</h2><div className="flex items-center gap-2"><button onClick={handleAiCategorize} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-sm font-semibold py-2 px-3 rounded-lg"><SparklesIcon className="w-4 h-4" /><span>Categorizar con IA</span></button></div></div><div className="overflow-auto max-h-[50vh] bg-slate-900/50 rounded-lg border border-slate-700"><table className="w-full text-left"><thead className="sticky top-0 bg-slate-800"><tr>{['Fecha', 'Descripción', 'Monto (€)', 'Tipo', 'Categoría'].map(h => <th key={h} className="p-3 text-sm font-semibold">{h}</th>)}</tr></thead><tbody>{stagedTransactions.map((t) => (<tr key={t.id} className="border-b border-slate-700 text-sm"><td className="p-2"><input type="date" value={t.date} onChange={e => updateStagedTransaction(t.id, 'date', e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded p-1" /></td><td className="p-2"><input type="text" value={t.description} onChange={e => updateStagedTransaction(t.id, 'description', e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded p-1" /></td><td className="p-2"><input type="number" value={t.amount} onChange={e => updateStagedTransaction(t.id, 'amount', parseFloat(e.target.value))} className="w-full bg-slate-700 border-slate-600 rounded p-1" /></td><td className="p-2"><select value={t.type} onChange={e => updateStagedTransaction(t.id, 'type', e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded p-1"><option value={TransactionType.EXPENSE}>Gasto</option><option value={TransactionType.INCOME}>Ingreso</option></select></td><td className="p-2"><CategorySelect value={t.categoryId} onChange={e => updateStagedTransaction(t.id, 'categoryId', e.target.value)} type={t.type} /></td></tr>))}</tbody></table></div><div className="flex justify-between items-center mt-6"><button onClick={resetState} className="bg-slate-600 hover:bg-slate-700 font-semibold py-2 px-4 rounded-lg">Cancelar</button><button onClick={handleConfirm} className="bg-violet-600 hover:bg-violet-700 font-bold py-2 px-6 rounded-lg">Confirmar e Importar ({stagedTransactions.length})</button></div></div>);
            default: return null;
        }
    };
    
    return (<div className="space-y-6 max-w-4xl mx-auto"><div className="bg-slate-800 p-6 rounded-xl shadow-lg relative">{isLoading && <div className="absolute inset-0 bg-slate-800/80 flex flex-col items-center justify-center z-10"><SpinnerIcon className="w-10 h-10 text-violet-400 animate-spin" /><p className="mt-2 text-lg">{loadingMessage}</p></div>}{renderStep()}</div></div>);
};
export default AiImportView;