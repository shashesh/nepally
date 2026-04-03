import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { getCategories, createListing } from '@nepally/shared';
import CreateListingScreen from './CreateListingScreen';

// ---------------------------------------------------------------------------
// Mocks — local @expo/vector-icons mock is mandatory for CI (React 19 compat)
// ---------------------------------------------------------------------------

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, null, children),
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

// ---------------------------------------------------------------------------
// Shared mock
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests — render() + waitFor() only; NEVER use act() (hangs on CI)
// ---------------------------------------------------------------------------

describe('CreateListingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: 'metro-1' },
    });
    mockGetCategories.mockResolvedValue({ data: MOCK_CATEGORIES });
    mockSafeParse.mockReturnValue({ success: true, data: {} });
  });

  // -- Initial render ----------------------------------------------------------

  it('renders "Create Listing" title and submit button', async () => {
    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getAllByText('Create Listing').length).toBe(2);
    });
  });

  it('renders listing type toggles', async () => {
    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getByText('Business')).toBeTruthy();
    });
    expect(screen.getByText('Individual')).toBeTruthy();
  });

  it('loads and renders categories', async () => {
    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getByText('Food & Restaurants')).toBeTruthy();
    });
    expect(screen.getByText('Professional Services')).toBeTruthy();
  });

  // -- Form fields -------------------------------------------------------------

  it('renders form fields', async () => {
    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('What are you listing?')).toBeTruthy();
    });
    expect(screen.getByPlaceholderText('Describe your listing in detail...')).toBeTruthy();
  });

  it('renders business-specific fields when listing type is business', async () => {
    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Your business name')).toBeTruthy();
    });
    expect(screen.getByPlaceholderText('Business address')).toBeTruthy();
  });

  it('shows photo counter', async () => {
    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getByText('0/5 photos added')).toBeTruthy();
    });
  });

  // -- Validation errors -------------------------------------------------------

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

    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getAllByText('Create Listing').length).toBe(2);
    });

    fireEvent.press(screen.getAllByText('Create Listing')[1]);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeTruthy();
    });
    expect(screen.getByText('Description is required')).toBeTruthy();
  });

  // -- Successful submission ---------------------------------------------------

  it('submits successfully and navigates back', async () => {
    mockSafeParse.mockReturnValue({ success: true, data: {} });
    mockCreateListing.mockResolvedValue({ data: { id: 'new-1' } } as never);

    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('What are you listing?')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText('What are you listing?'), 'Test Title');
    fireEvent.changeText(
      screen.getByPlaceholderText('Describe your listing in detail...'),
      'Test description',
    );

    fireEvent.press(screen.getAllByText('Create Listing')[1]);

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // -- Submission error --------------------------------------------------------

  it('shows alert when createListing fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockSafeParse.mockReturnValue({ success: true, data: {} });
    mockCreateListing.mockResolvedValue({ error: { message: 'Server error' } } as never);

    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('What are you listing?')).toBeTruthy();
    });

    fireEvent.press(screen.getAllByText('Create Listing')[1]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Server error');
    });
    alertSpy.mockRestore();
  });

  // -- Listing type toggle -----------------------------------------------------

  it('switches to individual fields when Individual is selected', async () => {
    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getByText('Individual')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Individual'));

    await waitFor(() => {
      expect(screen.getByText('Condition')).toBeTruthy();
    });
    // Business-specific fields should be gone
    expect(screen.queryByPlaceholderText('Your business name')).toBeNull();
  });

  // -- No metro_area_id guard --------------------------------------------------

  it('does not submit when user has no metro_area_id', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: null },
    });

    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getAllByText('Create Listing').length).toBe(2);
    });

    fireEvent.press(screen.getAllByText('Create Listing')[1]);

    // createListing should never be called
    expect(mockCreateListing).not.toHaveBeenCalled();
  });

  // -- Header ------------------------------------------------------------------

  it('renders the header with close and title', async () => {
    const screen = render(<CreateListingScreen />);
    await waitFor(() => {
      expect(screen.getAllByText('Create Listing').length).toBe(2);
    });
  });
});
