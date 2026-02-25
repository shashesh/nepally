jest.mock('../../config/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

import { signInWithEmail, signOut, signUpWithEmail } from './emailAuth';
import { supabase } from '../../config/supabase';

const mockAuth = supabase.auth as unknown as {
  signUp: jest.Mock;
  signInWithPassword: jest.Mock;
  signOut: jest.Mock;
};

describe('emailAuth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs up with email and returns user payload', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@nusa.com' } },
      error: null,
    });

    const result = await signUpWithEmail('test@nusa.com', 'Password1', 'Nusa User');

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'test@nusa.com',
      password: 'Password1',
      options: { data: { full_name: 'Nusa User' } },
    });
    expect(result.user?.id).toBe('user-1');
  });

  it('returns error on sign-in failure', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid credentials'),
    });

    const result = await signInWithEmail('test@nusa.com', 'wrong');

    expect(result.error).toBeInstanceOf(Error);
  });

  it('signs out successfully', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });

    const result = await signOut();

    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(result.error).toBeUndefined();
  });
});
