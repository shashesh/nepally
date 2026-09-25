import React, { createContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../config/supabase';
import { getMyProfile } from '@nepally/shared';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { saveUserData, clearAllData } from '../utils/storage';
import { registerForPushNotificationsAsync, isExpoGo } from '../services/notifications';

// Sessions are long-lived, like Facebook and Reddit: a user stays signed in
// on a device until they sign out. There is no inactivity timeout and no
// maximum session age (docs/decisions/2026-09-18-long-lived-sessions.md).

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  profile_photo?: string;
  bio?: string | null;
  zip_code?: string;
  metro_area_id?: string;
  trust_level: number;
  is_premium: boolean;
  hometown_district?: string | null;
  college?: string | null;
  years_in_us?: number | null;
  languages?: string[];
  follower_count?: number;
  following_count?: number;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  pauseAuthListener: () => void;
  resumeAuthListener: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  supabaseUser: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
  pauseAuthListener: () => {},
  resumeAuthListener: () => {},
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
      if (!didRegister && !isExpoGo) {
        // In Expo Go this is expected (remote push unsupported), so stay silent
        // there; on real builds a falsy result means denied/failed registration.
        console.warn('Push token registration skipped or denied for mobile user:', userId);
      }
    } catch (error) {
      console.error('Mobile push token registration failed:', error);
      // Allow retry on a subsequent auth transition when an unexpected error occurs.
      pushRegistrationAttemptedUserIdRef.current = null;
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

      // Fetch own profile through the get_my_profile RPC — email, phone,
      // zip_code are not readable via the REST column grant (migration 036).
      const { data: userData, error } = await getMyProfile(supabase);

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
        hometown_district: userData.hometown_district ?? null,
        college: userData.college ?? null,
        years_in_us: userData.years_in_us ?? null,
        languages: userData.languages ?? [],
        follower_count: userData.follower_count ?? 0,
        following_count: userData.following_count ?? 0,
      };

      setUser(userProfile);
      await saveUserData(userProfile);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  // Load user data from storage on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionUser = session?.user ?? null;
        if (!sessionUser) {
          // No valid Supabase session: keep auth state signed out.
          pushRegistrationAttemptedUserIdRef.current = null;
          if (!cancelled) {
            setSupabaseUser(null);
            setUser(null);
          }
          return;
        }
        if (!cancelled) setSupabaseUser(sessionUser);
        void registerPushTokenForUser(sessionUser.id);
        await refreshUser();
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser, registerPushTokenForUser]);

  // supabase-js starts its token-refresh timer when the client initialises
  // (autoRefreshToken). React Native freezes timers in the background, so pause
  // it there and resume it on return to the foreground. A session then stays
  // valid however long the app sat unused (Supabase's React Native pattern).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

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
        } else if (session?.user) {
          setSupabaseUser(session.user);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
