'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getUserById } from '@nusa/shared';
import type { User } from '@nusa/shared';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setSupabaseUser(null);
        setUser(null);
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
