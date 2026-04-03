import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { getCategories, createListing } from '@nepally/shared';
import CreateListingScreen from './CreateListingScreen';

jest.mock('react-native-safe-area-context', () => {
  const mockReact = jest.requireActual('react');
  const { View: mockView } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      mockReact.createElement(mockView, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../config/supabase', () => ({ supabase: {} }));

const MOCK_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'Food & Restaurants',
    slug: 'food-restaurants',
    emoji: '🍜',
    icon: 'restaurant',
    color: '#FF6B35',
    description: 'Nepali restaurants',
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    name: 'Professional Services',
    slug: 'professional-services',
    emoji: '💼',
    icon: 'briefcase',
    color: '#2196F3',
    description: 'Professional services',
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
];

// Build a minimal real-like safeParse for testing validation errors
const mockSafeParse = jest.fn();

jest.mock('@nepally/shared', () => ({
  getCategories: jest.fn(async () => ({ data: [] })),
  getListingById: jest.fn(async () => ({ data: null })),
  createListing: jest.fn(async () => ({ data: { id: 'new-1' } })),
  updateListing: jest.fn(async () => ({ data: { id: 'edit-1' } })),
  uploadListingPhotos: jest.fn(async () => ({ urls: [] })),
  createListingSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
  ITEM_CONDITION_LABELS: { new: 'New', used: 'Used' },
  MAX_PHOTOS_PER_LISTING: 5,
}));

const mockGetCategories = getCategories as jest.MockedFunction<typeof getCategories>;
const mockCreateListing = createListing as jest.MockedFunction<typeof createListing>;

async function renderAndFlush() {
  const screen = render(<CreateListingScreen />);
  await act(async () => {});
  await act(async () => {});
  return screen;
}

describe('CreateListingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', trust_level: 1, metro_area_id: 'metro-1' },
    });
    mockGetCategories.mockResolvedValue({ data: MOCK_CATEGORIES });
    mockSafeParse.mockReturnValue({ success: true, data: {} });
  });

  it('renders "Create Listing" title and submit button', async () => {
    const screen = await renderAndFlush();
    expect(screen.getAllByText('Create Listing').length).toBe(2);
  });

  it('renders listing type toggles', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('Business')).toBeTruthy();
    expect(screen.getByText('Individual')).toBeTruthy();
  });

  it('loads and renders categories', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('Food & Restaurants')).toBeTruthy();
    expect(screen.getByText('Professional Services')).toBeTruthy();
  });

  it('renders form fields', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByPlaceholderText('What are you listing?')).toBeTruthy();
    expect(screen.getByPlaceholderText('Describe your listing in detail...')).toBeTruthy();
  });

  it('renders business-specific fields when listing type is business', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByPlaceholderText('Your business name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Business address')).toBeTruthy();
  });

  it('shows validation errors when form is invalid', async () => {
    mockSafeParse.mockReturnValue({
      success: false,
      error: {
        issues: [
          { path: ['title'], message: 'Title is required' },
          { path: ['description'], message: 'Description is required' },
        ],
      },
    });

    const screen = await renderAndFlush();

    // Press submit (last "Create Listing" text is the button)
    fireEvent.press(screen.getAllByText('Create Listing')[1]);
    await act(async () => {});

    expect(screen.getByText('Title is required')).toBeTruthy();
    expect(screen.getByText('Description is required')).toBeTruthy();
  });

  it('submits successfully and navigates back', async () => {
    mockSafeParse.mockReturnValue({ success: true, data: {} });
    mockCreateListing.mockResolvedValue({ data: { id: 'new-1' } } as never);

    const screen = await renderAndFlush();

    fireEvent.changeText(screen.getByPlaceholderText('What are you listing?'), 'Test Title');
    fireEvent.changeText(screen.getByPlaceholderText('Describe your listing in detail...'), 'Test description');

    fireEvent.press(screen.getAllByText('Create Listing')[1]);
    await act(async () => {});
    await act(async () => {});

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows photo counter', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('0/5 photos added')).toBeTruthy();
  });

  it('renders the header with close and title', async () => {
    const screen = await renderAndFlush();
    expect(screen.getAllByText('Create Listing').length).toBe(2);
  });
});
