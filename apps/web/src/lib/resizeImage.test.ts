import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROFILE_PHOTO_SIZE_PX } from '@nepally/shared';
import { JPEG_QUALITY, MAX_IMAGE_WIDTH_PX, PHOTO_MATTE_COLOR, cropToSquare, resizeImage } from './resizeImage';

type StubContext = {
  drawImage: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  fillStyle?: string;
  imageSmoothingQuality?: string;
};

type CanvasStub = {
  canvases: HTMLCanvasElement[];
  contexts: StubContext[];
  drawImage: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  toBlob: ReturnType<typeof vi.fn>;
};

/**
 * jsdom has no canvas rendering context and no createImageBitmap, so both are
 * stubbed. The stub keeps the real element, which is what carries the width
 * and height the function sets, and the context object, which carries the
 * matte/smoothing properties the functions set on it.
 */
function stubCanvas(options: { context?: boolean; blob?: Blob | null } = {}): CanvasStub {
  const { context = true, blob = new Blob(['jpeg'], { type: 'image/jpeg' }) } = options;
  const drawImage = vi.fn();
  const fillRect = vi.fn();
  const toBlob = vi.fn((callback: BlobCallback) => callback(blob));
  const canvases: HTMLCanvasElement[] = [];
  const contexts: StubContext[] = [];
  const createElement = document.createElement.bind(document);

  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    const element = createElement(tag);
    if (tag === 'canvas') {
      const canvas = element as HTMLCanvasElement;
      const ctx: StubContext | null = context ? { drawImage, fillRect } : null;
      if (ctx) contexts.push(ctx);
      canvas.getContext = vi.fn(() => ctx as unknown as CanvasRenderingContext2D | null) as never;
      canvas.toBlob = toBlob as never;
      canvases.push(canvas);
    }
    return element;
  }) as never);

  return { canvases, contexts, drawImage, fillRect, toBlob };
}

function stubBitmap(width: number, height: number) {
  const close = vi.fn();
  const createImageBitmap = vi.fn(async () => ({ width, height, close }));
  globalThis.createImageBitmap = createImageBitmap as never;
  return { close, createImageBitmap };
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

  it('mattes the canvas before drawing, so a transparent source does not turn black', async () => {
    const { contexts, drawImage, fillRect } = stubCanvas();
    stubBitmap(800, 600);

    await resizeImage(makeFile('logo.png'));

    expect(fillRect).toHaveBeenCalledBefore(drawImage);
    expect(fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(contexts[0].fillStyle).toBe(PHOTO_MATTE_COLOR);
  });

  it('requests high-quality smoothing', async () => {
    const { contexts } = stubCanvas();
    stubBitmap(800, 600);

    await resizeImage(makeFile('holiday.png'));

    expect(contexts[0].imageSmoothingQuality).toBe('high');
  });

  it('requests EXIF-corrected orientation from the browser', async () => {
    const { createImageBitmap } = stubBitmap(800, 600);
    stubCanvas();
    const file = makeFile('holiday.png');

    await resizeImage(file);

    expect(createImageBitmap).toHaveBeenCalledWith(file, { imageOrientation: 'from-image' });
  });
});

describe('cropToSquare', () => {
  it('centre-crops a wide image to the largest square, scaled to the target size', async () => {
    const { canvases, drawImage } = stubCanvas();
    stubBitmap(1000, 600);

    await cropToSquare(makeFile('wide.png'));

    expect(canvases[0].width).toBe(PROFILE_PHOTO_SIZE_PX);
    expect(canvases[0].height).toBe(PROFILE_PHOTO_SIZE_PX);
    expect(drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1000, height: 600 }),
      200,
      0,
      600,
      600,
      0,
      0,
      PROFILE_PHOTO_SIZE_PX,
      PROFILE_PHOTO_SIZE_PX
    );
  });

  it('centre-crops a tall image the same way', async () => {
    const { drawImage } = stubCanvas();
    stubBitmap(600, 1000);

    await cropToSquare(makeFile('tall.png'));

    expect(drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ width: 600, height: 1000 }),
      0,
      200,
      600,
      600,
      0,
      0,
      PROFILE_PHOTO_SIZE_PX,
      PROFILE_PHOTO_SIZE_PX
    );
  });

  it('accepts a custom size', async () => {
    const { canvases } = stubCanvas();
    stubBitmap(1000, 600);

    await cropToSquare(makeFile('wide.png'), 80);

    expect(canvases[0].width).toBe(80);
    expect(canvases[0].height).toBe(80);
  });

  it('does not upscale a source smaller than the target size', async () => {
    const { canvases, drawImage } = stubCanvas();
    stubBitmap(100, 100);

    await cropToSquare(makeFile('tiny.png'));

    expect(canvases[0].width).toBe(100);
    expect(canvases[0].height).toBe(100);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 100, 0, 0, 100, 100);
  });

  it('returns a JPEG whose name ends in .jpg, swapping the source extension', async () => {
    stubCanvas();
    stubBitmap(800, 800);

    const result = await cropToSquare(makeFile('avatar.png'));

    expect(result.name).toBe('avatar.jpg');
    expect(result.type).toBe('image/jpeg');
  });

  it('encodes at the agreed quality', async () => {
    const { toBlob } = stubCanvas();
    stubBitmap(800, 800);

    await cropToSquare(makeFile('avatar.png'));

    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', JPEG_QUALITY);
  });

  it('releases the bitmap it decoded', async () => {
    stubCanvas();
    const { close } = stubBitmap(800, 800);

    await cropToSquare(makeFile('avatar.png'));

    expect(close).toHaveBeenCalled();
  });

  it('rejects when the canvas produces no blob', async () => {
    stubCanvas({ blob: null });
    stubBitmap(800, 800);

    await expect(cropToSquare(makeFile('avatar.png'))).rejects.toThrow(/process/i);
  });

  it('releases the bitmap even when the encode fails', async () => {
    stubCanvas({ blob: null });
    const { close } = stubBitmap(800, 800);

    await expect(cropToSquare(makeFile('avatar.png'))).rejects.toThrow(/process/i);

    expect(close).toHaveBeenCalled();
  });

  it('rejects when the browser gives no 2D context', async () => {
    stubCanvas({ context: false });
    stubBitmap(800, 800);

    await expect(cropToSquare(makeFile('avatar.png'))).rejects.toThrow(/canvas/i);
  });

  it('mattes the canvas before drawing, so a transparent source does not turn black', async () => {
    const { contexts, drawImage, fillRect } = stubCanvas();
    stubBitmap(800, 800);

    await cropToSquare(makeFile('logo.png'));

    expect(fillRect).toHaveBeenCalledBefore(drawImage);
    expect(fillRect).toHaveBeenCalledWith(0, 0, PROFILE_PHOTO_SIZE_PX, PROFILE_PHOTO_SIZE_PX);
    expect(contexts[0].fillStyle).toBe(PHOTO_MATTE_COLOR);
  });

  it('requests high-quality smoothing', async () => {
    const { contexts } = stubCanvas();
    stubBitmap(800, 800);

    await cropToSquare(makeFile('avatar.png'));

    expect(contexts[0].imageSmoothingQuality).toBe('high');
  });

  it('requests EXIF-corrected orientation from the browser', async () => {
    const { createImageBitmap } = stubBitmap(800, 800);
    stubCanvas();
    const file = makeFile('avatar.png');

    await cropToSquare(file);

    expect(createImageBitmap).toHaveBeenCalledWith(file, { imageOrientation: 'from-image' });
  });
});
