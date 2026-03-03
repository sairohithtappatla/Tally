import { Transaction } from '../types/supabase';
import { supabase } from './supabaseClient';
import { accountService } from './accountService';

/**
 * OPTIMIZED TRANSACTION SERVICE FOR SUPABASE
 * - Uses database functions for atomic operations
 * - Optimized queries with field selection
 * - Better error handling with automatic rollback
 */
export const transactionService = {
  // Add transaction using database function for atomicity
  async addTransaction(
    userId: string,
    data: {
      accountId: string;
      toAccountId?: string;
      amount: number;
      type: 'income' | 'expense' | 'transfer';
      category: string;
      merchant: string;
      date: string;
      month: string;
    }
  ) {
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const { data: transaction, error } = await supabase.rpc('add_transaction', {
        p_user_id: userId,
        p_account_id: data.accountId,
        p_to_account_id: data.toAccountId || null,
        p_amount: data.amount,
        p_type: data.type,
        p_category: data.category,
        p_merchant: data.merchant,
        p_date: data.date,
        p_month: data.month,
        p_time: timeStr,
      });

      if (error) throw error;
      return transaction as Transaction;
    } catch (error) {
      console.error('Add transaction failed:', error);
      throw error;
    }
  },

  // Transfer between accounts
  async transfer(
    userId: string,
    data: {
      accountId: string;
      toAccountId: string;
      amount: number;
      date: string;
      month: string;
      merchant: string;
      category: string;
    }
  ) {
    try {
      return await this.addTransaction(userId, {
        ...data,
        type: 'transfer',
      });
    } catch (error) {
      console.error('Transfer failed:', error);
      throw error;
    }
  },

  async editTransaction(
    userId: string,
    transactionId: string,
    data: Partial<{
      accountId: string;
      toAccountId: string;
      amount: number;
      type: 'income' | 'expense' | 'transfer';
      category: string;
      merchant: string;
      date: string;
      month: string;
    }>
  ) {
    try {
      // Get original transaction
      const { data: original, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the old transaction with reversal
      await supabase.rpc('delete_transaction_with_reversal', {
        p_transaction_id: transactionId,
      });

      // Create new transaction with updated values
      const newData = {
        accountId: data.accountId || original.account_id,
        toAccountId: data.toAccountId || original.to_account_id || undefined,
        amount: data.amount || original.amount,
        type: (data.type || original.type) as 'income' | 'expense' | 'transfer',
        category: data.category || original.category,
        merchant: data.merchant || original.merchant,
        date: data.date || original.date,
        month: data.month || original.month,
      };

      return await this.addTransaction(userId, newData);
    } catch (error) {
      console.error('Edit transaction failed:', error);
      throw error;
    }
  },

  async deleteTransaction(userId: string, transactionId: string) {
    try {
      const { error } = await supabase.rpc('delete_transaction_with_reversal', {
        p_transaction_id: transactionId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Delete transaction failed:', error);
      throw error;
    }
  },

  /**
   * Optimized transaction list with field selection
   */
  async getTransactions(userId: string, limit = 20, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, type, amount, category, merchant, date, time, created_at, account_id, to_account_id')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data as Transaction[];
    } catch (error) {
      console.error('Fetch transactions failed:', error);
      throw error;
    }
  },

  /**
   * Get transactions by date range (optimized)
   */
  async getTransactionsByDateRange(userId: string, startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, type, amount, category, date, account_id')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    } catch (error) {
      console.error('Fetch transactions by date failed:', error);
      throw error;
    }
  },

  /**
   * Get transactions by category (for analytics)
   */
  async getTransactionsByCategory(userId: string, category: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Transaction[];
    } catch (error) {
      console.error('Fetch transactions by category failed:', error);
      throw error;
    }
  },

  /**
   * Get recent transactions with account names using database function
   */
  async getRecentTransactionsWithAccounts(userId: string, limit = 20) {
    try {
      const { data, error } = await supabase.rpc('get_recent_transactions', {
        p_user_id: userId,
        p_limit: limit,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fetch recent transactions failed:', error);
      throw error;
    }
  },

  /**
   * Get category spending for a month
   */
  async getCategorySpending(userId: string, month: string) {
    try {
      const { data, error } = await supabase.rpc('get_category_spending', {
        p_user_id: userId,
        p_month: month,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get category spending failed:', error);
      throw error;
    }
  },
};
