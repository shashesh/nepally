import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MAX_PROFILE_PHOTO_SOURCE_BYTES } from '@nepally/shared';
import { act, fireEvent, render, screen } from '../../test-utils';
import { ProfilePhotoControl, type ProfilePhotoControlProps } from './ProfilePhotoControl';

function makeFile(name: string, size = 1024, type = 'image/png'): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function renderControl(overrides: Partial<ProfilePhotoControlProps> = {}) {
  const props: ProfilePhotoControlProps = {
    name: 'Ram Sharma',
    photoUrl: null,
    trustLevel: 1,
    busy: false,
    onPick: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  render(<ProfilePhotoControl {...props} />);
  return props;
}

async function pickFile(file: File) {
  const input = screen.getByLabelText('Upload profile photo');
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

describe('ProfilePhotoControl', () => {
  it('shows "Add Photo" and no Remove button without a photo', () => {
    renderControl({ photoUrl: null });

    expect(screen.getByRole('button', { name: 'Add Photo' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
  });

  it('shows "Change Photo" and "Remove" with a photo', () => {
    renderControl({ photoUrl: 'https://example.com/me.jpg' });

    expect(screen.getByRole('button', { name: 'Change Photo' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDefined();
  });

  it('calls onPick with the chosen file', async () => {
    const props = renderControl();
    const file = new File(['x'], 'me.png', { type: 'image/png' });

    await pickFile(file);

    expect(props.onPick).toHaveBeenCalledTimes(1);
    expect(props.onPick).toHaveBeenCalledWith(file);
  });

  it('rejects a file over the size cap without calling onPick, and shows the message', async () => {
    const props = renderControl();
    const huge = makeFile('huge.png', MAX_PROFILE_PHOTO_SOURCE_BYTES + 1);

    await pickFile(huge);

    expect(props.onPick).not.toHaveBeenCalled();
    expect(screen.getByText('That photo is too large. Choose one under 15MB.')).toBeDefined();
  });

  it('clears the too-large message and calls onPick on a following valid pick', async () => {
    const props = renderControl();
    const huge = makeFile('huge.png', MAX_PROFILE_PHOTO_SOURCE_BYTES + 1);
    await pickFile(huge);
    expect(screen.getByText(/too large/i)).toBeDefined();

    const valid = makeFile('ok.png', 1024);
    await pickFile(valid);

    expect(screen.queryByText(/too large/i)).toBeNull();
    expect(props.onPick).toHaveBeenCalledTimes(1);
    expect(props.onPick).toHaveBeenCalledWith(valid);
  });

  it('calls onRemove when "Remove" is clicked', () => {
    const props = renderControl({ photoUrl: 'https://example.com/me.jpg' });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(props.onRemove).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons and announces "Updating photo…" while busy', () => {
    renderControl({ photoUrl: 'https://example.com/me.jpg', busy: true });

    expect(screen.getByRole('button', { name: 'Change Photo' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Remove' }).hasAttribute('disabled')).toBe(true);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Updating photo…');
  });
});
