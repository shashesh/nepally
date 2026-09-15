import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ActionMenu } from './ActionMenu';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

describe('ActionMenu', () => {
  const items = [
    { key: 'report', label: 'Report', onClick: vi.fn() },
    { key: 'profile', label: 'View profile', href: '/users/u1' },
    { key: 'delete', label: 'Delete', onClick: vi.fn(), danger: true },
  ];

  it('opens from a labelled trigger and lists menu items', async () => {
    render(<ActionMenu label="Post options" items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    await waitFor(() => expect(screen.getAllByRole('menuitem')).toHaveLength(3));
  });

  it('runs the item action', async () => {
    render(<ActionMenu label="Post options" items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Report' }));
    expect(items[0].onClick).toHaveBeenCalledTimes(1);
  });

  it('renders link items as links', async () => {
    render(<ActionMenu label="Post options" items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    const link = await screen.findByRole('menuitem', { name: 'View profile' });
    expect(link.getAttribute('href')).toBe('/users/u1');
  });

  it('closes on Escape', async () => {
    render(<ActionMenu label="Post options" items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    const menu = await screen.findByRole('menu');
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('renders a disabled link item as a disabled button without an href', async () => {
    render(<ActionMenu label="Post options" items={[{ key: 'profile', label: 'View profile', href: '/users/u1', disabled: true }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    const item = await screen.findByRole('menuitem', { name: 'View profile' });
    expect(item.getAttribute('href')).toBeNull();
    expect((item as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not run a disabled item action', async () => {
    const onClick = vi.fn();
    render(<ActionMenu label="Post options" items={[{ key: 'report', label: 'Report', onClick, disabled: true }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Report' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
