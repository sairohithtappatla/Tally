import { supabase } from './supabaseClient';
import { AlertLog } from '../types/supabase';

export const alertService = {
  /**
   * Runs all threshold checks (daily / weekly / monthly) for the given date.
   * Returns NEW alert records that were just inserted (i.e. newly triggered).
   */
  async checkAndGetNewAlerts(
    userId: string,
    date: string,   // 'YYYY-MM-DD'
    month: string   // 'YYYY-MM'
  ): Promise<AlertLog[]> {
    try {
      const checkStart = new Date(Date.now() - 3000).toISOString();

      const { error } = await supabase.rpc('check_all_thresholds', {
        p_user_id: userId,
        p_date: date,
        p_month: month,
      });

      if (error) throw error;

      // Return alerts triggered within the last 3 seconds (newly fired)
      const { data, error: fetchErr } = await supabase
        .from('alert_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('triggered_at', checkStart)
        .order('triggered_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      return (data as AlertLog[]) ?? [];
    } catch (error) {
      console.error('Threshold check failed:', error);
      return [];
    }
  },

  /** Legacy monthly-only check kept for backward compatibility */
  async checkThresholds(userId: string, month: string) {
    try {
      const { error } = await supabase.rpc('check_budget_threshold', {
        p_user_id: userId,
        p_month: month,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Threshold check failed:', error);
    }
  },

  async getAlerts(userId: string, month?: string): Promise<AlertLog[]> {
    try {
      let query = supabase
        .from('alert_logs')
        .select('*')
        .eq('user_id', userId)
        .order('triggered_at', { ascending: false });

      if (month) query = query.eq('month', month);

      const { data, error } = await query;

      if (error) throw error;
      return data as AlertLog[];
    } catch (error) {
      console.error('Fetch alerts failed:', error);
      return [];
    }
  },

  async getRecentAlerts(userId: string, limit = 10): Promise<AlertLog[]> {
    try {
      const { data, error } = await supabase
        .from('alert_logs')
        .select('*')
        .eq('user_id', userId)
        .order('triggered_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AlertLog[];
    } catch (error) {
      console.error('Fetch recent alerts failed:', error);
      return [];
    }
  },

  async getMonthlyBudget(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('monthly_budget')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return Number(data?.monthly_budget) || 0;
    } catch (error) {
      console.error('Fetch monthly budget failed:', error);
      return 0;
    }
  },

  async getAllBudgets(userId: string): Promise<{ monthly: number; daily: number | null; weekly: number | null }> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('monthly_budget, daily_budget, weekly_budget')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return {
        monthly: Number(data?.monthly_budget) || 0,
        daily: data?.daily_budget != null ? Number(data.daily_budget) : null,
        weekly: data?.weekly_budget != null ? Number(data.weekly_budget) : null,
      };
    } catch (error) {
      console.error('Fetch budgets failed:', error);
      return { monthly: 0, daily: null, weekly: null };
    }
  },

  async updateMonthlyBudget(userId: string, budget: number): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ monthly_budget: budget })
      .eq('id', userId);
    if (error) throw error;
  },

  async updateDailyBudget(userId: string, budget: number | null): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ daily_budget: budget })
      .eq('id', userId);
    if (error) throw error;
  },

  async updateWeeklyBudget(userId: string, budget: number | null): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ weekly_budget: budget })
      .eq('id', userId);
    if (error) throw error;
  },
};
