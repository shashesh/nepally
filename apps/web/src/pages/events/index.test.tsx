import React from 'react';
import { render, screen, waitFor, fireEvent, act, within } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMetroEventsPage } from '@nepally/shared';
import type { Event, EventsResult, MetroEventsPageOptions } from '@nepally/shared';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };
type IntersectionCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: MockHeadProps) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

function makeEvent(id: string, overrides: Partial<Event> = {}): Event {
  return {
    id, title: `Event ${id}`, description: '',
    event_type: 'cultural', start_date: FUTURE, location_name: 'Dallas',
    metro_area_id: '19100', is_global: false, organizer_id: 'u9',
    rsvp_count: 1, interested_count: 1, rsvp_visibility: 'public', status: 'active',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    organizer: { id: 'u9', full_name: 'Asha Kumar', trust_level: 1, profile_photo: null },
    ...overrides,
  };
}

const mockEvents = [
  makeEvent('e1', { title: 'Dashain Celebration', location_name: 'Dallas Convention Center' }),
  makeEvent('e2', { title: 'Career Networking Night', event_type: 'career', location_name: 'Tech Hub' }),
];

vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getMetroEventsPage: vi.fn(),
    getUserEventResponses: vi.fn(async () => ({ data: {} })),
    setEventResponse: vi.fn(async () => ({})),
    removeEventResponse: vi.fn(async () => ({})),
  };
});

import EventsPage from './index.page';

/** Answers each period from its own queue; an empty queue answers with no rows. */
function queuePages(queues: { upcoming?: EventsResult[]; past?: EventsResult[] }) {
  const pending = { upcoming: [...(queues.upcoming ?? [])], past: [...(queues.past ?? [])] };
  vi.mocked(getMetroEventsPage).mockImplementation(
    async (_client: unknown, _metro: string, options: MetroEventsPageOptions) =>
      pending[options.period].shift() ?? { data: [], hasMore: false }
  );
}

const shortPage = (rows: Event[]): EventsResult => ({ data: rows, hasMore: false });
const fullPage = (rows: Event[]): EventsResult => ({ data: rows, hasMore: true });

