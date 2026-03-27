jest.mock('expo-location', () => ({
  __esModule: true,
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: {
    Balanced: 'balanced',
  },
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

jest.mock('@nepally/shared', () => ({
  __esModule: true,
  getMetroByZip: jest.fn(),
}));

jest.mock('../config/supabase', () => ({
  supabase: {},
}));

import {
  detectLocationMetro,
  getCurrentPosition,
  getLocationPermissionStatus,
  requestLocationPermission,
  reverseGeocodeToZip,
} from './location';
import * as Location from 'expo-location';
import { getMetroByZip } from '@nepally/shared';

describe('location service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps permission states correctly', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    await expect(requestLocationPermission()).resolves.toBe('granted');
    await expect(getLocationPermissionStatus()).resolves.toBe('denied');
  });

  it('returns coordinates from current position', async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 32.95, longitude: -96.83, accuracy: 11 },
    });

    const result = await getCurrentPosition();

    expect(result).toEqual({ latitude: 32.95, longitude: -96.83, accuracy: 11 });
  });

  it('returns ZIP code from reverse geocode result', async () => {
    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([{ postalCode: '75001' }]);

    const zip = await reverseGeocodeToZip({ latitude: 32.95, longitude: -96.83 });

    expect(zip).toBe('75001');
  });

  it('detects metro from GPS -> ZIP -> metro pipeline', async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 32.95, longitude: -96.83, accuracy: 10 },
    });
    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([{ postalCode: '75001' }]);
    (getMetroByZip as jest.Mock).mockResolvedValue({
      data: { id: '19100', name: 'Dallas-Fort Worth-Arlington', state: 'TX' },
      error: null,
    });

    const result = await detectLocationMetro();

    expect(getMetroByZip).toHaveBeenCalled();
    expect(result?.metro_area_id).toBe('19100');
    expect(result?.zip_code).toBe('75001');
  });
});
