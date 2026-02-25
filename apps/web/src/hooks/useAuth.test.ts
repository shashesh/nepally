import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../contexts/AuthContext';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  it('returns the default context (user null) when used outside AuthProvider', () => {
    let captured: ReturnType<typeof useAuth> | undefined;
    function TestComponent() {
      captured = useAuth();
      return null;
    }
    render(React.createElement(TestComponent));
    expect(captured?.user).toBeNull();
    expect(captured?.loading).toBe(true);
  });

  it('returns the provided context value when inside AuthProvider', () => {
    const mockContext = {
      user: { id: 'user-1', full_name: 'Test User' },
      loading: false,
      supabaseUser: null,
      signOut: vi.fn(),
      refreshUser: vi.fn(),
    };

    let captured: ReturnType<typeof useAuth> | undefined;
    function TestComponent() {
      captured = useAuth();
      return null;
    }

    render(
      React.createElement(
        AuthContext.Provider,
        { value: mockContext as Parameters<typeof AuthContext.Provider>[0]['value'] },
        React.createElement(TestComponent)
      )
    );

    expect(captured?.user?.id).toBe('user-1');
    expect(captured?.loading).toBe(false);
  });
});
