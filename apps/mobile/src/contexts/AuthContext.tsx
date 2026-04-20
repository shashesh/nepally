import React, { createContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { saveUserData, clearAllData } from '../utils/storage';
import { registerForPushNotificationsAsync } from '../services/notifications';

const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SENSITIVE_ACTION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const STORAGE_KEY_SIGN_IN_AT = '@nusa:session_sign_in_at';
const STORAGE_KEY_LAST_ACTIVITY = '@nusa:session_last_activity';
const STORAGE_KEY_USER_ID = '@nusa:session_user_id';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  profile_photo?: string;
  bio?: string | null;
  zip_code?: string;
  metro_area_id?: string;
  trust_level: number;
  is_premium: boolean;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  pauseAuthListener: () => void;
  resumeAuthListener: () => void;
  recordActivity: () => Promise<void>;
  isWithinSensitiveActionWindow: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  supabaseUser: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
  pauseAuthListener: () => {},
  resumeAuthListener: () => {},
  recordActivity: async () => {},
  isWithinSensitiveActionWindow: async () => false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const authPausedRef = useRef(false);
  const pushRegistrationAttemptedUserIdRef = useRef<string | null>(null);

  const registerPushTokenForUser = useCallback(async (userId: string) => {
    if (pushRegistrationAttemptedUserIdRef.current === userId) {
      return;
    }

    pushRegistrationAttemptedUserIdRef.current = userId;

    try {
      const didRegister = await registerForPushNotificationsAsync(supabase, userId);
      if (!didRegister) {
        console.warn('Push token registration skipped or denied for mobile user:', userId);
      }
    } catch (error) {
      console.error('Mobile push token registration failed:', error);
      // Allow retry on a subsequent auth transition when an unexpected error occurs.
      pushRegistrationAttemptedUserIdRef.current = null;
    }
  }, []);

  const recordActivity = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, Date.now().toString());
    } catch (error) {
      console.error('Failed to record activity:', error);
    }
  }, []);

  const isSessionExpired = useCallback(async (): Promise<boolean> => {
    try {
      const [lastActivityStr, signInAtStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_LAST_ACTIVITY),
        AsyncStorage.getItem(STORAGE_KEY_SIGN_IN_AT),
      ]);
      const now = Date.now();
      if (lastActivityStr) {
        const lastActivity = parseInt(lastActivityStr, 10);
        if (isNaN(lastActivity) || now - lastActivity > SESSION_INACTIVITY_TIMEOUT_MS) return true;
      }
      if (signInAtStr) {
        const signInAt = parseInt(signInAtStr, 10);
        if (isNaN(signInAt) || now - signInAt > SESSION_MAX_AGE_MS) return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const isWithinSensitiveActionWindow = useCallback(async (): Promise<boolean> => {
    try {
      const lastActivityStr = await AsyncStorage.getItem(STORAGE_KEY_LAST_ACTIVITY);
      if (!lastActivityStr) return false;
      const lastActivity = parseInt(lastActivityStr, 10);
      return Date.now() - lastActivity <= SENSITIVE_ACTION_WINDOW_MS;
    } catch {
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      if (!supabaseUser) {
        // Don't clear user here — transient auth operations (e.g. signInWithPassword
        // during password change) can briefly return null. Only signOut should clear user.
        return;
      }

      // Fetch user profile from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      // Profile not yet created (e.g. auth state fires before createUserProfile completes during signup)
      if (error) throw error;
      if (!userData) {
        setUser(null);
        return;
      }

      const userProfile: User = {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        phone: userData.phone,
        profile_photo: userData.profile_photo || undefined,
        bio: userData.bio ?? null,
        zip_code: userData.zip_code,
        metro_area_id: userData.metro_area_id,
        trust_level: userData.trust_level,
        is_premium: userData.is_premium ?? false,
      };

      setUser(userProfile);
      await saveUserData(userProfile);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      // Check if there's an active session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const expired = await isSessionExpired();
        if (expired) {
          await supabase.auth.signOut();
          setSupabaseUser(null);
          setUser(null);
          pushRegistrationAttemptedUserIdRef.current = null;
        } else {
          // Repair missing/mismatched timestamps so expiry is enforced from
          // first load (e.g. after upgrade, storage clear, or user switch).
          const [existingSignInAt, existingUserId] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY_SIGN_IN_AT),
            AsyncStorage.getItem(STORAGE_KEY_USER_ID),
          ]);
          if (!existingSignInAt || existingUserId !== session.user.id) {
            const now = Date.now().toString();
            await AsyncStorage.multiSet([
              [STORAGE_KEY_SIGN_IN_AT, now],
              [STORAGE_KEY_LAST_ACTIVITY, now],
              [STORAGE_KEY_USER_ID, session.user.id],
            ]);
          }
          setSupabaseUser(session.user);
          void registerPushTokenForUser(session.user.id);
          await refreshUser();
        }
      } else {
        // No valid Supabase session: keep auth state signed out.
        setSupabaseUser(null);
        setUser(null);
        pushRegistrationAttemptedUserIdRef.current = null;
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  }, [isSessionExpired, refreshUser, registerPushTokenForUser]);

  // Load user data from storage on mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip auth state changes while paused (e.g. during password change)
        if (authPausedRef.current) return;

        if (event === 'SIGNED_OUT') {
          setSupabaseUser(null);
          setUser(null);
          pushRegistrationAttemptedUserIdRef.current = null;
          await AsyncStorage.multiRemove([STORAGE_KEY_SIGN_IN_AT, STORAGE_KEY_LAST_ACTIVITY, STORAGE_KEY_USER_ID]);
        } else if (session?.user) {
          setSupabaseUser(session.user);
          // Record sign-in time if not already set or if the user changed
          const [existingSignInAt, existingUserId] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY_SIGN_IN_AT),
            AsyncStorage.getItem(STORAGE_KEY_USER_ID),
          ]);
          if (!existingSignInAt || existingUserId !== session.user.id) {
            const now = Date.now().toString();
            await AsyncStorage.multiSet([
              [STORAGE_KEY_SIGN_IN_AT, now],
              [STORAGE_KEY_LAST_ACTIVITY, now],
              [STORAGE_KEY_USER_ID, session.user.id],
            ]);
          }
          void registerPushTokenForUser(session.user.id);
          await refreshUser();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser, registerPushTokenForUser]);

  const pauseAuthListener = () => {
    authPausedRef.current = true;
  };

  const resumeAuthListener = () => {
    authPausedRef.current = false;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await clearAllData();
      setUser(null);
      setSupabaseUser(null);
      pushRegistrationAttemptedUserIdRef.current = null;
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        loading,
        signOut,
        refreshUser,
        pauseAuthListener,
        resumeAuthListener,
        recordActivity,
        isWithinSensitiveActionWindow,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
