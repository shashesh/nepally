import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_PROFILE_PHOTO_SOURCE_BYTES } from '@nepally/shared';
import { act, fireEvent, render, screen } from '../../test-utils';
import { ProfilePhotoControl, type ProfilePhotoControlProps } from './ProfilePhotoControl';

function makeFile(name: string, size = 1024, type = 'image/png'): File {
  const file = new File(['x'], name, { type });
  // jsdom sizes a File from its parts; the tests need a size of their choosing.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function renderControl(overrides: Partial<ProfilePhotoControlProps> = {}) {
  const props: ProfilePhotoControlProps = {
    name: 'Ram Sharma',
    photoUrl: null,
    busy: false,
    onPick: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  render(<ProfilePhotoControl {...props} />);
  return props;
}

async function pickFile(file: File | null) {
  const input = screen.getByLabelText('Upload profile photo');
  await act(async () => {
    fireEvent.change(input, { target: { files: file ? [file] : [] } });
  });
}

describe('ProfilePhotoControl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    const file = makeFile('me.png');

    await pickFile(file);

    expect(props.onPick).toHaveBeenCalledTimes(1);
    expect(props.onPick).toHaveBeenCalledWith(file);
  });

  it('clicking the visible button opens the hidden file input', () => {
    renderControl();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: 'Add Photo' }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('does not call onPick when a pick is cancelled', async () => {
    const props = renderControl();

    await pickFile(null);

    expect(props.onPick).not.toHaveBeenCalled();
  });

  it('rejects a file over the size cap without calling onPick, and shows the message', async () => {
    const props = renderControl();
    const huge = makeFile('huge.png', MAX_PROFILE_PHOTO_SOURCE_BYTES + 1);

    await pickFile(huge);

    expect(props.onPick).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(
      'That photo is too large. It must be 15MB or smaller.'
    );
  });

  it('accepts a file at exactly the size cap', async () => {
    const props = renderControl();
    const exact = makeFile('exact.png', MAX_PROFILE_PHOTO_SOURCE_BYTES);

    await pickFile(exact);

    expect(props.onPick).toHaveBeenCalledWith(exact);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('rejects a file whose type is unsupported without calling onPick', async () => {
    const props = renderControl();
    const pdf = makeFile('resume.pdf', 1024, 'application/pdf');

    await pickFile(pdf);

    expect(props.onPick).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(
      'That file is not a supported image. Use JPG, PNG or WEBP.'
    );
  });

  it('rejects an empty file without calling onPick', async () => {
    const props = renderControl();
    const empty = makeFile('empty.png', 0);

    await pickFile(empty);

    expect(props.onPick).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(
      'That file is not a supported image. Use JPG, PNG or WEBP.'
    );
  });

  it('clears the too-large message and calls onPick on a following valid pick', async () => {
    const props = renderControl();
    const huge = makeFile('huge.png', MAX_PROFILE_PHOTO_SOURCE_BYTES + 1);
    await pickFile(huge);
    expect(screen.getByRole('alert')).toBeDefined();

    const valid = makeFile('ok.png');
    await pickFile(valid);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(props.onPick).toHaveBeenCalledTimes(1);
    expect(props.onPick).toHaveBeenCalledWith(valid);
  });

  it('remounts the alert on a repeat rejection so it re-announces', async () => {
    renderControl();
    await pickFile(makeFile('bad1.pdf', 1024, 'application/pdf'));
    const first = screen.getByRole('alert');

    await pickFile(makeFile('bad2.pdf', 1024, 'application/pdf'));
    const second = screen.getByRole('alert');

    expect(second).not.toBe(first);
  });

  it('links the Add/Change button to the alert while an error is showing', async () => {
    renderControl();
    await pickFile(makeFile('resume.pdf', 1024, 'application/pdf'));

    const button = screen.getByRole('button', { name: 'Add Photo' });
    const alert = screen.getByRole('alert');
    expect(button.getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('has no aria-describedby when there is no error', () => {
    renderControl();

    expect(screen.getByRole('button', { name: 'Add Photo' }).hasAttribute('aria-describedby')).toBe(
      false
    );
  });

  it('calls onRemove when "Remove" is clicked', () => {
    const props = renderControl({ photoUrl: 'https://example.com/me.jpg' });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(props.onRemove).toHaveBeenCalledTimes(1);
  });

  it('clears a pending pick error when Remove is clicked', async () => {
    const props = renderControl({ photoUrl: 'https://example.com/me.jpg' });
    await pickFile(makeFile('resume.pdf', 1024, 'application/pdf'));
    expect(screen.getByRole('alert')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(props.onRemove).toHaveBeenCalledTimes(1);
  });

  it('marks both buttons aria-disabled/data-disabled (not natively disabled) and announces "Updating photo…" while busy', () => {
    renderControl({ photoUrl: 'https://example.com/me.jpg', busy: true });

    const addButton = screen.getByRole('button', { name: 'Change Photo' });
    const removeButton = screen.getByRole('button', { name: 'Remove' });

    expect(addButton.getAttribute('aria-disabled')).toBe('true');
    expect(removeButton.getAttribute('aria-disabled')).toBe('true');
    expect(addButton.getAttribute('data-disabled')).toBe('true');
    expect(removeButton.getAttribute('data-disabled')).toBe('true');
    expect(addButton.hasAttribute('disabled')).toBe(false);
    expect(removeButton.hasAttribute('disabled')).toBe(false);

    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Updating photo…');
  });

  it('does not call onRemove when Remove is clicked while busy', () => {
    const props = renderControl({ photoUrl: 'https://example.com/me.jpg', busy: true });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(props.onRemove).not.toHaveBeenCalled();
  });

  it('does not open the file input when Add/Change is clicked while busy', () => {
    renderControl({ busy: true });
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: 'Add Photo' }));

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('shows no busy announcement when not busy', () => {
    renderControl({ busy: false });

    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('moves focus to the Add/Change button after a remove takes focus away', () => {
    function Harness() {
      const [photoUrl, setPhotoUrl] = useState<string | null>('https://example.com/me.jpg');
      return (
        <ProfilePhotoControl
          name="Ram Sharma"
          photoUrl={photoUrl}
          busy={false}
          onPick={() => {}}
          onRemove={() => setPhotoUrl(null)}
        />
      );
    }
    render(<Harness />);

    const removeButton = screen.getByRole('button', { name: 'Remove' });
    removeButton.focus();
    fireEvent.click(removeButton);

    const addButton = screen.getByRole('button', { name: 'Add Photo' });
    expect(document.activeElement).toBe(addButton);
  });

  it('waits for the removal itself: a replaced photo does not spend the focus restore', () => {
    const props = { name: 'Ram Sharma', busy: false, onPick: () => {}, onRemove: () => {} };
    const { rerender } = render(<ProfilePhotoControl {...props} photoUrl="https://example.com/a.jpg" />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    (document.activeElement as HTMLElement | null)?.blur();
    rerender(<ProfilePhotoControl {...props} photoUrl="https://example.com/b.jpg" />);
    expect(document.activeElement).toBe(document.body);

    rerender(<ProfilePhotoControl {...props} photoUrl={null} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add Photo' }));
  });

  it('does not move focus when it was already elsewhere during the removal', () => {
    function Harness() {
      const [photoUrl, setPhotoUrl] = useState<string | null>('https://example.com/me.jpg');
      return (
        <div>
          <button type="button">Elsewhere</button>
          <ProfilePhotoControl
            name="Ram Sharma"
            photoUrl={photoUrl}
            busy={false}
            onPick={() => {}}
            onRemove={() => setPhotoUrl(null)}
          />
        </div>
      );
    }
    render(<Harness />);

    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
    elsewhere.focus();
    // Deliberately not focusing Remove first: fireEvent.click dispatches the
    // click without the browser's mousedown-driven focus change, so focus
    // stays on `elsewhere` throughout — the scenario where the member's
    // focus was already elsewhere when the removal committed.
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(document.activeElement).toBe(elsewhere);
  });
});
