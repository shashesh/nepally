import React from 'react';
import { render } from '@testing-library/react-native';
import { EventTypeBadge } from './EventTypeBadge';

// Suppress benign React 19 "overlapping act() calls" warning from rapid sequential renders
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('overlapping act()')) return;
    originalError(...args);
  };
});
afterAll(() => { console.error = originalError; });

jest.mock('@nepally/shared', () => ({
  EVENT_TYPE_COLORS: {
    cultural:  { text: '#E65100', background: '#FFF3E0' },
    religious: { text: '#6A1B9A', background: '#F3E5F5' },
    social:    { text: '#1B5E20', background: '#E8F5E9' },
    career:    { text: '#0D47A1', background: '#E3F2FD' },
    other:     { text: '#424242', background: '#F5F5F5' },
  },
  EVENT_TYPE_ICONS: {
    cultural: '🎭', religious: '🕌', social: '🎉', career: '💼', other: '📌',
  },
  EVENT_TYPE_LABELS: {
    cultural: 'Cultural', religious: 'Religious', social: 'Social',
    career: 'Career', other: 'Other',
  },
}));

describe('EventTypeBadge (mobile)', () => {
  it('renders Cultural label and icon', () => {
    const { getByText } = render(<EventTypeBadge type="cultural" />);
    expect(getByText('Cultural')).toBeTruthy();
    expect(getByText('🎭')).toBeTruthy();
  });

  it('renders Religious label and icon', () => {
    const { getByText } = render(<EventTypeBadge type="religious" />);
    expect(getByText('Religious')).toBeTruthy();
    expect(getByText('🕌')).toBeTruthy();
  });

  it('renders Social label and icon', () => {
    const { getByText } = render(<EventTypeBadge type="social" />);
    expect(getByText('Social')).toBeTruthy();
    expect(getByText('🎉')).toBeTruthy();
  });

  it('renders Career label and icon', () => {
    const { getByText } = render(<EventTypeBadge type="career" />);
    expect(getByText('Career')).toBeTruthy();
    expect(getByText('💼')).toBeTruthy();
  });

  it('renders Other label and icon', () => {
    const { getByText } = render(<EventTypeBadge type="other" />);
    expect(getByText('Other')).toBeTruthy();
    expect(getByText('📌')).toBeTruthy();
  });

  it('renders without crashing for all types', () => {
    const types = ['cultural', 'religious', 'social', 'career', 'other'] as const;
    for (const type of types) {
      expect(() => render(<EventTypeBadge type={type} />)).not.toThrow();
    }
  });
});
