import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Platform-safe storage adapter: avoids "window is not defined" during
// Expo Router's Node.js static/SSR rendering pass.
function getStorage() {
  // Native (iOS / Android)
  if (Platform.OS !== 'web') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
  }

  // Browser (web runtime)
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }

  // SSR / Node.js – return a no-op adapter so Supabase initialises without crashing
  return {
    getItem: (_key: string) => Promise.resolve(null),
    setItem: (_key: string, _value: string) => Promise.resolve(),
    removeItem: (_key: string) => Promise.resolve(),
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'tally-finance-app',
    },
  },
});

export default supabase;
