// FIX: Removed self-import of TransactionType.
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId: string;
  notes?: string;
  recurringTransactionId?: string; // ID de la transacción recurrente de origen
}

export interface ChartData {
  name: string;
  [key: string]: string | number;
}

export interface StagedTransaction {
  id: string; // Temporary ID
  date: string; // Kept as string until final validation
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  isValid: boolean;
  accountId: string; // Changed from source: string
}

export interface ProcessingError {
  rawData: string;
  reason: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  linkedCategory: string;
}

export interface Account {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber?: string;
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount?: number;
  type: TransactionType;
  category: string;
  accountId: string;
  frequency: 'monthly'; // Por ahora solo mensual, extensible en el futuro
  dayOfMonth?: number;
  startDate: Date;
  endDate?: Date;
}