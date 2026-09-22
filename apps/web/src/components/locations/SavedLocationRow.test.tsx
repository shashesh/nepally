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
});
