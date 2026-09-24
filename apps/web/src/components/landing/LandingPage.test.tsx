import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

function headingLevel(heading: HTMLElement): number {
  return Number(heading.tagName.slice(1));
}

describe('LandingPage', () => {
  it('names the page "Welcome to Nepally"', () => {
    render(<LandingPage />);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Welcome to Nepally');
  });

  it('leads to sign-up and log-in', () => {
    render(<LandingPage />);

    expect(screen.getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe('/signup');
    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login');
  });

  it('lists five things under "What you\'ll find"', () => {
    render(<LandingPage />);

    const headings = screen.getAllByRole('heading');
    const sectionIndex = headings.findIndex((heading) => heading.textContent === "What you'll find");
    expect(sectionIndex).toBeGreaterThan(-1);
    expect(headingLevel(headings[sectionIndex])).toBe(2);

    const items = headings.slice(sectionIndex + 1);
    expect(items.map(headingLevel)).toEqual([3, 3, 3, 3, 3]);
    expect(items.map((heading) => heading.textContent)).toEqual([
      'Housing',
      'Jobs',
      'Help',
      'Events',
      'Marketplace',
    ]);
  });

  it('never links a signed-out visitor to the feed', () => {
    render(<LandingPage />);

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href') ?? '');
    expect(hrefs.some((href) => href.startsWith('/feed'))).toBe(false);
  });

  it('links the Community Guidelines', () => {
    render(<LandingPage />);

    expect(screen.getByRole('link', { name: 'Community Guidelines' }).getAttribute('href')).toBe('/guidelines');
  });

  it('hides every icon from assistive tech', () => {
    const { container } = render(<LandingPage />);

    const icons = Array.from(container.querySelectorAll('svg'));
    expect(icons.length).toBeGreaterThanOrEqual(5);
    for (const icon of icons) {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    }
  });
});
