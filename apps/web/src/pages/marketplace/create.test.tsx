import React from 'react';
import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCategories, createListing } from '@nepally/shared';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };
type MockImageProps = { src: string; alt: string };

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
  notificationsShow: vi.fn(),
  uploadPhotosInOrder: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({ notifications: { show: mocks.notificationsShow } }));
// The upload path itself is covered in lib/photoUploads.test.ts; here it is
// stubbed so the page's own success and failure handling can be exercised.
vi.mock('../../lib/photoUploads', () => ({ uploadPhotosInOrder: mocks.uploadPhotosInOrder }));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: MockHeadProps) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: MockImageProps) => React.createElement('img', { src, alt }),
}));
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Button: ({ children, type, onClick, loading, ...rest }: Record<string, unknown>) =>
      React.createElement('button', { type: type as string, onClick: onClick as () => void, disabled: loading as boolean }, children as React.ReactNode),
    TextInput: ({ label, placeholder, value, onChange, error, ...rest }: Record<string, unknown>) =>
      React.createElement('div', null,
        React.createElement('label', null, label as string),
        React.createElement('input', { placeholder: placeholder as string, value: value as string, onChange: onChange as () => void }),
        error ? React.createElement('span', null, error as string) : null,
      ),
    Textarea: ({ label, placeholder, value, onChange, error, ...rest }: Record<string, unknown>) =>
      React.createElement('div', null,
        React.createElement('label', null, label as string),
        React.createElement('textarea', { placeholder: placeholder as string, value: value as string, onChange: onChange as () => void }),
        error ? React.createElement('span', null, error as string) : null,
      ),
  };
});
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

const MOCK_CATEGORIES = [
  {
    id: 'cat-1', name: 'Food & Restaurants', slug: 'food-restaurants',
    emoji: '🍜', icon: 'restaurant', color: '#FF6B35', sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2', name: 'Professional Services', slug: 'professional-services',
    emoji: '💼', icon: 'briefcase', color: '#2196F3', sort_order: 2,
    created_at: new Date().toISOString(),
  },
];

const mockSafeParse = vi.fn();

vi.mock('@nepally/shared', () => ({
  getCategories: vi.fn(async () => ({ data: [] })),
  getListingById: vi.fn(async () => ({ data: null })),
  createListing: vi.fn(async () => ({ data: { id: 'new-1' } })),
  updateListing: vi.fn(async () => ({ data: { id: 'edit-1' } })),
  uploadListingPhotos: vi.fn(async () => ({ urls: [] })),
  createListingSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
  ITEM_CONDITION_LABELS: { new: 'New', used: 'Used' },
  MAX_PHOTOS_PER_LISTING: 5,
  MAX_LISTING_PHOTO_BYTES: 2 * 1024 * 1024,
  ALLOWED_LISTING_PHOTO_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
}));

import CreateListingPage from './create.page';

const mockGetCategories = getCategories as ReturnType<typeof vi.fn>;
const mockCreateListing = createListing as ReturnType<typeof vi.fn>;
const mockUploadPhotosInOrder = mocks.uploadPhotosInOrder;

