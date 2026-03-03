import { Models } from 'react-native-appwrite';

export interface UserProfile extends Models.Document {
  userId: string;
  email: string;
  name: string;
  totalBalance: number;
  monthlySpent: number;
  currency: string;
  createdAt: string;
}

export interface Account extends Models.Document {
  userId: string;
  name: string; // e.g., SBI, Union, Cash
  type: string; // e.g., Savings, Credit, Cash
  balance: number;
  monthlyLimit?: number; // Spending threshold limit
  color: string;
  icon: string;
}

export interface Transaction extends Models.Document {
  userId: string;
  accountId: string;
  toAccountId?: string; // For transfers
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  merchant: string;
  date: string; // ISO string or YYYY-MM-DD
  time: string;
  month: string; // YYYY-MM for snapshots
}

export interface MonthlySnapshot extends Models.Document {
  userId: string;
  month: string; // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export interface AlertLog extends Models.Document {
  userId: string;
  month: string;
  threshold: 50 | 80 | 100;
  category?: string;
  triggeredAt: string;
}
