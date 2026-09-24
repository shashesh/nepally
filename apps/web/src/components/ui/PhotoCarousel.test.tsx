import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PhotoCarousel } from './PhotoCarousel';

const photos = ['/p1.jpg', '/p2.jpg', '/p3.jpg'];

describe('PhotoCarousel', () => {
  it('announces which photo is showing', () => {
    render(<PhotoCarousel photos={photos} alt="Post image" />);

    expect(screen.getByText('Photo 1 of 3')).toBeDefined();
  });

  it('moves to the next photo', () => {
    render(<PhotoCarousel photos={photos} alt="Post image" />);

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));

    expect(screen.getByText('Photo 2 of 3')).toBeDefined();
    expect(screen.getByRole('img', { name: 'Post image 2' })).toBeDefined();
  });

  it('wraps from the first photo back to the last', () => {
    render(<PhotoCarousel photos={photos} alt="Post image" />);

    fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));

    expect(screen.getByText('Photo 3 of 3')).toBeDefined();
  });

  it('moves with the arrow keys', () => {
    render(<PhotoCarousel photos={photos} alt="Post image" onPhotoClick={vi.fn()} />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Open Post image 1' }), { key: 'ArrowRight' });

    expect(screen.getByText('Photo 2 of 3')).toBeDefined();
  });

  it('opens the photo it is showing', () => {
    const onPhotoClick = vi.fn();
    render(<PhotoCarousel photos={photos} alt="Post image" onPhotoClick={onPhotoClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Post image 2' }));

    expect(onPhotoClick).toHaveBeenCalledWith(1);
  });

  it('starts over when it is given a different set of photos', () => {
    const { rerender } = render(<PhotoCarousel photos={photos} alt="Post image" />);

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByRole('img', { name: 'Post image 2' })).toBeDefined();

    rerender(<PhotoCarousel photos={['/x1.jpg', '/x2.jpg']} alt="Post image" />);

    expect(screen.getByText('Photo 1 of 2')).toBeDefined();
    expect(screen.getByRole('img', { name: 'Post image 1' }).getAttribute('src')).toContain('x1.jpg');
  });

  it('loads the first photo with high priority when it is above the fold', () => {
    render(<PhotoCarousel photos={photos} alt="Post image" priority />);

    const image = screen.getByRole('img', { name: 'Post image 1' });
    expect(image.getAttribute('fetchpriority')).toBe('high');
    expect(image.getAttribute('loading')).not.toBe('lazy');
  });

  it('loads photos lazily without priority, and only the first photo takes it', () => {
    const { unmount } = render(<PhotoCarousel photos={photos} alt="Post image" />);
    expect(screen.getByRole('img', { name: 'Post image 1' }).getAttribute('loading')).toBe('lazy');
    unmount();

    render(<PhotoCarousel photos={photos} alt="Post image" priority />);
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    const second = screen.getByRole('img', { name: 'Post image 2' });
    expect(second.getAttribute('fetchpriority')).not.toBe('high');
    expect(second.getAttribute('loading')).toBe('lazy');
  });

  it('leaves the photo inert when it cannot be opened', () => {
    render(<PhotoCarousel photos={['/only.jpg']} alt="Post image" />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/Photo 1 of/)).toBeNull();
  });
});
