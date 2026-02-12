import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Hook to access authentication context
 * Provides user state, loading state, and auth actions
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
