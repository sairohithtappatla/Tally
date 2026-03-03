import { Functions, ExecutionMethod } from 'react-native-appwrite';
import client from './appwriteClient';

const functions = new Functions(client);

const FUNCTION_ID = process.env.EXPO_PUBLIC_APPWRITE_FUNCTION_ID || 'financial-engine';

export type FinancialAction = 'add' | 'edit' | 'delete' | 'transfer';

export interface FinancialPayload {
  action: FinancialAction;
  userId: string;
  transactionId?: string; // For edit/delete
  data?: {
    accountId: string;
    toAccountId?: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    category: string;
    merchant: string;
    date: string;
    month: string;
  };
}

export const financialFunctionService = {
  async execute(payload: FinancialPayload) {
    try {
      const response = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify(payload),
        false, // async = false, we need the result
        '/',
        ExecutionMethod.POST
      );

      const result = JSON.parse(response.responseBody);

      if (response.status === 'failed' || result.status === 'error') {
        throw new Error(result.message || 'Financial operation failed');
      }

      return result.data;
    } catch (error) {
      console.error('Function execution failed:', error);
      throw error;
    }
  }
};
