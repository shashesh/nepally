import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@nepally/shared', () => ({
  EVENT_TYPE_ICONS: {
    cultural: '🎭', religious: '🕌', social: '🎉', career: '💼', other: '📌',
  },
  EVENT_TYPE_LABELS: {
    cultural: 'Cultural', religious: 'Religious', social: 'Social',
    career: 'Career', other: 'Other',
  },
}));

import EventTypeBadge from './EventTypeBadge';

/** The text assistive technology reads: everything outside aria-hidden. */
function readableText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
  return (clone.textContent ?? '').trim();
}

const TYPES = [
  ['cultural', '🎭', 'Cultural'],
  ['religious', '🕌', 'Religious'],
  ['social', '🎉', 'Social'],
  ['career', '💼', 'Career'],
  ['other', '📌', 'Other'],
] as const;

describe('EventTypeBadge (web)', () => {
  it.each(TYPES)('reads the %s badge as its label alone', (type, icon, label) => {
    render(React.createElement(EventTypeBadge, { type }));

    const text = screen.getByText(label);
    expect(readableText(text.parentElement!)).toBe(label);
    expect(screen.getByText(icon).closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
