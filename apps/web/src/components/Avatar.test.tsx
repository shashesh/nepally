import React from 'react';
import { render, screen } from '../test-utils';
import { describe, expect, it } from 'vitest';
import Avatar, { getColorFromName } from './Avatar';

describe('Avatar', () => {
  describe('with photoUrl', () => {
    it('renders an img element when photoUrl is provided', () => {
      const photoUrl = 'https://example.com/photo.jpg';
      render(<Avatar name="Test User" photoUrl={photoUrl} />);
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe(photoUrl);
    });

    it('sets alt text based on user name', () => {
      render(<Avatar name="Ram Sharma" photoUrl="https://example.com/photo.jpg" />);
      expect(screen.getByAltText("Ram Sharma's avatar")).toBeDefined();
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

  describe('getColorFromName', () => {
    it('returns same color for same name', () => {
      expect(getColorFromName('Alice')).toBe(getColorFromName('Alice'));
    });

    it('returns different colors for different names', () => {
      const colors = new Set([
        getColorFromName('Alice'),
        getColorFromName('Bob'),
        getColorFromName('Charlie'),
        getColorFromName('Diana'),
        getColorFromName('Eve'),
      ]);
      expect(colors.size).toBeGreaterThan(1);
    });

    it('returns a valid hex color string', () => {
      const color = getColorFromName('Test');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
