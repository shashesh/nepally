'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getUserById } from '@nepally/shared';
import type { User } from '@nepally/shared';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { requestWebPushPermission } from '../lib/webPush';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  supabaseUser: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pushRegistrationAttemptedUserIdRef = useRef<string | null>(null);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const result = await getUserById(supabase, userId);
      if (result.data) {
        setUser(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setSupabaseUser(session.user);
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]);

  // Load initial session
  useEffect(() => {
    loadUser();
  }, [loadUser]);

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
        await fetchUserProfile(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  async function refreshUser() {
    const {
      data: { user: sbUser },
    } = await supabase.auth.getUser();
    if (sbUser) {
      await fetchUserProfile(sbUser.id);
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
