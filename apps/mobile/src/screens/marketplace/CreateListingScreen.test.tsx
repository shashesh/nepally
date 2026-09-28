import React from 'react';
import { AccessibilityInfo, Alert, ScrollView, TextInput } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  cleanUpListingPhotos,
  createListing,
  getCategories,
  getListingById,
  updateListing,
  uploadListingPhotos,
} from '@nepally/shared';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
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
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
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
const mockDispatch = jest.fn();
const mockUseAuth = jest.fn();
let mockRouteParams: { editListingId?: string } | undefined;

// usePreventRemove is captured, not run: a test reads whether leaving is blocked
// and calls the callback to stand in for the member trying to leave.
type PreventRemoveCallback = (event: { data: { action: { type: string } } }) => void;
let mockPreventRemove = false;
let mockOnPreventRemove: PreventRemoveCallback | null = null;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, dispatch: mockDispatch }),
  useRoute: () => ({ params: mockRouteParams }),
  usePreventRemove: (preventRemove: boolean, callback: PreventRemoveCallback) => {
    mockPreventRemove = preventRemove;
    mockOnPreventRemove = callback;
  },
  StackActions: {
    replace: (name: string, params: object) => ({ type: 'REPLACE', payload: { name, params } }),
  },
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseLocation = jest.fn();
jest.mock('../../hooks/useLocation', () => ({
  useLocation: () => mockUseLocation(),
}));

jest.mock('../../config/supabase', () => ({ supabase: {} }));

// The real schema and form helpers run; only the API calls are mocked.
jest.mock('@nepally/shared', () => ({
  ...jest.requireActual('@nepally/shared'),
  getCategories: jest.fn(async () => ({ data: [] })),
  getListingById: jest.fn(async () => ({ data: null })),
  createListing: jest.fn(async () => ({ data: { id: 'new-1' } })),
  updateListing: jest.fn(async () => ({ data: { id: 'edit-1' } })),
  uploadListingPhotos: jest.fn(async () => ({ urls: [], paths: [] })),
  cleanUpListingPhotos: jest.fn(async () => {}),
}));

const mockLaunchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockLaunchCamera = ImagePicker.launchCameraAsync as jest.Mock;
const mockRequestCamera = ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const mockManipulate = ImageManipulator.manipulateAsync as jest.Mock;
const mockUpload = uploadListingPhotos as jest.Mock;
const mockCleanUp = cleanUpListingPhotos as jest.Mock;

/** Picker assets; each processes to file:///small-<name>, holding SIZES[name] bytes. */
function assets(...names: string[]) {
  return { canceled: false, assets: names.map((name) => ({ uri: 'file:///' + name })) };
}
const SIZES: Record<string, number> = { a: 10, b: 20, c: 30 };

const mockGetCategories = getCategories as jest.MockedFunction<typeof getCategories>;
const mockGetListingById = getListingById as jest.MockedFunction<typeof getListingById>;
const mockCreateListing = createListing as jest.MockedFunction<typeof createListing>;
const mockUpdateListing = updateListing as jest.MockedFunction<typeof updateListing>;
const mockScrollTo = ScrollView.prototype.scrollTo as jest.Mock;
const mockFocus = TextInput.prototype.focus as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NO_ACTIVE_LOCATION = { activeLocation: null, savedLocations: [] };
const VISITING_AUSTIN = {
  activeLocation: {
    metro_area_id: 'm2',
    metro_name: 'Austin',
    metro_state: 'TX',
    is_temporary: true,
  },
  savedLocations: [],
};

const FOOD_ID = '11111111-1111-4111-8111-111111111111';
const SERVICES_ID = '22222222-2222-4222-8222-222222222222';

