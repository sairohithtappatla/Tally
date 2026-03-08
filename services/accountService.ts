import { supabase } from './supabaseClient';
import { Account } from '../types/supabase';

export const accountService = {
  async getAccounts(userId: string) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type, balance, color, icon, user_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Account[];
    } catch (error) {
      console.error('Fetch accounts failed:', error);
      throw error;
    }
  },

  async addAccount(userId: string, data: { name: string; type: string; balance: number; color: string; icon: string }) {
    try {
      const { data: account, error } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return account as Account;
    } catch (error) {
      console.error('Add account failed:', error);
      throw error;
    }
  },

  // Atomic balance update using database function (or direct for 'set')
  async updateBalance(accountId: string, amount: number, operation: 'add' | 'subtract' | 'set' = 'add') {
    try {
      if (operation === 'set') {
        const { data, error } = await supabase
          .from('accounts')
          .update({ balance: amount })
          .eq('id', accountId)
          .select()
          .single();
        if (error) throw error;
        return data as Account;
      }

      const { data, error } = await supabase.rpc('update_account_balance', {
        p_account_id: accountId,
        p_amount: amount,
        p_operation: operation,
      });

      if (error) throw error;
      return data as Account;
    } catch (error) {
      console.error('Update balance failed:', error);
      throw error;
    }
  },

  // Get single account
  async getAccount(accountId: string) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (error) throw error;
      return data as Account;
    } catch (error) {
      console.error('Get account failed:', error);
      throw error;
    }
  },

  // Update account details (not balance)
  async updateAccount(accountId: string, data: Partial<Omit<Account, 'id' | 'user_id' | 'balance' | 'created_at' | 'updated_at'>>) {
    try {
      const { data: account, error } = await supabase
        .from('accounts')
        .update(data)
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;
      return account as Account;
    } catch (error) {
      console.error('Update account failed:', error);
      throw error;
    }
  },

  // Delete account
  async deleteAccount(accountId: string) {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete account failed:', error);
      throw error;
    }
  },
};
