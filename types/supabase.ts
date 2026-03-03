export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          total_balance: number;
          monthly_spent: number;
          monthly_budget: number;
          currency: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          total_balance?: number;
          monthly_spent?: number;
          monthly_budget?: number;
          currency?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          total_balance?: number;
          monthly_spent?: number;
          monthly_budget?: number;
          currency?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'savings' | 'credit' | 'cash' | 'investment' | 'expense';
          balance: number;
          monthly_limit: number | null;
          color: string;
          icon: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'savings' | 'credit' | 'cash' | 'investment' | 'expense';
          balance?: number;
          monthly_limit?: number | null;
          color?: string;
          icon?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'savings' | 'credit' | 'cash' | 'investment' | 'expense';
          balance?: number;
          monthly_limit?: number | null;
          color?: string;
          icon?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          to_account_id: string | null;
          amount: number;
          type: 'income' | 'expense' | 'transfer';
          category: string;
          merchant: string;
          date: string;
          time: string;
          month: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          to_account_id?: string | null;
          amount: number;
          type: 'income' | 'expense' | 'transfer';
          category: string;
          merchant: string;
          date: string;
          time?: string;
          month: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          to_account_id?: string | null;
          amount?: number;
          type?: 'income' | 'expense' | 'transfer';
          category?: string;
          merchant?: string;
          date?: string;
          time?: string;
          month?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      monthly_snapshots: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          total_income: number;
          total_expense: number;
          net_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          total_income?: number;
          total_expense?: number;
          net_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          total_income?: number;
          total_expense?: number;
          net_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      alert_logs: {
        Row: {
          id: string;
          user_id: string;
          period: 'daily' | 'weekly' | 'monthly';
          month: string;
          threshold: 50 | 80 | 100;
          category: string | null;
          triggered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period?: 'daily' | 'weekly' | 'monthly';
          month: string;
          threshold: 50 | 80 | 100;
          category?: string | null;
          triggered_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period?: 'daily' | 'weekly' | 'monthly';
          month?: string;
          threshold?: 50 | 80 | 100;
          category?: string | null;
          triggered_at?: string;
        };
      };
    };
    Functions: {
      create_default_accounts: {
        Args: { p_user_id: string };
        Returns: void;
      };
      update_account_balance: {
        Args: { p_account_id: string; p_amount: number; p_operation: 'add' | 'subtract' | 'set' };
        Returns: Database['public']['Tables']['accounts']['Row'];
      };
      add_transaction: {
        Args: {
          p_user_id: string;
          p_account_id: string;
          p_to_account_id: string | null;
          p_amount: number;
          p_type: string;
          p_category: string;
          p_merchant: string;
          p_date: string;
          p_month: string;
          p_time?: string;
        };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      delete_transaction_with_reversal: {
        Args: { p_transaction_id: string };
        Returns: void;
      };
      calculate_user_total_balance: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_category_spending: {
        Args: { p_user_id: string; p_month: string };
        Returns: { category: string; total_spent: number; transaction_count: number }[];
      };
      check_budget_threshold: {
        Args: { p_user_id: string; p_month: string };
        Returns: void;
      };
      check_all_thresholds: {
        Args: { p_user_id: string; p_date: string; p_month: string };
        Returns: void;
      };
      get_recent_transactions: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: {
          id: string;
          amount: number;
          type: string;
          category: string;
          merchant: string;
          date: string;
          account_name: string;
          to_account_name: string | null;
        }[];
      };
    };
  };
}

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type Account = Database['public']['Tables']['accounts']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type MonthlySnapshot = Database['public']['Tables']['monthly_snapshots']['Row'];
export type AlertLog = Database['public']['Tables']['alert_logs']['Row'];
