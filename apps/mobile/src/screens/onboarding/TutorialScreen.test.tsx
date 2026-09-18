import React from 'react';
import { FlatList, type ViewToken } from 'react-native';
import { act, fireEvent, render, waitFor, type RenderResult } from '@testing-library/react-native';
import { TutorialScreen } from './TutorialScreen';

const mockReplace = jest.fn();
const mockCompleteOnboarding = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ getParent: () => ({ replace: mockReplace }) }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock('../../hooks/useOnboarding', () => ({
  useOnboarding: () => ({ completeOnboarding: mockCompleteOnboarding }),
}));

const MAIN_ROUTE_PARAMS = { screen: 'Home', params: { screen: 'HomeMain' } };

/** Simulate FlatList reporting that the card at `index` is now the visible one. */
function showCard(screen: RenderResult, index: number) {
  const list = screen.UNSAFE_getByType(FlatList);
  act(() => {
    list.props.onViewableItemsChanged({
      viewableItems: [{ index } as ViewToken],
      changed: [],
    });
  });
}

describe('TutorialScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompleteOnboarding.mockResolvedValue(undefined);
  });

  it('starts on the first card with a Next button', () => {
    const screen = render(<TutorialScreen />);

    expect(screen.getByText('Metro-First Community')).toBeTruthy();
    expect(screen.getByText('Next')).toBeTruthy();
    expect(screen.queryByText('Get Started')).toBeNull();
  });

  it('scrolls to the next card when Next is pressed', () => {
    const scrollToIndex = jest
      .spyOn(FlatList.prototype, 'scrollToIndex')
      .mockImplementation(() => {});

    try {
      const screen = render(<TutorialScreen />);
      fireEvent.press(screen.getByText('Next'));

      expect(scrollToIndex).toHaveBeenCalledWith({ index: 1, animated: true });
      expect(mockCompleteOnboarding).not.toHaveBeenCalled();
    } finally {
      scrollToIndex.mockRestore();
    }
  });

  it('switches to Get Started once the last card is visible', () => {
    const screen = render(<TutorialScreen />);

    showCard(screen, 2);

    expect(screen.getByText('Get Started')).toBeTruthy();
    expect(screen.queryByText('Next')).toBeNull();
  });

  it('keeps the FlatList viewability props referentially stable across re-renders', () => {
    // FlatList throws if onViewableItemsChanged changes identity after mount.
    const screen = render(<TutorialScreen />);
    const before = screen.UNSAFE_getByType(FlatList).props;

    showCard(screen, 1);

    const after = screen.UNSAFE_getByType(FlatList).props;
    expect(after.onViewableItemsChanged).toBe(before.onViewableItemsChanged);
    expect(after.viewabilityConfig).toBe(before.viewabilityConfig);
    expect(after.viewabilityConfig).toEqual({ itemVisiblePercentThreshold: 50 });
  });

  it('completes onboarding and enters the app from the last card', async () => {
    const screen = render(<TutorialScreen />);
    showCard(screen, 2);

    fireEvent.press(screen.getByText('Get Started'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Main', MAIN_ROUTE_PARAMS);
    });
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });

  it('completes onboarding and enters the app when the tutorial is skipped', async () => {
    const screen = render(<TutorialScreen />);

    fireEvent.press(screen.getByText('Skip Tutorial'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Main', MAIN_ROUTE_PARAMS);
    });
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });
});
