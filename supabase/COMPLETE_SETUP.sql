-- COMPLETE SUPABASE SETUP FOR TALLY FINANCE
-- Copy and run this entire script in Supabase SQL Editor
-- This will set up everything: tables, functions, RLS, and create users

-- ============================================================
-- PART 1: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PART 2: TABLES
-- ============================================================

-- Users Profile Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  total_balance NUMERIC(15, 2) DEFAULT 0,
  monthly_spent NUMERIC(15, 2) DEFAULT 0,
  monthly_budget NUMERIC(15, 2) DEFAULT 10000,
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('savings', 'credit', 'cash', 'investment', 'expense')),
  balance NUMERIC(15, 2) DEFAULT 0,
  monthly_limit NUMERIC(15, 2),
  color TEXT NOT NULL DEFAULT '#6366F1',
  icon TEXT NOT NULL DEFAULT 'wallet-outline',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category TEXT NOT NULL,
  merchant TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Snapshots Table
CREATE TABLE IF NOT EXISTS public.monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  total_income NUMERIC(15, 2) DEFAULT 0,
  total_expense NUMERIC(15, 2) DEFAULT 0,
  net_balance NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Alert Log Table
CREATE TABLE IF NOT EXISTS public.alert_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  threshold INTEGER NOT NULL CHECK (threshold IN (50, 80, 100)),
  category TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month, threshold)
);

