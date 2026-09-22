import React from 'react';
import { render, screen, fireEvent, act } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedLocation } from '@nepally/shared';

const mocks = vi.hoisted(() => ({ notificationsShowMock: vi.fn() }));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: mocks.notificationsShowMock },
}));

import { SavedLocationRow } from './SavedLocationRow';

const homeLocation: SavedLocation = {
  id: 'loc-1',
  user_id: 'user-1',
  label: 'Home',
  metro_area_id: '19100',
  zip_code: null,
  is_default: true,
  sort_order: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  metro_area: { id: '19100', name: 'Dallas-Fort Worth', state: 'TX' },
};

const workLocation: SavedLocation = {
  ...homeLocation,
  id: 'loc-2',
  label: 'Work',
  is_default: false,
  metro_area_id: '35620',
  metro_area: { id: '35620', name: 'New York', state: 'NY' },
};

describe('SavedLocationRow', () => {
  const onRename = vi.fn();
  const onRemove = vi.fn();
  const onSetDefault = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onRename.mockResolvedValue({});
  });

  function renderRow(overrides: Partial<React.ComponentProps<typeof SavedLocationRow>> = {}) {
    return render(
      <SavedLocationRow
        location={workLocation}
        canRemove
        otherLabels={['home']}
        onRename={onRename}
        onRemove={onRemove}
        onSetDefault={onSetDefault}
        {...overrides}
      />
    );
  }

  it('renders the label and metro display', () => {
    renderRow();
    expect(screen.getByText('Work')).toBeDefined();
    expect(screen.getByText('New York, NY')).toBeDefined();
  });

  it('shows a star for the default location', () => {
    renderRow({ location: homeLocation });
    expect(screen.getByText('⭐')).toBeDefined();
  });

  it('does not show a star for a non-default location', () => {
    renderRow();
    expect(screen.queryByText('⭐')).toBeNull();
  });

  it('names the Rename and Remove actions with the location label', () => {
    renderRow();
    expect(screen.getByRole('button', { name: 'Rename Work' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Remove Work' })).toBeDefined();
  });

  it('hides Remove when canRemove is false', () => {
    renderRow({ canRemove: false });
    expect(screen.queryByRole('button', { name: 'Remove Work' })).toBeNull();
  });

  it('calls onRemove when Remove is clicked', () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Work' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('shows Set as default for a non-default location and calls onSetDefault', () => {
    renderRow();
    fireEvent.click(screen.getByText('Set as default'));
    expect(onSetDefault).toHaveBeenCalledTimes(1);
  });

  it('hides Set as default for the default location', () => {
    renderRow({ location: homeLocation });
    expect(screen.queryByText('Set as default')).toBeNull();
  });

  it('gives each row\'s "Set as default" a distinct accessible name', () => {
    // jsdom's accessible-name computation doesn't add a word-boundary space
    // for VisuallyHidden's out-of-flow text the way a real browser does (see
    // the pw620 browser check for the exact "Set as default for Work" a
    // screen reader hears in Chromium) — match loosely here, since the point
    // of this test is that the label makes each row's name unique.
    renderRow();
    expect(screen.getByRole('button', { name: /^Set as default.*Work$/ })).toBeDefined();
  });

  it('enters edit mode on Rename click, focusing the field', () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const input = screen.getByLabelText('Rename location Work');
    expect(input).toBeDefined();
    expect(document.activeElement).toBe(input);
  });

  it('saves the trimmed label on Enter', async () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const input = screen.getByLabelText('Rename location Work');
    fireEvent.change(input, { target: { value: '  Office  ' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(onRename).toHaveBeenCalledWith('Office');
  });

  it('saves on blur', async () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const input = screen.getByLabelText('Rename location Work');
    fireEvent.change(input, { target: { value: 'Office' } });
    await act(async () => {
      fireEvent.blur(input);
    });
    expect(onRename).toHaveBeenCalledWith('Office');
  });

  it('shows a field error for a duplicate rename, leaves editing open, and never calls onRename', async () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const input = screen.getByLabelText('Rename location Work');
    fireEvent.change(input, { target: { value: 'Home' } }); // 'home' is in otherLabels
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(screen.getByText('You already have a location named "Home".')).toBeDefined();
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Rename location Work')).toBeDefined();
  });

  it('cancels on Escape without saving, and returns focus to the Rename button', async () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const input = screen.getByLabelText('Rename location Work');
    fireEvent.change(input, { target: { value: 'Changed' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Rename location Work')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rename Work' }));
  });

  it('toasts and leaves editing open when the rename fails', async () => {
    onRename.mockResolvedValue({ error: new Error('offline') });
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const input = screen.getByLabelText('Rename location Work');
    fireEvent.change(input, { target: { value: 'Office' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(mocks.notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Couldn't rename this location", color: 'red' })
    );
    expect(screen.getByLabelText('Rename location Work')).toBeDefined();
  });

  it('does not save an unchanged label', async () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const input = screen.getByLabelText('Rename location Work');
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Rename location Work')).toBeNull();
  });

  // ─── Focus race: a blur toward another control must not steal it back ────

  it('does not steal focus on blur toward another control when nothing changed', async () => {
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const removeButton = screen.getByRole('button', { name: 'Remove Work' });

    // A real focus move: jsdom fires the input's blur with relatedTarget set
    // to removeButton as part of this, which is what handleBlur reads.
    //
    // document.activeElement alone can't tell a fixed closeRename from a
    // broken one here: jsdom's own .focus() finishes setting removeButton
    // active *after* dispatching blur, so even a closeRename that
    // unconditionally calls the Rename button's .focus() during that blur
    // still leaves activeElement on removeButton once this call returns —
    // verified by temporarily reverting the `if (refocus)` guard, which left
    // this assertion alone still green. The spy below is the real assertion:
    // it catches the extra, wrongly-issued .focus() call itself, regardless
    // of who a jsdom re-entrancy quirk lets win afterward.
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    try {
      await act(async () => {
        removeButton.focus();
      });

      expect(onRename).not.toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalledTimes(1); // only this test's own call
      expect(document.activeElement).toBe(removeButton);
    } finally {
      focusSpy.mockRestore();
    }
  });

  it('does not steal focus back once the member has moved on while a save is in flight', async () => {
    let resolveRename: (value: { error?: Error | null }) => void = () => {};
    onRename.mockReturnValue(
      new Promise((resolve) => {
        resolveRename = resolve;
      })
    );
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const input = screen.getByLabelText('Rename location Work');
    fireEvent.change(input, { target: { value: 'Office' } });
    const removeButton = screen.getByRole('button', { name: 'Remove Work' });

    await act(async () => {
      fireEvent.blur(input, { relatedTarget: removeButton });
      removeButton.focus();
    });
    expect(onRename).toHaveBeenCalledWith('Office');
    expect(document.activeElement).toBe(removeButton);

    await act(async () => {
      resolveRename({});
    });

    // The save succeeded and closed the field, but focus was already on
    // Remove by the time it resolved — it must be left alone.
    expect(document.activeElement).toBe(removeButton);
  });

  it('does not double-save when a blur follows Enter before the request resolves', async () => {
    let resolveRename: (value: { error?: Error | null }) => void = () => {};
    onRename.mockReturnValue(
      new Promise((resolve) => {
        resolveRename = resolve;
      })
    );
    renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const input = screen.getByLabelText('Rename location Work');
    fireEvent.change(input, { target: { value: 'Office' } });

    fireEvent.keyDown(input, { key: 'Enter' });
    await act(async () => {
      fireEvent.blur(input);
    });

    expect(onRename).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRename({});
    });
    expect(onRename).toHaveBeenCalledTimes(1);
  });
});
