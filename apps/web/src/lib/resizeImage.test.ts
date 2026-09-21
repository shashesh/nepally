import { afterEach, describe, expect, it, vi } from 'vitest';
import { JPEG_QUALITY, MAX_IMAGE_WIDTH_PX, resizeImage } from './resizeImage';

type CanvasStub = {
  canvases: HTMLCanvasElement[];
  drawImage: ReturnType<typeof vi.fn>;
  toBlob: ReturnType<typeof vi.fn>;
};

/**
 * jsdom has no canvas rendering context and no createImageBitmap, so both are
 * stubbed. The stub keeps the real element, which is what carries the width
 * and height the function sets.
 */
function stubCanvas(options: { context?: boolean; blob?: Blob | null } = {}): CanvasStub {
  const { context = true, blob = new Blob(['jpeg'], { type: 'image/jpeg' }) } = options;
  const drawImage = vi.fn();
  const toBlob = vi.fn((callback: BlobCallback) => callback(blob));
  const canvases: HTMLCanvasElement[] = [];
  const createElement = document.createElement.bind(document);

  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    const element = createElement(tag);
    if (tag === 'canvas') {
      const canvas = element as HTMLCanvasElement;
      canvas.getContext = vi.fn(() => (context ? ({ drawImage } as unknown as CanvasRenderingContext2D) : null)) as never;
      canvas.toBlob = toBlob as never;
      canvases.push(canvas);
    }
    return element;
  }) as never);

  return { canvases, drawImage, toBlob };
}

function stubBitmap(width: number, height: number) {
  const close = vi.fn();
  globalThis.createImageBitmap = vi.fn(async () => ({ width, height, close })) as never;
  return { close };
}

function makeFile(name: string, type = 'image/png'): File {
  return new File(['x'], name, { type });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resizeImage', () => {
  it('scales an oversized image down to the maximum width, keeping its shape', async () => {
    const { canvases } = stubCanvas();
    stubBitmap(2400, 1600);

    await resizeImage(makeFile('wide.png'));

    expect(canvases[0].width).toBe(MAX_IMAGE_WIDTH_PX);
    expect(canvases[0].height).toBe(800);
  });

  it('leaves an image narrower than the maximum at its own size', async () => {
    const { canvases } = stubCanvas();
    stubBitmap(600, 400);

    await resizeImage(makeFile('small.png'));

    expect(canvases[0].width).toBe(600);
    expect(canvases[0].height).toBe(400);
  });

  it('returns a JPEG that keeps the original file name', async () => {
    stubCanvas();
    stubBitmap(800, 600);

    const result = await resizeImage(makeFile('holiday.png'));

    expect(result.name).toBe('holiday.png');
    expect(result.type).toBe('image/jpeg');
  });

  it('releases the bitmap it decoded', async () => {
    stubCanvas();
    const { close } = stubBitmap(800, 600);

    await resizeImage(makeFile('holiday.png'));

    expect(close).toHaveBeenCalled();
  });

  it('encodes at the agreed quality', async () => {
    const { toBlob } = stubCanvas();
    stubBitmap(800, 600);

    await resizeImage(makeFile('holiday.png'));

    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', JPEG_QUALITY);
  });

  it('rejects when the browser gives no 2D context', async () => {
    stubCanvas({ context: false });
    stubBitmap(800, 600);

    await expect(resizeImage(makeFile('holiday.png'))).rejects.toThrow(/canvas/i);
  });

  it('rejects when the canvas produces no blob', async () => {
    stubCanvas({ blob: null });
    stubBitmap(800, 600);

    await expect(resizeImage(makeFile('holiday.png'))).rejects.toThrow(/process/i);
  });
});
