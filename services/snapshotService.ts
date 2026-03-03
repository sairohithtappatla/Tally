import { supabase } from './supabaseClient';
import { MonthlySnapshot } from '../types/supabase';

export const snapshotService = {
  async updateSnapshot(userId: string, month: string, amount: number, type: 'income' | 'expense') {
    try {
      // Try to get existing snapshot
      const { data: existing, error: fetchError } = await supabase
        .from('monthly_snapshots')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existing) {
        // Update existing snapshot
        const updateData: any = {};

        if (type === 'income') {
          updateData.total_income = existing.total_income + amount;
          updateData.net_balance = (existing.total_income + amount) - existing.total_expense;
        } else {
          updateData.total_expense = existing.total_expense + amount;
          updateData.net_balance = existing.total_income - (existing.total_expense + amount);
        }

        const { data, error } = await supabase
          .from('monthly_snapshots')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as MonthlySnapshot;
      } else {
        // Create new snapshot
        const { data, error } = await supabase
          .from('monthly_snapshots')
          .insert({
            user_id: userId,
            month,
            total_income: type === 'income' ? amount : 0,
            total_expense: type === 'expense' ? amount : 0,
            net_balance: type === 'income' ? amount : -amount,
          })
          .select()
          .single();

        if (error) throw error;
        return data as MonthlySnapshot;
      }
    } catch (error) {
      console.error('Update snapshot failed:', error);
      throw error;
    }
  },

  async getRecentSnapshots(userId: string, limit = 6) {
    try {
      const { data, error } = await supabase
        .from('monthly_snapshots')
        .select('*')
        .eq('user_id', userId)
        .order('month', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as MonthlySnapshot[];
    } catch (error) {
      console.error('Fetch snapshots failed:', error);
      throw error;
    }
  },

  async getSnapshot(userId: string, month: string) {
    try {
      const { data, error } = await supabase
        .from('monthly_snapshots')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .maybeSingle();

      if (error) throw error;
      return data as MonthlySnapshot | null;
    } catch (error) {
      console.error('Fetch snapshot failed:', error);
      throw error;
    }
  },
};
