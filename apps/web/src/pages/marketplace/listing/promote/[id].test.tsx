import React from 'react';
import { render, screen, waitFor, fireEvent } from '../../../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getListingById, createPromotionCheckout } from '@nepally/shared';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };
type MockButtonProps = {
  children?: React.ReactNode;
  variant?: string;
  onClick?: () => void;
  size?: string;
};

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('../../../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: MockHeadProps) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Button: ({ children, onClick, variant, size }: MockButtonProps) =>
      React.createElement('button', { onClick }, children),
  };
});
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

const MOCK_LISTING = {
  id: 'listing-1',
  owner_id: 'user-1',
  metro_area_id: 'metro-1',
  category_id: 'cat-1',
  listing_type: 'business' as const,
  status: 'active' as const,
  title: 'My Restaurant',
  description: 'A great restaurant.',
  photos: [],
  price: '$15',
  business_name: 'My Restaurant LLC',
  address: null,
  phone: null,
  email: null,
  website_url: null,
  item_condition: null,
  business_hours: null,
  is_global: false,
  is_featured: false,
  trending_score: 10,
  views_count: 5,
  saves_count: 2,
  contacts_count: 1,
  refreshed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

vi.mock('@nepally/shared', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getListingById: vi.fn(async () => ({ data: MOCK_LISTING })),
    createPromotionCheckout: vi.fn(async () => ({ data: { checkoutUrl: 'https://checkout.stripe.com/test' } })),
    getPromotionById: vi.fn(async () => ({ data: null })),
  };
});

import PromoteListingPage from './[id].page';

const mockGetListingById = getListingById as ReturnType<typeof vi.fn>;

describe('PromoteListingPage', () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      back: mockBack,
      query: { id: 'listing-1' },
      isReady: true,
    });
    mocks.useAuth.mockReturnValue({
      user: { id: 'user-1', trust_level: 1, metro_area_id: 'metro-1' },
    });
    mockGetListingById.mockResolvedValue({ data: MOCK_LISTING });
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(React.createElement(PromoteListingPage));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('renders step 1 with tier cards', async () => {
    render(React.createElement(PromoteListingPage));
    await waitFor(() => {
      expect(screen.getByText('Choose Promotion Type')).toBeDefined();
    });

    expect(screen.getByText('Featured Listing')).toBeDefined();
    expect(screen.getByText('Sponsored Feed')).toBeDefined();
    expect(screen.getByText('Sticky Business')).toBeDefined();
  });

  it('continue button is disabled until a tier is selected', async () => {
    render(React.createElement(PromoteListingPage));
    await waitFor(() => {
      expect(screen.getByText('Choose Promotion Type')).toBeDefined();
    });

    const continueBtn = screen.getByText('Continue');
    expect(continueBtn.closest('button')?.disabled).toBe(true);
  });

  it('selecting a tier enables continue button', async () => {
    render(React.createElement(PromoteListingPage));
    await waitFor(() => {
      expect(screen.getByText('Featured Listing')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Featured Listing'));

    const continueBtn = screen.getByText('Continue');
    expect(continueBtn.closest('button')?.disabled).toBe(false);
  });

  it('navigates to step 2 after continue', async () => {
    render(React.createElement(PromoteListingPage));
    await waitFor(() => {
      expect(screen.getByText('Featured Listing')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Featured Listing'));
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Set Duration')).toBeDefined();
    });
  });

  it('navigates to step 3 (review) from step 2', async () => {
    render(React.createElement(PromoteListingPage));
    await waitFor(() => {
      expect(screen.getByText('Featured Listing')).toBeDefined();
    });

    // Step 1 -> 2
    fireEvent.click(screen.getByText('Featured Listing'));
    const allContinueBtns1 = screen.getAllByText('Continue');
    fireEvent.click(allContinueBtns1[allContinueBtns1.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Set Duration')).toBeDefined();
    });

    // Step 2 -> 3
    const allContinueBtns2 = screen.getAllByText('Continue');
    fireEvent.click(allContinueBtns2[allContinueBtns2.length - 1]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Review & Pay' })).toBeDefined();
    });

    expect(screen.getByText('My Restaurant')).toBeDefined();
  });

  it('shows verify banner for Level 0 users on step 3', async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: 'user-1', trust_level: 0, metro_area_id: 'metro-1' },
    });

    render(React.createElement(PromoteListingPage));
    await waitFor(() => {
      expect(screen.getByText('Featured Listing')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Featured Listing'));
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() => expect(screen.getByText('Set Duration')).toBeDefined());
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText(/Verify your account to promote listings/)).toBeDefined();
    });
  });
});
