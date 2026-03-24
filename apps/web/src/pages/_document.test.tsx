import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const docMocks = vi.hoisted(() => ({
  htmlMock: vi.fn(({ lang, children }: { lang?: string; children?: React.ReactNode }) =>
    React.createElement('html', { lang }, children)
  ),
  headMock: vi.fn(({ children }: { children?: React.ReactNode }) =>
    React.createElement('head', null, children)
  ),
  mainMock: vi.fn(() => React.createElement('div', { 'data-testid': 'main' })),
  nextScriptMock: vi.fn(() => React.createElement('div', { 'data-testid': 'next-script' })),
}));

vi.mock('next/document', () => ({
  Html: docMocks.htmlMock,
  Head: docMocks.headMock,
  Main: docMocks.mainMock,
  NextScript: docMocks.nextScriptMock,
}));

import Document from './_document.page';

describe('Document', () => {
  it('renders without errors', () => {
    expect(() => renderToStaticMarkup(React.createElement(Document))).not.toThrow();
  });

  it('sets lang="en" on the Html element', () => {
    docMocks.htmlMock.mockClear();
    renderToStaticMarkup(React.createElement(Document));
    expect(docMocks.htmlMock).toHaveBeenCalled();
    const firstCallProps = docMocks.htmlMock.mock.calls[0]?.[0] as { lang?: string };
    expect(firstCallProps.lang).toBe('en');
  });

  it('renders the Main content area', () => {
    docMocks.mainMock.mockClear();
    renderToStaticMarkup(React.createElement(Document));
    expect(docMocks.mainMock).toHaveBeenCalled();
  });

  it('renders the NextScript element', () => {
    docMocks.nextScriptMock.mockClear();
    renderToStaticMarkup(React.createElement(Document));
    expect(docMocks.nextScriptMock).toHaveBeenCalled();
  });
});
