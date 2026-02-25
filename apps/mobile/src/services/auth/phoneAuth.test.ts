jest.mock('../../config/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
    },
  },
}));

import { sendPhoneOTP, verifyPhoneOTP } from './phoneAuth';
import { supabase } from '../../config/supabase';

const mockAuth = supabase.auth as unknown as {
  signInWithOtp: jest.Mock;
  verifyOtp: jest.Mock;
};

describe('phoneAuth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends OTP successfully', async () => {
    mockAuth.signInWithOtp.mockResolvedValue({ error: null });

    const result = await sendPhoneOTP('+14695551212');

    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({ phone: '+14695551212' });
    expect(result.success).toBe(true);
  });

  it('returns failure for invalid OTP verification', async () => {
    mockAuth.verifyOtp.mockResolvedValue({
      error: new Error('Invalid token'),
    });

    const result = await verifyPhoneOTP('+14695551212', '000000');

    expect(mockAuth.verifyOtp).toHaveBeenCalledWith({
      phone: '+14695551212',
      token: '000000',
      type: 'sms',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });
});
