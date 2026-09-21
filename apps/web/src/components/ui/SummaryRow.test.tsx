import React from 'react';
import { render, screen } from '../../test-utils';
import { cleanup } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SummaryRow, SummaryRowMeta } from './SummaryRow';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

describe('SummaryRow', () => {
  it('links the title, and only the title, to href', () => {
    render(<SummaryRow href="/things/1" title="A thing worth summarizing" />);

    const link = screen.getByRole('link', { name: 'A thing worth summarizing' });
    expect(link.getAttribute('href')).toBe('/things/1');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('renders badge outside the link', () => {
    render(<SummaryRow href="/things/1" title="A thing" badge={<span>Badge content</span>} />);

    const link = screen.getByRole('link', { name: 'A thing' });
    const badge = screen.getByText('Badge content');

    expect(link.contains(badge)).toBe(false);
  });

  it('renders no badge wrapper when no badge is given, e.g. the public listing view', () => {
    render(<SummaryRow href="/things/1" title="A thing" />);

    const link = screen.getByRole('link', { name: 'A thing' });
    expect(link.parentElement?.children).toHaveLength(1);
  });

  it('renders leading outside the link', () => {
    render(<SummaryRow href="/things/1" title="A thing" leading={<span>Leading content</span>} />);

    const link = screen.getByRole('link', { name: 'A thing' });
    const leading = screen.getByText('Leading content');

    expect(link.contains(leading)).toBe(false);
  });

  it('renders leading before the body, as the first element in the row', () => {
    render(<SummaryRow href="/things/1" title="A thing" leading={<span>Leading content</span>} />);

    const article = screen.getByRole('article');
    const leading = screen.getByText('Leading content');

    expect(article.children[0].contains(leading)).toBe(true);
  });

  it('renders menu outside the link', () => {
    render(<SummaryRow href="/things/1" title="A thing" menu={<button type="button">Options</button>} />);

    const link = screen.getByRole('link', { name: 'A thing' });
    const menuButton = screen.getByRole('button', { name: 'Options' });

    expect(link.contains(menuButton)).toBe(false);
  });

  it('renders no extra wrapper element when no menu is given', () => {
    render(<SummaryRow href="/things/1" title="A thing" />);

    expect(screen.getByRole('article').children).toHaveLength(1);
  });

  it('renders no menu slot for a falsy menu, such as isOwn && <ActionMenu />', () => {
    render(<SummaryRow href="/things/1" title="A thing" menu={false} />);

    expect(screen.getByRole('article').children).toHaveLength(1);
  });

  it('renders one more article child for a real menu than for none', () => {
    render(<SummaryRow href="/things/1" title="A thing" menu={<button type="button">Options</button>} />);
    const withMenu = screen.getByRole('article').children.length;
    cleanup();

    render(<SummaryRow href="/things/1" title="A thing" />);
    const withoutMenu = screen.getByRole('article').children.length;

    expect(withMenu).toBe(withoutMenu + 1);
  });

  it('renders children outside the link, following it in document order', () => {
    render(
      <SummaryRow href="/things/1" title="A thing">
        <span>Extra detail</span>
      </SummaryRow>
    );

    const link = screen.getByRole('link', { name: 'A thing' });
    const child = screen.getByText('Extra detail');

    expect(link.contains(child)).toBe(false);
    expect(link.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('SummaryRowMeta', () => {
  it('renders each item as its own direct child, not merged into one wrapper', () => {
    const { container } = render(
      <SummaryRowMeta>
        <span>First item</span>
        <span>Second item</span>
      </SummaryRowMeta>
    );

    const first = screen.getByText('First item');
    const second = screen.getByText('Second item');
    const line = container.querySelector('[data-variant]');

    expect(line?.children).toHaveLength(2);
    expect(first.parentElement).toBe(line);
    expect(second.parentElement).toBe(line);
  });

  it('defaults to the meta variant', () => {
    render(
      <SummaryRowMeta>
        <span>Quiet line</span>
      </SummaryRowMeta>
    );

    expect(screen.getByText('Quiet line').parentElement?.getAttribute('data-variant')).toBe('meta');
  });

  it('accepts a detail variant', () => {
    render(
      <SummaryRowMeta variant="detail">
        <span>Body-size line</span>
      </SummaryRowMeta>
    );

    expect(screen.getByText('Body-size line').parentElement?.getAttribute('data-variant')).toBe('detail');
  });
});
