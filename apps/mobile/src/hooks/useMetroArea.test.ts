import { act, renderHook } from '@testing-library/react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => mockAsyncStorage
);

import * as storage from '../utils/storage';

jest.mock('../config/supabase', () => ({
  __esModule: true,
  supabase: {},
}));

import { useMetroArea } from './useMetroArea';

type CachedMetro = {
  id: string;
  name: string;
  state: string;
  population: number | null;
};

describe('useMetroArea', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('loads cached metro and fills missing population as null', async () => {
    jest.spyOn(storage, 'getMetroArea').mockResolvedValue({
      id: '35620',
      name: 'New York-Newark-Jersey City',
      state: 'NY',
    });

    const { result } = renderHook(() => useMetroArea());
    await act(async () => {});

    let cached: CachedMetro | null = null;
    await act(async () => {
      cached = await result.current.getCachedMetroArea();
    });

    expect(cached).toEqual({
      id: '35620',
      name: 'New York-Newark-Jersey City',
      state: 'NY',
      population: null,
    });
    expect(result.current.metroArea?.id).toBe('35620');
  });
});
