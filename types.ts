// FIX: Replaced self-import with enum definition to fix circular dependency.
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  notes?: string;
  automatedByRuleId?: string;
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
  categoryId: string;
  isValid: boolean;
  accountId: string;
  automatedByRuleId?: string;
}

export interface ProcessingError {
  rawData: string;
  reason: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  linkedCategoryId: string;
}

export interface Account {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber?: string;
}

export interface AutomationRule {
  id: string;
  keyword: string;
  categoryId: string;
  type: TransactionType;
}