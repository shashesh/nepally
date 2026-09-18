import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { secureSessionStorage } from '../services/auth/secureSessionStorage';

// Get environment variables from Expo config
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Warn if using placeholder credentials
if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('⚠️ WARNING: Using placeholder Supabase credentials. Create .env file with real credentials for full functionality.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Encrypted at rest: the key lives in the keychain/keystore.
    storage: secureSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
