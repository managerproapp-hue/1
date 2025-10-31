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
  source?: string;
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
  source: string;
}

export interface ProcessingError {
  rawData: string;
  reason: string;
}
