import { describe, expect, it, vi } from 'vitest';
import { notify } from './notify';

// vi.hoisted, as the other web suites do, so the spy is created before the
// hoisted vi.mock factory rather than relying on it only being read at call time.
const { show } = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('@mantine/notifications', () => ({ notifications: { show } }));

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
