import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Avatar from './Avatar';

describe('Avatar', () => {
  describe('with photoUrl', () => {
    it('renders an img element when photoUrl is provided', () => {
      const photoUrl = 'https://example.com/photo.jpg';
      render(<Avatar name="Test User" photoUrl={photoUrl} />);
      const img = screen.getByRole('img');
      const src = img.getAttribute('src');
      expect(src).toContain('/_next/image?');
      expect(src).toContain(encodeURIComponent(photoUrl));
    });

    it('sets alt text based on user name', () => {
      render(<Avatar name="Ram Sharma" photoUrl="https://example.com/photo.jpg" />);
      expect(screen.getByAltText("Ram Sharma's avatar")).toBeDefined();
    });

    it('does not render initials when photoUrl is provided', () => {
      render(<Avatar name="Test User" photoUrl="https://example.com/photo.jpg" />);
      expect(screen.queryByText('TU')).toBeNull();
    });
  });

  describe('without photoUrl', () => {
    it('renders initials for a two-part name', () => {
      render(<Avatar name="Bikal Shrestha" />);
      expect(screen.getByText('BS')).toBeDefined();
    });

    it('renders first 2 chars uppercased for a single-word name', () => {
      render(<Avatar name="bishal" />);
      expect(screen.getByText('BI')).toBeDefined();
    });

    it('renders first and last-part initials for multi-word names', () => {
      render(<Avatar name="Ram Bahadur Thapa" />);
      expect(screen.getByText('RT')).toBeDefined();
    });

    it('does not render an img element', () => {
      render(<Avatar name="Test User" />);
      expect(screen.queryByRole('img')).toBeNull();
    });
  });

  describe('with null photoUrl', () => {
    it('falls back to initials when photoUrl is null', () => {
      render(<Avatar name="Test User" photoUrl={null} />);
      expect(screen.getByText('TU')).toBeDefined();
    });
  });

  describe('default props', () => {
    it('renders without size and trustLevel props (uses defaults)', () => {
      render(<Avatar name="Default User" />);
      expect(screen.getByText('DU')).toBeDefined();
    });
  });
});