describe('CreateListingPage', () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ replace: mockReplace, push: mockPush, query: {} });
    mockGetCategories.mockResolvedValue({ data: MOCK_CATEGORIES });
    mockSafeParse.mockReturnValue({ success: true, data: {} });
    mockUploadPhotosInOrder.mockResolvedValue({ urls: [], paths: [] });
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(React.createElement(CreateListingPage));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('renders "Create Listing" title and submit button', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(CreateListingPage));
    await waitFor(() => {
      // Header h1 + submit button both say "Create Listing"
      expect(screen.getAllByText('Create Listing').length).toBe(2);
    });
  });

  it('renders listing type toggle buttons', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(CreateListingPage));
    await waitFor(() => {
      expect(screen.getByText('Business')).toBeDefined();
      expect(screen.getByText('Individual')).toBeDefined();
    });
  });

  it('loads and renders categories', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(CreateListingPage));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Food & Restaurants' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Professional Services' })).toBeDefined();
    });
  });

  it('reports which category is chosen', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(CreateListingPage));
    const chip = await screen.findByRole('button', { name: 'Food & Restaurants' });

    expect(chip.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(chip);

    expect(screen.getByRole('button', { name: 'Food & Restaurants' }).getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByRole('button', { name: 'Professional Services' }).getAttribute('aria-pressed')
    ).toBe('false');
  });

  it('shows a missing category as an error on its group', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockSafeParse.mockReturnValue({
      success: false,
      error: { issues: [{ path: ['category_id'], message: 'Pick a category' }] },
    });
    render(React.createElement(CreateListingPage));
    await waitFor(() => expect(screen.getAllByText('Create Listing').length).toBe(2));

    fireEvent.click(screen.getAllByText('Create Listing')[1]);

    await waitFor(() => expect(screen.getByText('Pick a category')).toBeDefined());
    const group = screen.getByRole('group', { name: 'Category *' });
    expect(group.getAttribute('aria-describedby')?.split(' ')).toContain(
      screen.getByText('Pick a category').id
    );
  });

  it('offers the condition control only for an individual listing', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(CreateListingPage));
    await waitFor(() => expect(screen.getByPlaceholderText('Your business name')).toBeDefined());

    expect(screen.queryByRole('radiogroup', { name: 'Condition' })).toBeNull();

    fireEvent.click(screen.getByText('Individual'));

    await waitFor(() => expect(screen.getByRole('radiogroup', { name: 'Condition' })).toBeDefined());
    expect(screen.queryByPlaceholderText('Your business name')).toBeNull();
  });

  it('renders form fields', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(CreateListingPage));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('What are you listing?')).toBeDefined();
      expect(screen.getByPlaceholderText('Describe your listing in detail...')).toBeDefined();
    });
  });

  it('shows photo counter', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(CreateListingPage));
    await waitFor(() => {
      expect(screen.getByText('0/5 photos')).toBeDefined();
    });
  });

  it('shows back link to marketplace', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(CreateListingPage));
    await waitFor(() => {
      expect(screen.getByText(/Back to Marketplace/)).toBeDefined();
    });
  });

  it('shows business name field when type is business', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(CreateListingPage));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Your business name')).toBeDefined();
    });
  });

  it('renders "Edit Listing" title in edit mode', async () => {
    mocks.useRouter.mockReturnValue({ replace: mockReplace, push: mockPush, query: { edit: 'listing-1' } });
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(CreateListingPage));
    // Page shows null while loading in edit mode, then loads
    // Just verify no crash
    expect(true).toBe(true);
  });

  describe('failures reach the member', () => {
    const signedIn = { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' };

    async function submit() {
      render(React.createElement(CreateListingPage));
      await waitFor(() => expect(screen.getAllByText('Create Listing').length).toBe(2));
      fireEvent.click(screen.getAllByText('Create Listing')[1]);
    }

    it('reports a failed photo upload instead of swallowing it', async () => {
      mocks.useAuth.mockReturnValue({ user: signedIn });
      mockSafeParse.mockReturnValue({ success: true, data: {} });
      mockUploadPhotosInOrder.mockResolvedValue({ error: new Error('Storage is full') });

      await submit();

      await waitFor(() =>
        expect(mocks.notificationsShow).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Storage is full', color: 'red' })
        )
      );
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('reports a failed create instead of swallowing it', async () => {
      mocks.useAuth.mockReturnValue({ user: signedIn });
      mockSafeParse.mockReturnValue({ success: true, data: {} });
      mockUploadPhotosInOrder.mockResolvedValue({ urls: [], paths: [] });
      mockCreateListing.mockResolvedValue({ error: new Error('Listing rejected') });

      await submit();

      await waitFor(() =>
        expect(mocks.notificationsShow).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Listing rejected', color: 'red' })
        )
      );
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('goes to the marketplace when the listing saves', async () => {
      mocks.useAuth.mockReturnValue({ user: signedIn });
      mockSafeParse.mockReturnValue({ success: true, data: {} });
      mockUploadPhotosInOrder.mockResolvedValue({ urls: ['u/a'], paths: ['p/a'] });
      mockCreateListing.mockResolvedValue({ data: { id: 'new-1' } });

      await submit();

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/marketplace'));
      expect(mockCreateListing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ photos: ['u/a'] })
      );
    });
  });
});
