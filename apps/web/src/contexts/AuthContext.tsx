'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getMyProfile } from '@nepally/shared';
import type { User } from '@nepally/shared';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { requestWebPushPermission } from '../lib/webPush';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  /** Re-reads the member's profile; resolves with it, or null when none loaded. */
  refreshUser: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  supabaseUser: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pushRegistrationAttemptedUserIdRef = useRef<string | null>(null);

  // Own row (email, phone, zip_code, moderation flags) is only readable through
  // the get_my_profile RPC — clients hold column-level SELECT on users (036).
  const fetchUserProfile = useCallback(async (): Promise<User | null> => {
    try {
      const result = await getMyProfile(supabase);
      if (result.data) {
        setUser(result.data);
        return result.data;
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
    return null;
  }, []);

  // Load initial session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled || !session?.user) return;
        setSupabaseUser(session.user);
        await fetchUserProfile();
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchUserProfile]);

  // Register browser push subscription once per authenticated user in this app session.
  useEffect(() => {
    const userId = supabaseUser?.id;

    if (!userId) {
      pushRegistrationAttemptedUserIdRef.current = null;
      return;
    }

    if (pushRegistrationAttemptedUserIdRef.current === userId) {
      return;
    }

    pushRegistrationAttemptedUserIdRef.current = userId;
    let cancelled = false;

    const registerPush = async () => {
      try {
        const didRegister = await requestWebPushPermission(supabase, userId);
        if (!didRegister && !cancelled) {
          console.warn('Web push registration skipped or denied for user:', userId);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Web push registration failed:', error);
          // Unexpected exception: allow retry when auth state changes again.
          pushRegistrationAttemptedUserIdRef.current = null;
        }
      }
    };

    void registerPush();

    return () => {
      cancelled = true;
    };
  }, [supabaseUser?.id]);

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setSupabaseUser(null);
        setUser(null);
        pushRegistrationAttemptedUserIdRef.current = null;
      } else if (session?.user) {
        setSupabaseUser(session.user);
        await fetchUserProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Never rejects: login, onboarding and the auth callback await it on their
  // success paths, and a rejection would strand them mid-flow.
  async function refreshUser(): Promise<User | null> {
    try {
      const {
        data: { user: sbUser },
      } = await supabase.auth.getUser();
      return sbUser ? await fetchUserProfile() : null;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSupabaseUser(null);
      pushRegistrationAttemptedUserIdRef.current = null;
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        loading,
        signOut: handleSignOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
