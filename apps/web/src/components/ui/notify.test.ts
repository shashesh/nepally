import { describe, expect, it, vi } from 'vitest';
import { notify } from './notify';

const show = vi.fn();
vi.mock('@mantine/notifications', () => ({ notifications: { show: (...args: unknown[]) => show(...args) } }));

describe('notify', () => {
  it('shows a green success toast', () => {
    notify.success('Link copied to clipboard');
    expect(show).toHaveBeenCalledWith({ message: 'Link copied to clipboard', color: 'green', autoClose: 2500 });
  });

  it('shows a red error toast that stays longer', () => {
    notify.error('Failed to delete post. Please try again.');
    expect(show).toHaveBeenCalledWith({
      message: 'Failed to delete post. Please try again.',
      color: 'red',
      autoClose: 5000,
    });
  });
});
