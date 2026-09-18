import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PageHeader } from './PageHeader';

vi.mock('next/link', () => {
  const LinkComponent = React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(
    function Link({ href, children, ...rest }, ref) {
      return React.createElement('a', { href, ref, ...rest }, children);
    }
  );
  return { default: LinkComponent };
});

describe('PageHeader', () => {
  it('renders the title as the page heading', () => {
    render(<PageHeader title="Events" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeDefined();
  });

  it('renders a back link when backHref is set', () => {
    render(<PageHeader title="Create event" backHref="/events" backLabel="Back to events" />);
    expect(screen.getByRole('link', { name: 'Back to events' }).getAttribute('href')).toBe('/events');
  });

  it('renders actions', () => {
    render(<PageHeader title="Marketplace" actions={<button type="button">Create listing</button>} />);
    expect(screen.getByRole('button', { name: 'Create listing' })).toBeDefined();
  });
});
