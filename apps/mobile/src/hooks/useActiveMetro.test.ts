import { renderHook } from '@testing-library/react-native';
import { useActiveMetro } from './useActiveMetro';

const mockUseAuth = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('./useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('./useLocation', () => ({ useLocation: () => mockUseLocation() }));

const SAVED_HOME = {
  id: 's1',
  metro_area_id: 'm1',
  label: 'Home',
  metro_area: { name: 'Dallas-Fort Worth', state: 'TX' },
};

describe('useActiveMetro', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', metro_area_id: 'm1' } });
    mockUseLocation.mockReturnValue({ activeLocation: null, savedLocations: [] });
  });

  it("follows the active location when there is one, and marks a visit", () => {
    mockUseLocation.mockReturnValue({
      activeLocation: { metro_area_id: 'm2', metro_name: 'Austin', metro_state: 'TX', is_temporary: true },
      savedLocations: [],
    });
    const { result } = renderHook(() => useActiveMetro());

    expect(result.current).toEqual({ metroAreaId: 'm2', metroName: 'Austin, TX', locationLabel: 'Visiting' });
  });

  it("falls back to the member's metro, named from a saved location", () => {
    mockUseLocation.mockReturnValue({ activeLocation: null, savedLocations: [SAVED_HOME] });
    const { result } = renderHook(() => useActiveMetro());

    expect(result.current).toEqual({
      metroAreaId: 'm1',
      metroName: 'Dallas-Fort Worth, TX',
      locationLabel: 'Home',
    });
  });

  it('calls an unnamed metro "Your Metro Area", and has nothing without a metro', () => {
    const { result, rerender } = renderHook(() => useActiveMetro());
    expect(result.current.metroName).toBe('Your Metro Area');

    mockUseAuth.mockReturnValue({ user: { id: 'u1', metro_area_id: null } });
    rerender({});
    expect(result.current).toEqual({ metroAreaId: null, metroName: null, locationLabel: 'Home' });
  });
});