/** jsdom has no IntersectionObserver; this lets a test put the sentinel on screen. */
function installIntersectionObserver() {
  const callbacks: IntersectionCallback[] = [];
  class FakeIntersectionObserver {
    constructor(callback: IntersectionCallback) {
      callbacks.push(callback);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIntersectionObserver;
  return {
    scrollSentinelIntoView() {
      const target = document.createElement('div');
      for (const callback of callbacks) callback([{ isIntersecting: true, target }]);
    },
  };
}

const VERIFIED = { id: 'u1', trust_level: 1, metro_area_id: '19100' };

async function renderPage() {
  render(React.createElement(EventsPage));
  await act(async () => {});
  await act(async () => {});
}

describe('EventsPage', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ replace: mockReplace });
    mocks.useAuth.mockReturnValue({ user: VERIFIED });
    queuePages({ upcoming: [shortPage(mockEvents)] });
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(React.createElement(EventsPage));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('heads the page "Events"', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeDefined();
  });

  it('renders the upcoming events under an Upcoming heading', async () => {
    await renderPage();
    const heading = screen.getByRole('heading', { level: 2, name: 'Upcoming' });
    const section = heading.closest('section')!;
    expect(section.textContent).toContain('Dashain Celebration');
    expect(section.textContent).toContain('Career Networking Night');
  });

  it('opens on past events, with no Upcoming heading, when nothing is upcoming', async () => {
    queuePages({
      upcoming: [shortPage([])],
      past: [shortPage([makeEvent('p1', { title: 'Tihar Night', start_date: PAST })])],
    });
    await renderPage();

    const heading = screen.getByRole('heading', { level: 2, name: 'Past events' });
    expect(heading.closest('section')!.textContent).toContain('Tihar Night');
    expect(screen.queryByRole('heading', { name: 'Upcoming' })).toBeNull();
    expect(screen.getByText('Past')).toBeDefined();
  });

  it('shows Create event for a Level 1 member', async () => {
    await renderPage();
    const link = screen.getByRole('link', { name: 'Create event' });
    expect(link.getAttribute('href')).toBe('/events/create');
  });

  it('hides Create event from a Level 0 member', async () => {
    mocks.useAuth.mockReturnValue({ user: { ...VERIFIED, trust_level: 0 } });
    await renderPage();
    expect(screen.queryByRole('link', { name: 'Create event' })).toBeNull();
  });

  it('shows the Level 0 banner, which can be dismissed', async () => {
    mocks.useAuth.mockReturnValue({ user: { ...VERIFIED, trust_level: 0 } });
    await renderPage();

    const copy = 'Verify your account to respond to events and create them.';
    expect(screen.getByText(copy)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss banner' }));
    expect(screen.queryByText(copy)).toBeNull();
  });

  it('filters events by type when a chip is clicked', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Career' }));
    expect(screen.queryByText('Dashain Celebration')).toBeNull();
    expect(screen.getByText('Career Networking Night')).toBeDefined();
  });

  it('filters events by search query', async () => {
    await renderPage();
    const input = screen.getByRole('searchbox', { name: 'Search events' });
    fireEvent.change(input, { target: { value: 'Dashain' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.queryByText('Career Networking Night')).toBeNull();
    expect(screen.getByText('Dashain Celebration')).toBeDefined();
  });

  it('shows the type empty state once every page is loaded', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Social' }));
    expect(screen.getByText('No Social events')).toBeDefined();
  });

  it('shows the query empty state when search matches nothing', async () => {
    await renderPage();
    const input = screen.getByRole('searchbox', { name: 'Search events' });
    fireEvent.change(input, { target: { value: 'zzznomatch' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('No events matching "zzznomatch"')).toBeDefined();
  });

  it('keeps paging while a filter shows nothing, and says so only after the last page', async () => {
    const observer = installIntersectionObserver();
    const firstPage = Array.from({ length: 20 }, (_, i) => makeEvent(`c${i}`, { title: `Cultural ${i}` }));
    queuePages({
      upcoming: [fullPage(firstPage), shortPage([makeEvent('c20', { title: 'Cultural 20' })])],
      past: [shortPage([])],
    });
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Social' }));
    expect(screen.queryByText('No Social events')).toBeNull();

    await act(async () => {
      observer.scrollSentinelIntoView();
    });
    await act(async () => {});
    await act(async () => {});

    expect(vi.mocked(getMetroEventsPage).mock.calls.map((call) => call[2])).toEqual([
      expect.objectContaining({ period: 'upcoming', offset: 0 }),
      expect.objectContaining({ period: 'upcoming', offset: 20 }),
      expect.objectContaining({ period: 'past', offset: 0 }),
    ]);
    expect(screen.getByText('No Social events')).toBeDefined();
  });

  it('shows a load error with Try again, which reloads', async () => {
    queuePages({ upcoming: [{ error: new Error('Network error') }, shortPage(mockEvents)] });
    await renderPage();

    expect(screen.getByText("Couldn't load events")).toBeDefined();
    expect(screen.getByText('Network error')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await act(async () => {});
    await act(async () => {});

    expect(screen.getByText('Dashain Celebration')).toBeDefined();
    expect(screen.queryByText('Network error')).toBeNull();
    // The failed first page, then the reload's first page and the past page it chains.
    expect(vi.mocked(getMetroEventsPage).mock.calls.map((call) => call[2].period)).toEqual([
      'upcoming',
      'upcoming',
      'past',
    ]);
  });

  it('says so when a later page fails, and Try again resumes paging', async () => {
    const observer = installIntersectionObserver();
    queuePages({
      upcoming: [
        fullPage(mockEvents),
        { error: new Error('Timed out') },
        shortPage([makeEvent('e3', { title: 'Teej Gathering' })]),
      ],
    });
    await renderPage();

    await act(async () => {
      observer.scrollSentinelIntoView();
    });
    await act(async () => {});

    expect(screen.getByText("Couldn't load more events")).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await act(async () => {});
    await act(async () => {});

    expect(screen.getByText('Teej Gathering')).toBeDefined();
    expect(screen.queryByText("Couldn't load more events")).toBeNull();
  });

  it('shows the empty state without fetching when the member has no metro', async () => {
    mocks.useAuth.mockReturnValue({ user: { ...VERIFIED, metro_area_id: '' } });
    await renderPage();
    expect(screen.getByText('No upcoming events')).toBeDefined();
    expect(getMetroEventsPage).not.toHaveBeenCalled();
  });

  it('marks a card busy while its response saves', async () => {
    const { setEventResponse } = await import('@nepally/shared');
    vi.mocked(setEventResponse).mockReturnValueOnce(new Promise(() => {}));
    await renderPage();

    const group = screen.getByRole('group', { name: 'Your response to Dashain Celebration' });
    const going = within(group).getByRole('button', { name: 'Going' });
    fireEvent.click(going);

    expect(going.getAttribute('aria-pressed')).toBe('true');
    expect(going.getAttribute('aria-disabled')).toBe('true');
  });
});
