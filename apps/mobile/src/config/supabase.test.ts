import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ auth: {} })),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'anon-key' } },
}));

jest.mock('../services/auth/secureSessionStorage', () => ({
  secureSessionStorage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

import { createClient } from '@supabase/supabase-js';
import './supabase';
import { secureSessionStorage } from '../services/auth/secureSessionStorage';

describe('mobile Supabase client', () => {
  it('persists a long-lived session in encrypted storage and keeps refreshing it', () => {
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key', {
      auth: expect.objectContaining({
        storage: secureSessionStorage,
        persistSession: true,
        autoRefreshToken: true,
      }),
    });
  });
});
