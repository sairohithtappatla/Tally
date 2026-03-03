-- Disable email confirmation requirement for development/small user base
-- Auto-confirm all users on signup

-- Update trigger to auto-confirm users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm the email
  UPDATE auth.users 
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW()
  WHERE id = NEW.id;

  -- Create user profile
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON auth.users TO postgres, service_role;
