import React from 'react';
import { getAvatarToneIndex } from '@nepally/shared';
import { render, screen } from '../test-utils';
import { describe, expect, it } from 'vitest';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('renders the photo with an accessible name', () => {
    render(<Avatar name="Ram Sharma" photoUrl="https://example.com/photo.jpg" />);
    const img = screen.getByAltText("Ram Sharma's avatar");
    expect(img.getAttribute('src')).toBe('https://example.com/photo.jpg');
  });

  it('falls back to shared initials without a photo', () => {
    render(<Avatar name="Ram Bahadur Thapa" photoUrl={null} />);
    expect(screen.getByText('RT')).toBeDefined();
  });

  it('shows the verified mark for Level 1+ when requested', () => {
    render(<Avatar name="Sita Gurung" trustLevel={1} showVerifiedMark />);
    expect(screen.getByTestId('verified-mark')).toBeDefined();
    expect(screen.getByRole('img', { name: 'Verified' })).toBeDefined();
  });

  it('hides the verified mark for Level 0 or when not requested', () => {
    const { rerender } = render(<Avatar name="Sita Gurung" trustLevel={0} showVerifiedMark />);
    expect(screen.queryByTestId('verified-mark')).toBeNull();
    rerender(<Avatar name="Sita Gurung" trustLevel={2} />);
    expect(screen.queryByTestId('verified-mark')).toBeNull();
  });

  it('uses toneKey instead of name to choose the placeholder tone when provided', () => {
    const nameA = 'Sunita Karki';
    const nameB = 'Bibek Thapa';
    // Guard the fixture itself: the assertion below is only meaningful if these
    // two names really do hash to different tones.
    expect(getAvatarToneIndex(nameA, 8)).not.toBe(getAvatarToneIndex(nameB, 8));

    const { container: baseline } = render(<Avatar name={nameA} />);
    const { container: overridden } = render(<Avatar name={nameB} toneKey={nameA} />);

    const baselineTone = baseline.querySelector('[class*="tone"]')?.className;
    const overriddenTone = overridden.querySelector('[class*="tone"]')?.className;

    expect(baselineTone).toBeTruthy();
    // Different `name`, but the same toneKey as the baseline — same tone class.
    expect(overriddenTone).toBe(baselineTone);
  });

  it('hides the avatar from assistive tech and clears alt text when decorative', () => {
    const { container } = render(
      <Avatar name="Sita Gurung" photoUrl="https://example.com/photo.jpg" decorative />
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('alt')).toBe('');
    // Walk up from the img to Avatar's own root span — MantineProvider/ModalsProvider
    // inject their own nodes ahead of it in `container`, so `firstElementChild` isn't it.
    expect(img?.closest('span')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('still renders initials visually when decorative and there is no photo', () => {
    render(<Avatar name="Sita Gurung" photoUrl={null} decorative />);
    expect(screen.getByText('SG')).toBeDefined();
  });
});
