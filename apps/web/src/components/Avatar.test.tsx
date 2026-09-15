import React from 'react';
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
});
