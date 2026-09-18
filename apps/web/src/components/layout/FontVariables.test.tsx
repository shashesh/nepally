import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('../../styles/fonts', () => ({
  displayFont: { style: { fontFamily: "'Display Mock', serif" } },
  bodyFont: { style: { fontFamily: "'Body Mock', sans-serif" } },
}));

import FontVariables from './FontVariables';

describe('FontVariables', () => {
  it('points the font tokens at the self-hosted faces', () => {
    const { container } = render(<FontVariables />);
    const css = container.querySelector('style')?.innerHTML ?? '';
    expect(css).toContain("--font-display:'Display Mock', serif");
    expect(css).toContain("--font-body:'Body Mock', sans-serif");
  });

  it('uses a selector that outranks tokens.css :root', () => {
    const { container } = render(<FontVariables />);
    expect(container.querySelector('style')?.innerHTML.startsWith('html:root{')).toBe(true);
  });
});
