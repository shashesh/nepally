import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ImageLightbox } from './ImageLightbox';

const photos = ['/p1.jpg', '/p2.jpg', '/p3.jpg'];

describe('ImageLightbox', () => {
  it('renders nothing while closed', () => {
    render(<ImageLightbox photos={photos} opened={false} onClose={vi.fn()} />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens on the photo it was given', () => {
    render(<ImageLightbox photos={photos} startIndex={1} opened onClose={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Post photo 2' })).toBeDefined();
    expect(screen.getByText('Photo 2 of 3')).toBeDefined();
  });

  it('moves with the arrow keys and wraps', () => {
    render(<ImageLightbox photos={photos} opened onClose={vi.fn()} />);

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('Photo 2 of 3')).toBeDefined();

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('Photo 3 of 3')).toBeDefined();
  });

  it('closes from the close button', () => {
    const onClose = vi.fn();
    render(<ImageLightbox photos={photos} opened onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close image viewer' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('zooms in and out, stopping at each end', () => {
    render(<ImageLightbox photos={photos} opened onClose={vi.fn()} />);

    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    const zoomOut = screen.getByRole('button', { name: 'Zoom out' });

    expect(screen.getByText('100%')).toBeDefined();
    expect(zoomOut).toHaveProperty('disabled', true);

    fireEvent.click(zoomIn);
    expect(screen.getByText('125%')).toBeDefined();

    fireEvent.click(zoomOut);
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('hides the paging controls for a single photo', () => {
    render(<ImageLightbox photos={['/only.jpg']} opened onClose={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Next photo' })).toBeNull();
    expect(screen.queryByText(/Photo 1 of/)).toBeNull();
  });
});