-- ============================================================
-- PART 3: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_month ON public.transactions(month);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_month ON public.transactions(user_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_user_month ON public.monthly_snapshots(user_id, month);
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_month ON public.alert_logs(user_id, month);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON public.transactions(user_id, category);

-- ============================================================
-- PART 4: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Accounts Policies
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own accounts" ON public.accounts;
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own accounts" ON public.accounts;
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- Transactions Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Monthly Snapshots Policies
DROP POLICY IF EXISTS "Users can view own snapshots" ON public.monthly_snapshots;
CREATE POLICY "Users can view own snapshots" ON public.monthly_snapshots FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own snapshots" ON public.monthly_snapshots;
CREATE POLICY "Users can insert own snapshots" ON public.monthly_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own snapshots" ON public.monthly_snapshots;
CREATE POLICY "Users can update own snapshots" ON public.monthly_snapshots FOR UPDATE USING (auth.uid() = user_id);

-- Alert Logs Policies
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alert_logs;
CREATE POLICY "Users can view own alerts" ON public.alert_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own alerts" ON public.alert_logs;
CREATE POLICY "Users can insert own alerts" ON public.alert_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PART 5: FUNCTIONS & TRIGGERS
-- ============================================================

-- Updated trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.user_profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.accounts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.transactions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.monthly_snapshots;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.monthly_snapshots FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-confirm users and create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      confirmed_at = COALESCE(confirmed_at, NOW())
  WHERE id = NEW.id;

  INSERT INTO public.user_profiles (id, email, name, total_balance, monthly_spent, currency)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    0,
    0,
    'INR'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create default accounts
CREATE OR REPLACE FUNCTION public.create_default_accounts(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.accounts (user_id, name, type, balance, color, icon)
  VALUES 
    (p_user_id, 'Savings', 'savings', 0, '#6366F1', 'wallet-outline'),
    (p_user_id, 'Expenses', 'expense', 0, '#0EA5E9', 'card-outline')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update account balance atomically
CREATE OR REPLACE FUNCTION public.update_account_balance(
  p_account_id UUID,
  p_amount NUMERIC,
  p_operation TEXT
)
RETURNS public.accounts AS $$
DECLARE
  v_account public.accounts;
BEGIN
  IF p_operation = 'add' THEN
    UPDATE public.accounts SET balance = balance + p_amount WHERE id = p_account_id RETURNING * INTO v_account;
  ELSIF p_operation = 'subtract' THEN
    UPDATE public.accounts SET balance = balance - p_amount WHERE id = p_account_id RETURNING * INTO v_account;
  ELSE
    RAISE EXCEPTION 'Invalid operation: %', p_operation;
  END IF;
  RETURN v_account;
END;
$$ LANGUAGE plpgsql;

-- Add transaction with balance updates
CREATE OR REPLACE FUNCTION public.add_transaction(
  p_user_id UUID, p_account_id UUID, p_to_account_id UUID, p_amount NUMERIC,
  p_type TEXT, p_category TEXT, p_merchant TEXT, p_date DATE, p_month TEXT
)
RETURNS public.transactions AS $$
DECLARE
  v_transaction public.transactions;
BEGIN
  INSERT INTO public.transactions (user_id, account_id, to_account_id, amount, type, category, merchant, date, month)
  VALUES (p_user_id, p_account_id, p_to_account_id, p_amount, p_type, p_category, p_merchant, p_date, p_month)
  RETURNING * INTO v_transaction;

  IF p_type = 'income' THEN
    PERFORM public.update_account_balance(p_account_id, p_amount, 'add');
  ELSIF p_type = 'expense' THEN
    PERFORM public.update_account_balance(p_account_id, p_amount, 'subtract');
  ELSIF p_type = 'transfer' AND p_to_account_id IS NOT NULL THEN
    PERFORM public.update_account_balance(p_account_id, p_amount, 'subtract');
    PERFORM public.update_account_balance(p_to_account_id, p_amount, 'add');
  END IF;

  PERFORM public.update_monthly_snapshot(p_user_id, p_month, p_amount, p_type);
  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- Update monthly snapshot
CREATE OR REPLACE FUNCTION public.update_monthly_snapshot(p_user_id UUID, p_month TEXT, p_amount NUMERIC, p_type TEXT)
RETURNS public.monthly_snapshots AS $$
DECLARE
  v_snapshot public.monthly_snapshots;
BEGIN
  IF p_type = 'income' THEN
    UPDATE public.monthly_snapshots SET total_income = total_income + p_amount, net_balance = (total_income + p_amount) - total_expense
    WHERE user_id = p_user_id AND month = p_month RETURNING * INTO v_snapshot;
  ELSIF p_type = 'expense' THEN
    UPDATE public.monthly_snapshots SET total_expense = total_expense + p_amount, net_balance = total_income - (total_expense + p_amount)
    WHERE user_id = p_user_id AND month = p_month RETURNING * INTO v_snapshot;
  END IF;

  IF v_snapshot IS NULL THEN
    INSERT INTO public.monthly_snapshots (user_id, month, total_income, total_expense, net_balance)
    VALUES (p_user_id, p_month, CASE WHEN p_type = 'income' THEN p_amount ELSE 0 END,
            CASE WHEN p_type = 'expense' THEN p_amount ELSE 0 END,
            CASE WHEN p_type = 'income' THEN p_amount ELSE -p_amount END)
    RETURNING * INTO v_snapshot;
  END IF;
  RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql;

-- Delete transaction with reversal
CREATE OR REPLACE FUNCTION public.delete_transaction_with_reversal(p_transaction_id UUID)
RETURNS void AS $$
DECLARE
  v_transaction public.transactions;
BEGIN
  SELECT * INTO v_transaction FROM public.transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;

  IF v_transaction.type = 'income' THEN
    PERFORM public.update_account_balance(v_transaction.account_id, v_transaction.amount, 'subtract');
    UPDATE public.monthly_snapshots SET total_income = total_income - v_transaction.amount, net_balance = (total_income - v_transaction.amount) - total_expense
    WHERE user_id = v_transaction.user_id AND month = v_transaction.month;
  ELSIF v_transaction.type = 'expense' THEN
    PERFORM public.update_account_balance(v_transaction.account_id, v_transaction.amount, 'add');
    UPDATE public.monthly_snapshots SET total_expense = total_expense - v_transaction.amount, net_balance = total_income - (total_expense - v_transaction.amount)
    WHERE user_id = v_transaction.user_id AND month = v_transaction.month;
  ELSIF v_transaction.type = 'transfer' AND v_transaction.to_account_id IS NOT NULL THEN
    PERFORM public.update_account_balance(v_transaction.account_id, v_transaction.amount, 'add');
    PERFORM public.update_account_balance(v_transaction.to_account_id, v_transaction.amount, 'subtract');
  END IF;

  DELETE FROM public.transactions WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Calculate total balance
CREATE OR REPLACE FUNCTION public.calculate_user_total_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(balance), 0) INTO v_total FROM public.accounts WHERE user_id = p_user_id;
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Get category spending
CREATE OR REPLACE FUNCTION public.get_category_spending(p_user_id UUID, p_month TEXT)
RETURNS TABLE (category TEXT, total_spent NUMERIC, transaction_count BIGINT) AS $$
BEGIN
  RETURN QUERY SELECT t.category, SUM(t.amount) as total_spent, COUNT(*) as transaction_count
  FROM public.transactions t WHERE t.user_id = p_user_id AND t.month = p_month AND t.type = 'expense'
  GROUP BY t.category ORDER BY total_spent DESC;
END;
$$ LANGUAGE plpgsql;

-- Check budget thresholds
CREATE OR REPLACE FUNCTION public.check_budget_threshold(p_user_id UUID, p_month TEXT)
RETURNS void AS $$
DECLARE
  v_snapshot public.monthly_snapshots;
  v_budget NUMERIC;
  v_percentage NUMERIC;
  v_threshold INTEGER;
BEGIN
  SELECT monthly_budget INTO v_budget FROM public.user_profiles WHERE id = p_user_id;
  SELECT * INTO v_snapshot FROM public.monthly_snapshots WHERE user_id = p_user_id AND month = p_month;
  IF v_snapshot IS NULL OR v_budget = 0 THEN RETURN; END IF;

  v_percentage := (v_snapshot.total_expense / v_budget) * 100;
  FOR v_threshold IN SELECT unnest(ARRAY[100, 80, 50]) LOOP
    IF v_percentage >= v_threshold THEN
      INSERT INTO public.alert_logs (user_id, month, threshold) VALUES (p_user_id, p_month, v_threshold)
      ON CONFLICT (user_id, month, threshold) DO NOTHING;
      EXIT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_check_threshold()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.check_budget_threshold(NEW.user_id, NEW.month);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_transaction_threshold_check ON public.transactions;
CREATE TRIGGER after_transaction_threshold_check AFTER INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.trigger_check_threshold();

-- Get recent transactions
CREATE OR REPLACE FUNCTION public.get_recent_transactions(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (id UUID, amount NUMERIC, type TEXT, category TEXT, merchant TEXT, date DATE, account_name TEXT, to_account_name TEXT) AS $$
BEGIN
  RETURN QUERY SELECT t.id, t.amount, t.type, t.category, t.merchant, t.date, a1.name as account_name, a2.name as to_account_name
  FROM public.transactions t LEFT JOIN public.accounts a1 ON t.account_id = a1.id LEFT JOIN public.accounts a2 ON t.to_account_id = a2.id
  WHERE t.user_id = p_user_id ORDER BY t.date DESC, t.created_at DESC LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 6: CREATE USER (sairohithtappatla45@gmail.com)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_confirmed_user(user_email TEXT, user_password TEXT, user_name TEXT)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  new_user_id := gen_random_uuid();
  encrypted_pw := crypt(user_password, gen_salt('bf'));
  
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at,
    raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
  ) VALUES (
    new_user_id, '00000000-0000-0000-0000-000000000000', user_email, encrypted_pw, NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb, json_build_object('name', user_name)::jsonb,
    'authenticated', 'authenticated', NOW(), NOW()
  );
  
  INSERT INTO public.user_profiles (id, email, name, total_balance, monthly_spent, currency)
  VALUES (new_user_id, user_email, user_name, 0, 0, 'INR');
  
  INSERT INTO public.accounts (user_id, name, type, balance, color, icon)
  VALUES 
    (new_user_id, 'Savings', 'savings', 0, '#6366F1', 'wallet-outline'),
    (new_user_id, 'Expenses', 'expense', 0, '#0EA5E9', 'card-outline');
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the specific user
SELECT public.create_confirmed_user('sairohithtappatla45@gmail.com', 'Sairohith@2005', 'Sai Rohith');

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================
-- The database is now ready with:
-- - All tables, indexes, and RLS policies
-- - All functions and triggers
-- - User: sairohithtappatla45@gmail.com created and confirmed
-- 
-- Next steps:
-- 1. Update .env with your Supabase URL and anon key
-- 2. In Supabase Dashboard → Authentication → Configuration
--    - Disable "Confirm email" under Email Auth settings
-- 3. Start your app: npm start
-- 4. Login with: sairohithtappatla45@gmail.com / Sairohith@2005
-- ============================================================
