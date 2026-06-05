import type { SupabaseClient } from '@supabase/supabase-js';

const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockGetExpoPushToken = jest.fn();
const mockRegisterDeviceToken = jest.fn();

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissions(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissions(...args),
  getExpoPushTokenAsync: (...args: unknown[]) => mockGetExpoPushToken(...args),
}));

jest.mock('@nepally/shared', () => ({
  registerDeviceToken: (...args: unknown[]) => mockRegisterDeviceToken(...args),
}));

// Mutable execution environment so each test can simulate Expo Go vs a real build.
let mockExecutionEnvironment = 'standalone';
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get executionEnvironment() {
      return mockExecutionEnvironment;
    },
  },
  ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' },
}));

const supabase = {} as SupabaseClient;

// `isExpoGo` is evaluated at module load, so re-import in isolation per test
// after setting the desired execution environment.
function loadService(): typeof import('./notifications') {
  let mod: typeof import('./notifications') | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('./notifications');
  });
  return mod!;
}

describe('registerForPushNotificationsAsync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecutionEnvironment = 'standalone';
  });

  it('skips registration in Expo Go without calling any push API', async () => {
    mockExecutionEnvironment = 'storeClient';
    const { registerForPushNotificationsAsync, isExpoGo } = loadService();

    const result = await registerForPushNotificationsAsync(supabase, 'user-1');

    expect(isExpoGo).toBe(true);
    expect(result).toBe(false);
    expect(mockGetPermissions).not.toHaveBeenCalled();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockGetExpoPushToken).not.toHaveBeenCalled();
    expect(mockRegisterDeviceToken).not.toHaveBeenCalled();
  });

  it('registers the push token on a real build when permission is granted', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    mockGetExpoPushToken.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
    mockRegisterDeviceToken.mockResolvedValue({ error: null });
    const { registerForPushNotificationsAsync, isExpoGo } = loadService();

    const result = await registerForPushNotificationsAsync(supabase, 'user-1');

    expect(isExpoGo).toBe(false);
    expect(result).toBe(true);
    expect(mockRegisterDeviceToken).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'ExponentPushToken[abc]',
      'expo'
    );
  });

  it('requests permission when not already granted', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetExpoPushToken.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
    mockRegisterDeviceToken.mockResolvedValue({ error: null });
    const { registerForPushNotificationsAsync } = loadService();

    const result = await registerForPushNotificationsAsync(supabase, 'user-1');

    expect(mockRequestPermissions).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when permission is denied', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });
    const { registerForPushNotificationsAsync } = loadService();

    const result = await registerForPushNotificationsAsync(supabase, 'user-1');

    expect(result).toBe(false);
    expect(mockGetExpoPushToken).not.toHaveBeenCalled();
    expect(mockRegisterDeviceToken).not.toHaveBeenCalled();
  });

  it('returns false when fetching the push token throws', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    mockGetExpoPushToken.mockRejectedValue(new Error('no token'));
    const { registerForPushNotificationsAsync } = loadService();

    const result = await registerForPushNotificationsAsync(supabase, 'user-1');

    expect(result).toBe(false);
    expect(mockRegisterDeviceToken).not.toHaveBeenCalled();
  });
});
