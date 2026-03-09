import { supabase } from './supabaseClient';
import { UserProfile } from '../types/supabase';

export const authService = {
  async register(email: string, pass: string, name: string) {
    try {
      // Sign up with Supabase Auth
      // The database trigger 'handle_new_user' will now automatically:
      // 1. Auto-confirm the email
      // 2. Create the user_profile
      // 3. Create default accounts (Savings, Expenses)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Attempt to sign in immediately to get a session
      // Since the trigger auto-confirms, this will work instantly
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (signInError) {
        console.warn('Initial sign-in failed, user might need to login manually:', signInError.message);
      }

      return authData.user;
    } catch (error: any) {
      // Make email confirmation errors less severe
      if (error?.message?.includes('Email not confirmed')) {
        console.warn('Email not confirmed, but proceeding with registration');
        return null;
      }
      console.error('Registration failed:', error);
      throw error;
    }
  },

  async login(email: string, pass: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) return null;
      return user;
    } catch (error) {
      return null;
    }
  },

  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    } catch (error) {
      console.error('Fetch profile failed:', error);
      return null;
    }
  },
};
