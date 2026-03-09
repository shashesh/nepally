import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@nusa/shared', () => ({
  EVENT_TYPE_ICONS: {
    cultural: '🎭', religious: '🕌', social: '🎉', career: '💼', other: '📌',
  },
  EVENT_TYPE_LABELS: {
    cultural: 'Cultural', religious: 'Religious', social: 'Social',
    career: 'Career', other: 'Other',
  },
}));

vi.mock('./EventTypeBadge.module.css', () => ({
  default: {
    badge: 'badge',
    badgeCultural: 'badgeCultural',
    badgeReligious: 'badgeReligious',
    badgeSocial: 'badgeSocial',
    badgeCareer: 'badgeCareer',
    badgeOther: 'badgeOther',
  },
}));

import EventTypeBadge from './EventTypeBadge';

describe('EventTypeBadge (web)', () => {
  it('renders Cultural icon and label', () => {
    render(React.createElement(EventTypeBadge, { type: 'cultural' }));
    expect(screen.getByText('🎭 Cultural')).toBeDefined();
  });

  it('renders Religious icon and label', () => {
    render(React.createElement(EventTypeBadge, { type: 'religious' }));
    expect(screen.getByText('🕌 Religious')).toBeDefined();
  });

  it('renders Social icon and label', () => {
    render(React.createElement(EventTypeBadge, { type: 'social' }));
    expect(screen.getByText('🎉 Social')).toBeDefined();
  });

  it('renders Career icon and label', () => {
    render(React.createElement(EventTypeBadge, { type: 'career' }));
    expect(screen.getByText('💼 Career')).toBeDefined();
  });

  it('renders Other icon and label', () => {
    render(React.createElement(EventTypeBadge, { type: 'other' }));
    expect(screen.getByText('📌 Other')).toBeDefined();
  });

  it('renders a span element', () => {
    const { container } = render(React.createElement(EventTypeBadge, { type: 'cultural' }));
    expect(container.querySelector('span')).not.toBeNull();
  });

  it('does not crash for any valid event type', () => {
    const types = ['cultural', 'religious', 'social', 'career', 'other'] as const;
    for (const type of types) {
      expect(() =>
        render(React.createElement(EventTypeBadge, { type }))
      ).not.toThrow();
    }
  });
});
