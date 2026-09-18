import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../search/SearchCombobox', () => ({
  SearchCombobox: ({ layout, onNavigate }: { layout?: string; onNavigate?: () => void }) =>
    React.createElement(
      'div',
      null,
      React.createElement('input', { 'aria-label': 'Search Nepally', 'data-layout': layout ?? 'dropdown' }),
      React.createElement('button', { type: 'button', onClick: onNavigate }, 'Pick result')
    ),
}));

import { SearchEntry } from './SearchEntry';

function mockPhone(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  );
}

describe('SearchEntry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the dropdown combobox on wide screens', () => {
    mockPhone(false);
    render(<SearchEntry />);
    expect(screen.getByRole('textbox', { name: 'Search Nepally' }).getAttribute('data-layout')).toBe('dropdown');
  });

  it('opens a full-screen overlay from an icon on phones and closes it after navigation', async () => {
    mockPhone(true);
    render(<SearchEntry />);
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('[data-layout="inline"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pick result' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
