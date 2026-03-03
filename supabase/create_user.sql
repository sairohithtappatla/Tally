-- Create specific user for Tally Finance App
-- Email: sairohithtappatla45@gmail.com
-- Password: Sairohith@2005

-- This script creates a pre-confirmed user in the auth system

-- Step 1: Insert user into auth.users with confirmed email
-- Note: You need to run this in Supabase SQL Editor with proper permissions
-- The password will be hashed automatically by Supabase

-- Method 1: Using Supabase Auth Admin (Recommended)
-- Run this in SQL Editor:

-- First, let's create a function to add a pre-confirmed user
CREATE OR REPLACE FUNCTION public.create_confirmed_user(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  -- Generate UUID
  new_user_id := gen_random_uuid();
  
  -- Hash password using pgcrypto
  encrypted_pw := crypt(user_password, gen_salt('bf'));
  
  -- Insert into auth.users with confirmation
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    encrypted_pw,
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('name', user_name)::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  );
  
  -- Create user profile
  INSERT INTO public.user_profiles (id, email, name, total_balance, monthly_spent, currency)
  VALUES (
    new_user_id,
    user_email,
    user_name,
    0,
    0,
    'INR'
  );
  
  -- Create default accounts
  INSERT INTO public.accounts (user_id, name, type, balance, color, icon)
  VALUES 
    (new_user_id, 'Savings', 'savings', 0, '#6366F1', 'wallet-outline'),
    (new_user_id, 'Expenses', 'expense', 0, '#0EA5E9', 'card-outline');
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create the actual user
-- Run this after creating the function above:
SELECT public.create_confirmed_user(
  'sairohithtappatla45@gmail.com',
  'Sairohith@2005',
  'SaiRohith'
);

-- Optional: Create a second test user
-- SELECT public.create_confirmed_user(
--   'testuser@example.com',
--   'TestPassword123',
--   'Test User'
-- );

