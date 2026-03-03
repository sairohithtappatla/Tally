import { supabase } from './supabaseClient';
import { UserProfile } from '../types/supabase';

export const authService = {
  async register(email: string, pass: string, name: string) {
    try {
      // Sign up with Supabase Auth - disable email confirmation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            name: name,
          },
          emailRedirectTo: undefined,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // For small user base - auto login even if email not confirmed
      const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      // If email not confirmed error, that's okay for this use case
      if (signInError && !signInError.message.includes('Email not confirmed')) {
        throw signInError;
      }

      // Create profile if it doesn't exist
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: authData.user.id,
          email: authData.user.email!,
          name: name,
          total_balance: 0,
          monthly_spent: 0,
          currency: 'INR',
        }, {
          onConflict: 'id'
        });

      if (profileError && profileError.code !== '23505') {
        console.error('Profile creation error:', profileError);
      }

      // Auto-create default accounts
      try {
        const { error: accountsError } = await supabase.rpc('create_default_accounts', {
          p_user_id: authData.user.id,
        });

        if (accountsError && !accountsError.message.includes('duplicate')) {
          console.error('Failed to create default accounts:', accountsError);
        }
      } catch (accountError) {
        console.error('Failed to create default accounts:', accountError);
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
