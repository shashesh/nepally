import React, { createContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../config/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { saveUserData, clearAllData } from '../utils/storage';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  profile_photo?: string;
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

  // Load user data from storage on mount
  useEffect(() => {
    loadUser();
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
        } else if (session?.user) {
          setSupabaseUser(session.user);
          await refreshUser();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUser = async () => {
    try {
      // Check if there's an active session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setSupabaseUser(session.user);
        await refreshUser();
      } else {
        // No valid Supabase session: keep auth state signed out.
        setSupabaseUser(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
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
        .single();

      if (error) throw error;

      const userProfile: User = {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        phone: userData.phone,
        profile_photo: userData.profile_photo || undefined,
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
  };

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
