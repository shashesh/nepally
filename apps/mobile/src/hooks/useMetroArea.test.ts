import { act, renderHook } from '@testing-library/react-native';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import * as storage from '../utils/storage';

jest.mock('../config/supabase', () => ({
  __esModule: true,
  supabase: {},
}));

import { useMetroArea } from './useMetroArea';

describe('useMetroArea', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('loads cached metro and fills missing population as null', async () => {
    jest.spyOn(storage, 'getMetroArea').mockResolvedValue({
      id: '35620',
      name: 'New York-Newark-Jersey City',
      state: 'NY',
    } as any);

    const { result } = renderHook(() => useMetroArea());

    let cached: any = null;
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