const MOCK_CATEGORIES = [
  {
    id: FOOD_ID,
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
    id: SERVICES_ID,
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

const EXISTING_LISTING = {
  id: 'edit-1',
  owner_id: 'user-1',
  metro_area_id: 'metro-1',
  category_id: FOOD_ID,
  listing_type: 'business' as const,
  status: 'active' as const,
  title: 'Himalayan Kitchen',
  description: 'Authentic Nepali food and drinks.',
  photos: [],
  price: null,
  business_name: 'Himalayan Kitchen LLC',
  address: null,
  phone: null,
  email: null,
  website_url: null,
  item_condition: null,
  business_hours: null,
  is_global: false,
  views_count: 0,
  saves_count: 0,
  contacts_count: 0,
  trending_score: 0,
  refreshed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

type Screen = ReturnType<typeof render>;

async function renderForm(): Promise<Screen> {
  const screen = render(<CreateListingScreen />);
  // Flush the categories (and listing) load.
  await act(async () => {});
  return screen;
}

function fillValidForm(screen: Screen) {
  fireEvent.press(screen.getByText('Food & Restaurants'));
  fireEvent.changeText(screen.getByPlaceholderText('What are you listing?'), 'Momo catering');
  fireEvent.changeText(
    screen.getByPlaceholderText('Describe your listing in detail...'),
    'Fresh momos for parties and events.'
  );
}

async function submit(screen: Screen, label = 'Create Listing') {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: label }));
  });
}

