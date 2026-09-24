import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '../../../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getListingById, TrustLevel, type MarketplaceListing } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('../../../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));
vi.mock('../../../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'token' } } })) } },
}));
vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getListingById: vi.fn(),
  createPromotionCheckout: vi.fn(),
}));

import PromoteListingPage from './[id].page';

const mockGetListing = getListingById as ReturnType<typeof vi.fn>;
const OWNER = { id: 'user-1', trust_level: TrustLevel.VERIFIED };
const LISTING = {
  id: 'listing-1',
  owner_id: 'user-1',
  status: 'active',
  title: 'My Restaurant',
  price: '$15',
} as MarketplaceListing;

async function openWizard() {
  render(<PromoteListingPage />);
  return screen.findByRole('radiogroup', { name: 'Promotion type' });
}

function continueButton() {
  return screen.getByRole('button', { name: 'Continue' });
}

describe('PromoteListingPage', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ replace: mockReplace, query: { id: 'listing-1' }, isReady: true });
    mocks.useAuth.mockReturnValue({ user: OWNER });
    mockGetListing.mockResolvedValue({ data: LISTING });
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(<PromoteListingPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('titles the page and links back to My Listings', async () => {
    await openWizard();

    expect(screen.getByRole('heading', { level: 1, name: 'Promote listing' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'My Listings' }).getAttribute('href')).toBe('/marketplace/my-listings');
    expect(screen.getByRole('list', { name: 'Progress' })).toBeDefined();
  });

  it('shows a failed read with a retry that works', async () => {
    mockGetListing.mockResolvedValueOnce({ error: new Error('network down') });
    render(<PromoteListingPage />);

    expect(await screen.findByText('network down')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('radiogroup', { name: 'Promotion type' })).toBeDefined();
  });

  it('says when the listing is gone', async () => {
    mockGetListing.mockResolvedValue({ error: new Error('Listing not found'), notFound: true });
    render(<PromoteListingPage />);

    expect(await screen.findByRole('heading', { level: 2, name: 'Listing not found' })).toBeDefined();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it.each([
    ['another member’s listing', { ...LISTING, owner_id: 'someone-else' }, OWNER, 'You can only promote your own listings'],
    ['an inactive listing', { ...LISTING, status: 'inactive' }, OWNER, 'Reactivate this listing to promote it'],
    ['an unverified member', LISTING, { id: 'user-1', trust_level: TrustLevel.NEW }, 'Verify your account to promote listings'],
  ])('refuses %s before the first step', async (_case, listing, viewer, title) => {
    mockGetListing.mockResolvedValue({ data: listing });
    mocks.useAuth.mockReturnValue({ user: viewer });
    render(<PromoteListingPage />);

    expect(await screen.findByRole('heading', { name: title })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Go to My Listings' }).getAttribute('href')).toBe('/marketplace/my-listings');
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('holds Continue until a tier is chosen, without taking it out of the tab order', async () => {
    await openWizard();

    expect(continueButton().getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(continueButton());
    expect(screen.getByRole('radiogroup', { name: 'Promotion type' })).toBeDefined();

    fireEvent.click(screen.getByRole('radio', { name: 'Featured Listing' }));
    expect(continueButton().getAttribute('aria-disabled')).toBeNull();
  });

  it('moves focus to the next step’s heading', async () => {
    await openWizard();
    fireEvent.click(screen.getByRole('radio', { name: 'Featured Listing' }));

    fireEvent.click(continueButton());

    const heading = await screen.findByRole('heading', { level: 2, name: 'Set duration' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole('spinbutton', { name: 'Duration in days' })).toBeDefined();
  });

  it('goes back to step 1 with the tier still chosen', async () => {
    await openWizard();
    fireEvent.click(screen.getByRole('radio', { name: 'Sponsored Feed' }));
    fireEvent.click(continueButton());
    await screen.findByRole('heading', { level: 2, name: 'Set duration' });

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    const heading = await screen.findByRole('heading', { level: 2, name: 'Choose a promotion type' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole('radio', { name: 'Sponsored Feed' }).getAttribute('aria-checked')).toBe('true');
  });

  it('offers a way out of the wizard from step 1', async () => {
    await openWizard();

    expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/marketplace/my-listings');
  });

  it('reaches the review with the listing and the Pay button', async () => {
    await openWizard();
    fireEvent.click(screen.getByRole('radio', { name: 'Featured Listing' }));
    fireEvent.click(continueButton());
    await screen.findByRole('heading', { level: 2, name: 'Set duration' });
    fireEvent.click(continueButton());

    const heading = await screen.findByRole('heading', { level: 2, name: 'Review and pay' });
    const main = heading.parentElement as HTMLElement;
    expect(within(main).getByText('My Restaurant')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Pay $13.93' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });
});
