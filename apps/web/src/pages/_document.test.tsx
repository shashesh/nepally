import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const docMocks = vi.hoisted(() => ({
  mainMock: vi.fn(() => React.createElement('div', { 'data-testid': 'main' })),
  nextScriptMock: vi.fn(() => React.createElement('div', { 'data-testid': 'next-script' })),
}));

vi.mock('next/document', () => ({
  Html: ({ lang, children }: { lang?: string; children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'html', 'data-lang': lang }, children),
  Head: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'head' }, children),
  Main: docMocks.mainMock,
  NextScript: docMocks.nextScriptMock,
}));

import Document from './_document';

describe('Document', () => {
  it('renders without errors', () => {
    expect(() => render(React.createElement(Document))).not.toThrow();
  });

  it('sets lang="en" on the Html element', () => {
    const { getByTestId } = render(React.createElement(Document));
    expect(getByTestId('html').getAttribute('data-lang')).toBe('en');
  });

  it('renders the Main content area', () => {
    docMocks.mainMock.mockClear();
    render(React.createElement(Document));
    expect(docMocks.mainMock).toHaveBeenCalled();
  });

  it('renders the NextScript element', () => {
    docMocks.nextScriptMock.mockClear();
    render(React.createElement(Document));
    expect(docMocks.nextScriptMock).toHaveBeenCalled();
  });
});