function lastCreatePayload() {
  return mockCreateListing.mock.calls[mockCreateListing.mock.calls.length - 1][1];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CreateListingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    mockPreventRemove = false;
    mockOnPreventRemove = null;
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: 'metro-1' },
    });
    mockGetCategories.mockResolvedValue({ data: MOCK_CATEGORIES });
    mockGetListingById.mockResolvedValue({ data: null } as never);
    mockCreateListing.mockResolvedValue({ data: { id: 'new-1' } } as never);
    mockUpdateListing.mockResolvedValue({ data: { id: 'edit-1' } } as never);
    mockUseLocation.mockReturnValue(NO_ACTIVE_LOCATION);
    mockLaunchLibrary.mockResolvedValue({ canceled: true, assets: [] });
    mockLaunchCamera.mockResolvedValue({ canceled: true, assets: [] });
    mockRequestCamera.mockResolvedValue({ granted: true });
    mockManipulate.mockImplementation(async (uri: string) => ({
      uri: uri.replace('file:///', 'file:///small-'),
    }));
    (File as unknown as jest.Mock).mockImplementation((uri: string) => ({
      arrayBuffer: async () => new ArrayBuffer(SIZES[uri.replace('file:///small-', '')] ?? 8),
    }));
    mockUpload.mockImplementation(async (_client: unknown, inputs: { size_bytes: number }[]) => ({
      urls: inputs.map((input) => 'https://cdn/listing-photos/user-1/' + input.size_bytes + '.jpg'),
      paths: inputs.map((input) => 'user-1/' + input.size_bytes + '.jpg'),
    }));
  });

  // -- Rendering ----------------------------------------------------------------

  it('renders the header title, the close button and the submit button', async () => {
    const screen = await renderForm();
    expect(screen.getByRole('header', { name: 'Create Listing' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create Listing' })).toBeTruthy();
  });

  it('loads and renders categories', async () => {
    const screen = await renderForm();
    expect(screen.getByText('Food & Restaurants')).toBeTruthy();
    expect(screen.getByText('Professional Services')).toBeTruthy();
  });

  it('shows photo counter', async () => {
    const screen = await renderForm();
    expect(screen.getByText('0/5 photos added')).toBeTruthy();
  });

  // -- Photos ----------------------------------------------------------------------

  async function addFromLibrary(screen: Screen, ...names: string[]) {
    mockLaunchLibrary.mockResolvedValueOnce(assets(...names));
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Add photos' }));
    });
  }

  it('adds photos from the library without asking for photo access', async () => {
    const screen = await renderForm();
    await addFromLibrary(screen, 'a', 'b');

    expect(screen.getByText('2/5 photos added')).toBeTruthy();
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(mockLaunchLibrary).toHaveBeenCalledWith(expect.objectContaining({ selectionLimit: 5 }));
  });

  it('takes a photo with the camera once camera access is given', async () => {
    const screen = await renderForm();
    mockLaunchCamera.mockResolvedValueOnce(assets('c'));

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    });

    expect(mockRequestCamera).toHaveBeenCalled();
    expect(screen.getByText('1/5 photos added')).toBeTruthy();
  });

  it('explains how to allow the camera when access is refused', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockRequestCamera.mockResolvedValueOnce({ granted: false });
    const screen = await renderForm();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Camera access needed',
      expect.any(String),
      expect.any(Array)
    );
    expect(mockLaunchCamera).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("says how many photos couldn't be added", async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockManipulate.mockImplementation(async (uri: string) => {
      if (uri.endsWith('b')) throw new Error('corrupt');
      return { uri: uri.replace('file:///', 'file:///small-') };
    });
    const screen = await renderForm();

    await addFromLibrary(screen, 'a', 'b');

    expect(screen.getByText('1/5 photos added')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith("1 photo couldn't be added", expect.any(String));
    alertSpy.mockRestore();
  });

  it('removes a photo', async () => {
    const screen = await renderForm();
    await addFromLibrary(screen, 'a', 'b');

    fireEvent.press(screen.getByRole('button', { name: 'Remove photo 1' }));

    expect(screen.getByText('1/5 photos added')).toBeTruthy();
  });

  it('makes a photo the cover and saves the photos in that order', async () => {
    const screen = await renderForm();
    await addFromLibrary(screen, 'a', 'b');
    expect(screen.getByText('Cover')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Make photo 2 the cover' }));
    fillValidForm(screen);
    await submit(screen);

    const inputs = mockUpload.mock.calls[0][1] as { size_bytes: number }[];
    expect(inputs.map((input) => input.size_bytes)).toEqual([20, 10]);
    expect(lastCreatePayload().photos).toEqual([
      'https://cdn/listing-photos/user-1/20.jpg',
      'https://cdn/listing-photos/user-1/10.jpg',
    ]);
  });

  it('deletes the photos it just uploaded when the save fails', async () => {
    mockCreateListing.mockResolvedValue({ error: { message: 'Server error' } } as never);
    const screen = await renderForm();
    await addFromLibrary(screen, 'a');
    fillValidForm(screen);

    await submit(screen);

    expect(mockCleanUp).toHaveBeenCalledWith(
      expect.anything(),
      ['user-1/10.jpg'],
      expect.any(Object)
    );
  });

  // -- Listing type --------------------------------------------------------------

  it('starts as an Individual listing', async () => {
    const screen = await renderForm();
    expect(screen.getByRole('radio', { name: 'Individual' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Business' })).not.toBeChecked();
    expect(screen.getByText('Condition')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Your business name')).toBeNull();
  });

  it('shows the business fields once Business is picked', async () => {
    const screen = await renderForm();
    fireEvent.press(screen.getByRole('radio', { name: 'Business' }));

    expect(screen.getByRole('radio', { name: 'Business' })).toBeChecked();
    expect(screen.getByPlaceholderText('Your business name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Business address')).toBeTruthy();
    expect(screen.queryByText('Condition')).toBeNull();
  });

  it("doesn't save the business fields of a listing switched to Individual", async () => {
    const screen = await renderForm();
    fireEvent.press(screen.getByRole('radio', { name: 'Business' }));
    fireEvent.changeText(screen.getByPlaceholderText('Your business name'), 'Himalayan Kitchen');
    fireEvent.changeText(screen.getByPlaceholderText('Business address'), '12 Main St');
    fireEvent.press(screen.getByRole('radio', { name: 'Individual' }));
    fillValidForm(screen);

    await submit(screen);

    const payload = lastCreatePayload();
    expect(payload.listing_type).toBe('individual');
    expect(payload.business_name).toBeUndefined();
    expect(payload.address).toBeUndefined();
  });

  it("doesn't save the condition of a listing switched to Business", async () => {
    const screen = await renderForm();
    fireEvent.press(screen.getByRole('radio', { name: 'Used' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Business' }));
    fireEvent.changeText(screen.getByPlaceholderText('Your business name'), 'Himalayan Kitchen');
    fillValidForm(screen);

    await submit(screen);

    expect(lastCreatePayload().item_condition).toBeUndefined();
  });

  // -- Validation -----------------------------------------------------------------

  it('says what is missing when the form is submitted empty', async () => {
    const screen = await renderForm();
    await submit(screen);

    expect(screen.getByText('Title must be at least 5 characters')).toBeTruthy();
    expect(screen.getByText('Description must be at least 10 characters')).toBeTruthy();
    expect(screen.getByText('Invalid category')).toBeTruthy();
    expect(mockCreateListing).not.toHaveBeenCalled();
  });

  it('shows the email, phone and price errors', async () => {
    const screen = await renderForm();
    fillValidForm(screen);
    fireEvent.changeText(screen.getByPlaceholderText('Contact email'), 'not-an-email');
    fireEvent.changeText(screen.getByPlaceholderText('Contact phone number'), '1'.repeat(21));
    fireEvent.changeText(screen.getByPlaceholderText(/e\.g\., "\$50\/hr"/), 'x'.repeat(51));

    await submit(screen);

    expect(screen.getByText('Invalid email address')).toBeTruthy();
    expect(screen.getByText('Phone must be at most 20 characters')).toBeTruthy();
    expect(screen.getByText('Price must be at most 50 characters')).toBeTruthy();
    expect(mockCreateListing).not.toHaveBeenCalled();
  });

  it('shows the business name, address and website errors', async () => {
    const screen = await renderForm();
    fireEvent.press(screen.getByRole('radio', { name: 'Business' }));
    fillValidForm(screen);
    fireEvent.changeText(screen.getByPlaceholderText('Your business name'), 'x'.repeat(101));
    fireEvent.changeText(screen.getByPlaceholderText('Business address'), 'x'.repeat(201));
    fireEvent.changeText(screen.getByPlaceholderText('https://...'), 'not a url');

    await submit(screen);

    expect(screen.getByText('Business name must be at most 100 characters')).toBeTruthy();
    expect(screen.getByText('Address must be at most 200 characters')).toBeTruthy();
    expect(screen.getByText('Invalid URL')).toBeTruthy();
  });

  it('limits each input to what the schema allows', async () => {
    const screen = await renderForm();
    fireEvent.press(screen.getByRole('radio', { name: 'Business' }));

    expect(screen.getByPlaceholderText(/e\.g\., "\$50\/hr"/).props.maxLength).toBe(50);
    expect(screen.getByPlaceholderText('Your business name').props.maxLength).toBe(100);
    expect(screen.getByPlaceholderText('Business address').props.maxLength).toBe(200);
    expect(screen.getByPlaceholderText('Contact phone number').props.maxLength).toBe(20);
  });

  it('saves a website typed without https://', async () => {
    const screen = await renderForm();
    fireEvent.press(screen.getByRole('radio', { name: 'Business' }));
    fireEvent.changeText(screen.getByPlaceholderText('Your business name'), 'Himalayan Kitchen');
    fireEvent.changeText(screen.getByPlaceholderText('https://...'), 'www.mybiz.com');
    fillValidForm(screen);

    await submit(screen);

    expect(lastCreatePayload().website_url).toBe('https://www.mybiz.com');
  });

  it('scrolls to the first field with an error', async () => {
    const screen = await renderForm();
    fireEvent(screen.getByPlaceholderText('What are you listing?'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 320, width: 300, height: 80 } },
    });
    fireEvent(screen.getByPlaceholderText('Contact email'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 900, width: 300, height: 80 } },
    });
    fillValidForm(screen);
    fireEvent.changeText(screen.getByPlaceholderText('Contact email'), 'not-an-email');

    await submit(screen);

    expect(mockScrollTo).toHaveBeenCalledWith(expect.objectContaining({ y: expect.any(Number) }));
    const { y } = mockScrollTo.mock.calls[mockScrollTo.mock.calls.length - 1][0];
    expect(y).toBeGreaterThan(800);
    expect(y).toBeLessThanOrEqual(900);
  });

  it('moves the screen reader to the first field with an error', async () => {
    const screen = await renderForm();
    fillValidForm(screen);
    fireEvent.changeText(screen.getByPlaceholderText('Contact email'), 'not-an-email');

    await submit(screen);

    expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(
      expect.anything(),
      'focus'
    );
  });

  it('reads out a category error, which has no field to move to', async () => {
    const screen = await renderForm();
    fireEvent.changeText(screen.getByPlaceholderText('What are you listing?'), 'Momo catering');
    fireEvent.changeText(
      screen.getByPlaceholderText('Describe your listing in detail...'),
      'Fresh momos for parties and events.'
    );

    await submit(screen);

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Invalid category');
  });

  // -- Keyboard -------------------------------------------------------------------

  it('moves from one field to the next with the return key', async () => {
    const screen = await renderForm();
    const title = screen.getByPlaceholderText('What are you listing?');
    expect(title.props.returnKeyType).toBe('next');

    fireEvent(title, 'submitEditing');

    expect(mockFocus).toHaveBeenCalledTimes(1);
  });

  it('lets the system fill in contact details', async () => {
    const screen = await renderForm();
    fireEvent.press(screen.getByRole('radio', { name: 'Business' }));

    expect(screen.getByPlaceholderText('Contact email').props.autoComplete).toBe('email');
    expect(screen.getByPlaceholderText('Contact phone number').props.autoComplete).toBe('tel');
    expect(screen.getByPlaceholderText('https://...').props.autoComplete).toBe('url');
  });

  // -- Accessibility --------------------------------------------------------------

  it('names every input for screen readers', async () => {
    const screen = await renderForm();
    fireEvent.press(screen.getByRole('radio', { name: 'Business' }));

    for (const label of [
      'Title, required',
      'Description, required',
      'Price / Rate',
      'Business name, required',
      'Address',
      'Website',
      'Phone',
      'Email',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('reports which category is selected', async () => {
    const screen = await renderForm();
    const food = screen.getByRole('radio', { name: 'Food & Restaurants' });
    expect(food).not.toBeChecked();

    fireEvent.press(food);

    expect(screen.getByRole('radio', { name: 'Food & Restaurants' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Professional Services' })).not.toBeChecked();
  });

  // -- Saving ----------------------------------------------------------------------

  it("posts the listing to the member's active location", async () => {
    mockUseLocation.mockReturnValue(VISITING_AUSTIN);
    const screen = await renderForm();
    fillValidForm(screen);

    await submit(screen);

    expect(lastCreatePayload()).toEqual(
      expect.objectContaining({ metro_area_id: 'm2', owner_id: 'user-1', category_id: FOOD_ID })
    );
  });

  it('opens the new listing once it is created', async () => {
    const screen = await renderForm();
    fillValidForm(screen);

    await submit(screen);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'REPLACE',
      payload: { name: 'ListingDetail', params: { listingId: 'new-1' } },
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows alert when createListing fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockCreateListing.mockResolvedValue({ error: { message: 'Server error' } } as never);
    const screen = await renderForm();
    fillValidForm(screen);

    await submit(screen);

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Server error');
    expect(mockDispatch).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('does not submit when there is no metro to post to', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: null },
    });
    const screen = await renderForm();
    fillValidForm(screen);

    await submit(screen);

    expect(mockCreateListing).not.toHaveBeenCalled();
  });

  it("doesn't pop up an error after the member has left mid-save", async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    let finishCreate: (value: unknown) => void = () => {};
    mockCreateListing.mockReturnValue(
      new Promise((resolve) => {
        finishCreate = resolve;
      }) as never
    );
    const screen = await renderForm();
    fillValidForm(screen);
    await submit(screen);

    // Leaving while saving isn't blocked: the save carries on without the screen.
    expect(mockPreventRemove).toBe(false);
    screen.unmount();
    await act(async () => {
      finishCreate({ error: { message: 'Server error' } });
    });

    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('says the listing could not load instead of showing an empty edit form', async () => {
    mockRouteParams = { editListingId: 'edit-1' };
    mockGetListingById.mockResolvedValue({ error: new Error('offline') } as never);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const screen = await renderForm();

    expect(screen.getByText("Couldn't load this listing.")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Update Listing' })).toBeNull();

    mockGetListingById.mockResolvedValue({ data: EXISTING_LISTING } as never);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    });

    expect(screen.getByDisplayValue('Himalayan Kitchen')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Update Listing' })).toBeTruthy();
    jest.restoreAllMocks();
  });

  it('says the form could not load when the categories fail', async () => {
    mockGetCategories.mockResolvedValue({ error: new Error('offline') } as never);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const screen = await renderForm();

    expect(screen.getByText("Couldn't load the listing form.")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create Listing' })).toBeNull();
    // The member can still close it.
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    jest.restoreAllMocks();
  });

  it('saves an edit and goes back to the listing', async () => {
    mockRouteParams = { editListingId: 'edit-1' };
    mockGetListingById.mockResolvedValue({ data: EXISTING_LISTING } as never);
    const screen = await renderForm();
    expect(screen.getByRole('header', { name: 'Edit Listing' })).toBeTruthy();
    fireEvent.changeText(screen.getByDisplayValue('Himalayan Kitchen'), 'Everest Kitchen');

    await submit(screen, 'Update Listing');

    expect(mockUpdateListing).toHaveBeenCalledWith(
      expect.anything(),
      'edit-1',
      expect.objectContaining({ title: 'Everest Kitchen', business_name: 'Himalayan Kitchen LLC' })
    );
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  });

  describe('editing photos', () => {
    const PUBLIC = 'https://abc.supabase.co/storage/v1/object/public/listing-photos';
    const OLD_A = PUBLIC + '/user-1/old-a.jpg';
    const OLD_B = PUBLIC + '/user-1/old-b.jpg';

    beforeEach(() => {
      mockRouteParams = { editListingId: 'edit-1' };
      mockGetListingById.mockResolvedValue({
        data: { ...EXISTING_LISTING, photos: [OLD_A, OLD_B] },
      } as never);
    });

    it('deletes the files of the photos an edit dropped once it saves', async () => {
      const screen = await renderForm();
      expect(screen.getByText('2/5 photos added')).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'Remove photo 2' }));
      expect(mockPreventRemove).toBe(true);
      await submit(screen, 'Update Listing');

      expect(mockUpdateListing).toHaveBeenCalledWith(
        expect.anything(),
        'edit-1',
        expect.objectContaining({ photos: [OLD_A] })
      );
      expect(mockCleanUp).toHaveBeenCalledTimes(1);
      expect(mockCleanUp).toHaveBeenCalledWith(
        expect.anything(),
        ['user-1/old-b.jpg'],
        expect.objectContaining({ listingId: 'edit-1' })
      );
    });

    it('keeps every original photo when the edit fails', async () => {
      mockUpdateListing.mockResolvedValue({ error: { message: 'Server error' } } as never);
      const screen = await renderForm();

      fireEvent.press(screen.getByRole('button', { name: 'Remove photo 2' }));
      await submit(screen, 'Update Listing');

      // Nothing new was uploaded, and the dropped photo's file stays.
      for (const [, paths] of mockCleanUp.mock.calls) {
        expect(paths).not.toContain('user-1/old-b.jpg');
      }
    });
  });

  // -- Leaving with unsaved changes ---------------------------------------------

  it('lets the member leave an untouched form without asking', async () => {
    await renderForm();
    expect(mockPreventRemove).toBe(false);
  });

  it('asks before throwing away a half-filled listing', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = await renderForm();
    fireEvent.changeText(screen.getByPlaceholderText('What are you listing?'), 'Momo');

    expect(mockPreventRemove).toBe(true);
    const leave = { type: 'GO_BACK' };
    act(() => mockOnPreventRemove?.({ data: { action: leave } }));

    expect(alertSpy).toHaveBeenCalledWith(
      'Discard this listing?',
      expect.any(String),
      expect.any(Array)
    );
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === 'Discard')?.onPress?.();
    expect(mockDispatch).toHaveBeenCalledWith(leave);
    alertSpy.mockRestore();
  });

  it('asks before throwing away changes to an existing listing', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockRouteParams = { editListingId: 'edit-1' };
    mockGetListingById.mockResolvedValue({ data: EXISTING_LISTING } as never);
    const screen = await renderForm();
    // Loading the listing isn't a change.
    expect(mockPreventRemove).toBe(false);

    fireEvent.changeText(screen.getByDisplayValue('Himalayan Kitchen'), 'Everest Kitchen');
    expect(mockPreventRemove).toBe(true);
    act(() => mockOnPreventRemove?.({ data: { action: { type: 'GO_BACK' } } }));

    expect(alertSpy).toHaveBeenCalledWith(
      'Discard your changes?',
      expect.any(String),
      expect.any(Array)
    );
    alertSpy.mockRestore();
  });

  it('stops asking once the listing is saved', async () => {
    const screen = await renderForm();
    fillValidForm(screen);
    expect(mockPreventRemove).toBe(true);

    await submit(screen);

    expect(mockPreventRemove).toBe(false);
  });
});
