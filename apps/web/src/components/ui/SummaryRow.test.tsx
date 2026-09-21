import React from 'react';
import { render, screen } from '../../test-utils';
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

  it('renders leading outside the link', () => {
    render(<SummaryRow href="/things/1" title="A thing" leading={<span>Leading content</span>} />);

    const link = screen.getByRole('link', { name: 'A thing' });
    const leading = screen.getByText('Leading content');

    expect(link.contains(leading)).toBe(false);
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

  it('renders one fewer child for a falsy menu, such as isOwn && <ActionMenu />, than for a real one', () => {
    render(<SummaryRow href="/things/1" title="A thing" menu={<button type="button">Options</button>} />);
    expect(screen.getByRole('article').children).toHaveLength(2);
  });

  it('renders no menu slot for a falsy menu', () => {
    render(<SummaryRow href="/things/1" title="A thing" menu={false} />);

    expect(screen.getByRole('article').children).toHaveLength(1);
  });
});

describe('SummaryRowMeta', () => {
  it('renders each item in its own element', () => {
    render(
      <SummaryRowMeta>
        <span>First item</span>
        <span>Second item</span>
      </SummaryRowMeta>
    );

    expect(screen.getByText('First item')).toBeDefined();
    expect(screen.getByText('Second item')).toBeDefined();
  });

  it('defaults to the meta variant', () => {
    render(<SummaryRowMeta>{<span>Quiet line</span>}</SummaryRowMeta>);

    expect(screen.getByText('Quiet line')).toBeDefined();
  });

  it('accepts a detail variant', () => {
    render(<SummaryRowMeta variant="detail">{<span>Body-size line</span>}</SummaryRowMeta>);

    expect(screen.getByText('Body-size line')).toBeDefined();
  });
});
