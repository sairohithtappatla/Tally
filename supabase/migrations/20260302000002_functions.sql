-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, total_balance, monthly_spent, currency)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    0,
    0,
    'INR'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create default accounts for new user
CREATE OR REPLACE FUNCTION public.create_default_accounts(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.accounts (user_id, name, type, balance, color, icon)
  VALUES 
    (p_user_id, 'Savings', 'savings', 0, '#6366F1', 'wallet-outline'),
    (p_user_id, 'Expenses', 'expense', 0, '#0EA5E9', 'card-outline');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to atomically update account balance
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
    UPDATE public.accounts
    SET balance = balance + p_amount
    WHERE id = p_account_id
    RETURNING * INTO v_account;
  ELSIF p_operation = 'subtract' THEN
    UPDATE public.accounts
    SET balance = balance - p_amount
    WHERE id = p_account_id
    RETURNING * INTO v_account;
  ELSE
    RAISE EXCEPTION 'Invalid operation: %', p_operation;
  END IF;
  
  RETURN v_account;
END;
$$ LANGUAGE plpgsql;

-- Function to add transaction with automatic balance update
CREATE OR REPLACE FUNCTION public.add_transaction(
  p_user_id UUID,
  p_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_category TEXT,
  p_merchant TEXT,
  p_date DATE,
  p_month TEXT
)
RETURNS public.transactions AS $$
DECLARE
  v_transaction public.transactions;
BEGIN
  -- Insert transaction
  INSERT INTO public.transactions (
    user_id, account_id, to_account_id, amount, type, category, merchant, date, month
  )
  VALUES (
    p_user_id, p_account_id, p_to_account_id, p_amount, p_type, p_category, p_merchant, p_date, p_month
  )
  RETURNING * INTO v_transaction;

  -- Update account balances based on transaction type
  IF p_type = 'income' THEN
    PERFORM public.update_account_balance(p_account_id, p_amount, 'add');
  ELSIF p_type = 'expense' THEN
    PERFORM public.update_account_balance(p_account_id, p_amount, 'subtract');
  ELSIF p_type = 'transfer' AND p_to_account_id IS NOT NULL THEN
    PERFORM public.update_account_balance(p_account_id, p_amount, 'subtract');
    PERFORM public.update_account_balance(p_to_account_id, p_amount, 'add');
  END IF;

  -- Update monthly snapshot
  PERFORM public.update_monthly_snapshot(p_user_id, p_month, p_amount, p_type);

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- Function to update monthly snapshot
CREATE OR REPLACE FUNCTION public.update_monthly_snapshot(
  p_user_id UUID,
  p_month TEXT,
  p_amount NUMERIC,
  p_type TEXT
)
RETURNS public.monthly_snapshots AS $$
DECLARE
  v_snapshot public.monthly_snapshots;
BEGIN
  -- Try to update existing snapshot
  IF p_type = 'income' THEN
    UPDATE public.monthly_snapshots
    SET 
      total_income = total_income + p_amount,
      net_balance = (total_income + p_amount) - total_expense
    WHERE user_id = p_user_id AND month = p_month
    RETURNING * INTO v_snapshot;
  ELSIF p_type = 'expense' THEN
    UPDATE public.monthly_snapshots
    SET 
      total_expense = total_expense + p_amount,
      net_balance = total_income - (total_expense + p_amount)
    WHERE user_id = p_user_id AND month = p_month
    RETURNING * INTO v_snapshot;
  END IF;

  -- If no snapshot exists, create one
  IF v_snapshot IS NULL THEN
    INSERT INTO public.monthly_snapshots (user_id, month, total_income, total_expense, net_balance)
    VALUES (
      p_user_id,
      p_month,
      CASE WHEN p_type = 'income' THEN p_amount ELSE 0 END,
      CASE WHEN p_type = 'expense' THEN p_amount ELSE 0 END,
      CASE WHEN p_type = 'income' THEN p_amount ELSE -p_amount END
    )
    RETURNING * INTO v_snapshot;
  END IF;

  RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql;

-- Function to delete transaction with balance reversal
CREATE OR REPLACE FUNCTION public.delete_transaction_with_reversal(p_transaction_id UUID)
RETURNS void AS $$
DECLARE
  v_transaction public.transactions;
BEGIN
  -- Get the transaction details
  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Reverse the balance changes
  IF v_transaction.type = 'income' THEN
    PERFORM public.update_account_balance(v_transaction.account_id, v_transaction.amount, 'subtract');
  ELSIF v_transaction.type = 'expense' THEN
    PERFORM public.update_account_balance(v_transaction.account_id, v_transaction.amount, 'add');
  ELSIF v_transaction.type = 'transfer' AND v_transaction.to_account_id IS NOT NULL THEN
    PERFORM public.update_account_balance(v_transaction.account_id, v_transaction.amount, 'add');
    PERFORM public.update_account_balance(v_transaction.to_account_id, v_transaction.amount, 'subtract');
  END IF;

  -- Reverse monthly snapshot
  IF v_transaction.type = 'income' THEN
    UPDATE public.monthly_snapshots
    SET 
      total_income = total_income - v_transaction.amount,
      net_balance = (total_income - v_transaction.amount) - total_expense
    WHERE user_id = v_transaction.user_id AND month = v_transaction.month;
  ELSIF v_transaction.type = 'expense' THEN
    UPDATE public.monthly_snapshots
    SET 
      total_expense = total_expense - v_transaction.amount,
      net_balance = total_income - (total_expense - v_transaction.amount)
    WHERE user_id = v_transaction.user_id AND month = v_transaction.month;
  END IF;

  -- Delete the transaction
  DELETE FROM public.transactions WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user's total balance
CREATE OR REPLACE FUNCTION public.calculate_user_total_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(balance), 0) INTO v_total
  FROM public.accounts
  WHERE user_id = p_user_id;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Function to get category spending for a month
CREATE OR REPLACE FUNCTION public.get_category_spending(
  p_user_id UUID,
  p_month TEXT
)
RETURNS TABLE (
  category TEXT,
  total_spent NUMERIC,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.category,
    SUM(t.amount) as total_spent,
    COUNT(*) as transaction_count
  FROM public.transactions t
  WHERE t.user_id = p_user_id 
    AND t.month = p_month
    AND t.type = 'expense'
  GROUP BY t.category
  ORDER BY total_spent DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check budget thresholds and create alerts
CREATE OR REPLACE FUNCTION public.check_budget_threshold(
  p_user_id UUID,
  p_month TEXT
)
RETURNS void AS $$
DECLARE
  v_snapshot public.monthly_snapshots;
  v_budget NUMERIC;
  v_percentage NUMERIC;
  v_threshold INTEGER;
BEGIN
  -- Get user's budget
  SELECT monthly_budget INTO v_budget
  FROM public.user_profiles
  WHERE id = p_user_id;

  -- Get monthly snapshot
  SELECT * INTO v_snapshot
  FROM public.monthly_snapshots
  WHERE user_id = p_user_id AND month = p_month;

  IF v_snapshot IS NULL OR v_budget = 0 THEN
    RETURN;
  END IF;

  -- Calculate percentage
  v_percentage := (v_snapshot.total_expense / v_budget) * 100;

  -- Check thresholds and create alerts
  FOR v_threshold IN SELECT unnest(ARRAY[100, 80, 50]) LOOP
    IF v_percentage >= v_threshold THEN
      -- Insert alert if not exists
      INSERT INTO public.alert_logs (user_id, month, threshold)
      VALUES (p_user_id, p_month, v_threshold)
      ON CONFLICT (user_id, month, threshold) DO NOTHING;
      
      EXIT; -- Only log the highest exceeded level
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-check thresholds after transaction
CREATE OR REPLACE FUNCTION public.trigger_check_threshold()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.check_budget_threshold(NEW.user_id, NEW.month);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_transaction_threshold_check
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_check_threshold();

-- Function to get recent transactions with account names
CREATE OR REPLACE FUNCTION public.get_recent_transactions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  amount NUMERIC,
  type TEXT,
  category TEXT,
  merchant TEXT,
  date DATE,
  account_name TEXT,
  to_account_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.amount,
    t.type,
    t.category,
    t.merchant,
    t.date,
    a1.name as account_name,
    a2.name as to_account_name
  FROM public.transactions t
  LEFT JOIN public.accounts a1 ON t.account_id = a1.id
  LEFT JOIN public.accounts a2 ON t.to_account_id = a2.id
  WHERE t.user_id = p_user_id
  ORDER BY t.date DESC, t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
