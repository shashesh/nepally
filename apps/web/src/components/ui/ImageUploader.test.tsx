import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '../../test-utils';
import { ImageUploader, type ImageUploaderProps, type UploaderPhoto } from './ImageUploader';

const ONE_MB = 1024 * 1024;

function makeFile(name: string, type = 'image/png', size = 1024): File {
  const file = new File(['x'], name, { type });
  // jsdom sizes a File from its parts; the tests need a size of their choosing.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

type HarnessProps = Partial<ImageUploaderProps> & {
  initial?: UploaderPhoto[];
  onChangeSpy?: (photos: UploaderPhoto[]) => void;
};

/**
 * ImageUploader is controlled, so the tests need something to hold the array.
 * The spy sees every change; the state keeps the rendered list honest.
 */
function Harness({ initial = [], onChangeSpy, ...props }: HarnessProps) {
  const [photos, setPhotos] = useState<UploaderPhoto[]>(initial);

  return (
    <ImageUploader
      photos={photos}
      onChange={(next) => {
        onChangeSpy?.(next);
        setPhotos(next);
      }}
      max={3}
      maxBytes={2 * ONE_MB}
      label="Photos"
      {...props}
    />
  );
}

async function pickFiles(files: File[]) {
  const input = screen.getByLabelText('Add photos');
  await act(async () => {
    fireEvent.change(input, { target: { files } });
  });
}

describe('ImageUploader', () => {
  it('names the group after its label', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Photos' })).toBeDefined();
  });

  it('reports picked files as picked photos, in the order they were chosen', async () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);

    const first = makeFile('one.png');
    const second = makeFile('two.png');
    await pickFiles([first, second]);

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    const next = onChangeSpy.mock.calls[0][0] as UploaderPhoto[];
    expect(next).toHaveLength(2);
    expect(next.every((photo) => photo.kind === 'picked')).toBe(true);
    expect(next.map((photo) => (photo.kind === 'picked' ? photo.file : null))).toEqual([first, second]);
  });

  it('rejects a file larger than maxBytes and keeps the list unchanged', async () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} maxBytes={ONE_MB} />);

    await pickFiles([makeFile('huge.png', 'image/png', 4 * ONE_MB)]);

    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/too large/i)).toBeDefined();
  });

  it('rejects a file whose type is not accepted', async () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} accept={['image/png']} />);

    await pickFiles([makeFile('notes.pdf', 'application/pdf')]);

    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/not a supported image/i)).toBeDefined();
  });

  it('takes only the remaining slots when more files are picked than fit, and says so', async () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} max={2} />);

    await pickFiles([makeFile('one.png'), makeFile('two.png'), makeFile('three.png')]);

    const next = onChangeSpy.mock.calls[0][0] as UploaderPhoto[];
    expect(next).toHaveLength(2);
    expect(screen.getByText(/you can add up to 2 photos/i)).toBeDefined();
  });

  it('removes the photo its button names', async () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);

    await pickFiles([makeFile('one.png'), makeFile('two.png')]);
    onChangeSpy.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 2' }));

    const next = onChangeSpy.mock.calls[0][0] as UploaderPhoto[];
    expect(next).toHaveLength(1);
    expect(next[0].kind === 'picked' && next[0].file.name).toBe('one.png');
  });

  it('counts the photos against the maximum', async () => {
    render(<Harness max={3} />);

    expect(screen.getByText('0/3 photos')).toBeDefined();

    await pickFiles([makeFile('one.png'), makeFile('two.png')]);

    expect(screen.getByText('2/3 photos')).toBeDefined();
  });

  it('renders a stored photo and removes it like any other', () => {
    const onChangeSpy = vi.fn();
    render(
      <Harness
        onChangeSpy={onChangeSpy}
        initial={[{ kind: 'stored', url: 'https://cdn.example.com/a.jpg' }]}
      />
    );

    expect(screen.getByRole('img', { name: 'Photo 1' })).toBeDefined();
    expect(screen.getByText('1/3 photos')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }));

    expect(onChangeSpy).toHaveBeenCalledWith([]);
  });

  it('shows the description and the error it is given', () => {
    render(<Harness description="Optional. JPG, PNG or WEBP." error="Pick at least one photo" />);

    expect(screen.getByText('Optional. JPG, PNG or WEBP.')).toBeDefined();
    expect(screen.getByText('Pick at least one photo')).toBeDefined();
  });

  describe('a single slot', () => {
    const stored: UploaderPhoto = { kind: 'stored', url: 'https://cdn.example.com/a.jpg' };

    it('stays open when it already holds a photo, so it can be replaced', () => {
      render(<Harness max={1} initial={[stored]} />);

      const input = screen.getByLabelText('Replace photos');
      expect(input.hasAttribute('disabled')).toBe(false);
    });

    it('replaces the photo it holds instead of refusing the pick', async () => {
      const onChangeSpy = vi.fn();
      render(<Harness max={1} initial={[stored]} onChangeSpy={onChangeSpy} />);

      const input = screen.getByLabelText('Replace photos');
      await act(async () => {
        fireEvent.change(input, { target: { files: [makeFile('new.png')] } });
      });

      const next = onChangeSpy.mock.calls.at(-1)?.[0] as UploaderPhoto[];
      expect(next).toHaveLength(1);
      expect(next[0].kind).toBe('picked');
      expect(screen.getByText('1/1 photos')).toBeDefined();
    });

    it('still refuses a pick past the cap when there is more than one slot', async () => {
      const onChangeSpy = vi.fn();
      render(
        <Harness
          max={2}
          initial={[stored, { kind: 'stored', url: 'https://cdn.example.com/b.jpg' }]}
          onChangeSpy={onChangeSpy}
        />
      );

      expect(screen.getByLabelText('Add photos').hasAttribute('disabled')).toBe(true);
      expect(onChangeSpy).not.toHaveBeenCalled();
    });
  });

  describe('reordering', () => {
    const two: UploaderPhoto[] = [
      { kind: 'stored', url: 'https://cdn.example.com/a.jpg' },
      { kind: 'stored', url: 'https://cdn.example.com/b.jpg' },
    ];

    it('offers no move buttons unless it is reorderable', () => {
      render(<Harness initial={two} />);

      expect(screen.queryByRole('button', { name: /^Move photo/ })).toBeNull();
    });

    it('offers no move buttons for a single photo', () => {
      render(<Harness reorderable initial={[two[0]]} />);

      expect(screen.queryByRole('button', { name: /^Move photo/ })).toBeNull();
    });

    it('swaps a photo with the one before it', () => {
      const onChangeSpy = vi.fn();
      render(<Harness reorderable initial={two} onChangeSpy={onChangeSpy} />);

      fireEvent.click(screen.getByRole('button', { name: 'Move photo 2 left' }));

      expect(onChangeSpy).toHaveBeenCalledWith([two[1], two[0]]);
    });

    it('swaps a photo with the one after it', () => {
      const onChangeSpy = vi.fn();
      render(<Harness reorderable initial={two} onChangeSpy={onChangeSpy} />);

      fireEvent.click(screen.getByRole('button', { name: 'Move photo 1 right' }));

      expect(onChangeSpy).toHaveBeenCalledWith([two[1], two[0]]);
    });

    it('disables the moves that would fall off either end', () => {
      render(<Harness reorderable initial={two} />);

      expect(screen.getByRole('button', { name: 'Move photo 1 left' }).hasAttribute('disabled')).toBe(true);
      expect(screen.getByRole('button', { name: 'Move photo 2 right' }).hasAttribute('disabled')).toBe(true);
      expect(screen.getByRole('button', { name: 'Move photo 2 left' }).hasAttribute('disabled')).toBe(false);
    });

    it('announces where a moved photo landed', () => {
      render(<Harness reorderable initial={two} />);

      fireEvent.click(screen.getByRole('button', { name: 'Move photo 2 left' }));

      expect(screen.getByText('Photo 2 moved to position 1')).toBeDefined();
    });
  });

  describe('transformFile', () => {
    it('stores what the transform returns, not the file that was picked', async () => {
      const onChangeSpy = vi.fn();
      const resized = makeFile('one-resized.jpg', 'image/jpeg');
      const transformFile = vi.fn().mockResolvedValue(resized);
      render(<Harness onChangeSpy={onChangeSpy} transformFile={transformFile} />);

      const original = makeFile('one.png');
      await pickFiles([original]);

      expect(transformFile).toHaveBeenCalledWith(original);
      const next = onChangeSpy.mock.calls[0][0] as UploaderPhoto[];
      expect(next[0].kind === 'picked' && next[0].file).toBe(resized);
    });

    it('keeps the files that transformed and reports the ones that did not', async () => {
      const onChangeSpy = vi.fn();
      const good = makeFile('good.png');
      const transformFile = vi.fn(async (file: File) => {
        if (file.name === 'bad.png') throw new Error('unreadable');
        return file;
      });
      render(<Harness onChangeSpy={onChangeSpy} transformFile={transformFile} />);

      await pickFiles([good, makeFile('bad.png')]);

      const next = onChangeSpy.mock.calls[0][0] as UploaderPhoto[];
      expect(next).toHaveLength(1);
      expect(next[0].kind === 'picked' && next[0].file).toBe(good);
      expect(screen.getByText(/1 photo could not be processed/i)).toBeDefined();
    });

    it('checks the size of what the transform produced, not what was picked', async () => {
      const onChangeSpy = vi.fn();
      // A camera photo far over the limit that downscales to well under it —
      // the case create listing has always supported.
      const transformFile = vi.fn().mockResolvedValue(makeFile('small.jpg', 'image/jpeg', 200 * 1024));
      render(<Harness onChangeSpy={onChangeSpy} maxBytes={ONE_MB} transformFile={transformFile} />);

      await pickFiles([makeFile('huge.png', 'image/png', 8 * ONE_MB)]);

      expect(transformFile).toHaveBeenCalled();
      expect(onChangeSpy).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/too large/i)).toBeNull();
    });

    it('rejects a file the transform could not bring under the limit', async () => {
      const onChangeSpy = vi.fn();
      const transformFile = vi.fn().mockResolvedValue(makeFile('still-big.jpg', 'image/jpeg', 4 * ONE_MB));
      render(<Harness onChangeSpy={onChangeSpy} maxBytes={ONE_MB} transformFile={transformFile} />);

      await pickFiles([makeFile('huge.png', 'image/png', 8 * ONE_MB)]);

      expect(onChangeSpy).not.toHaveBeenCalled();
      expect(screen.getByText(/too large/i)).toBeDefined();
    });

    it('appends to the list as it stands when the transform finishes, not as it was', async () => {
      const onChangeSpy = vi.fn();
      let release: (file: File) => void = () => {};
      const transformFile = vi.fn(
        () => new Promise<File>((resolve) => { release = resolve; })
      );
      render(
        <Harness
          onChangeSpy={onChangeSpy}
          transformFile={transformFile}
          initial={[{ kind: 'stored', url: 'https://cdn.example.com/a.jpg' }]}
        />
      );

      // Start the drop; the transform stays pending until `release` is called.
      await pickFiles([makeFile('one.png')]);
      expect(transformFile).toHaveBeenCalled();
      expect(onChangeSpy).not.toHaveBeenCalled();

      // Remove the stored photo while the transform is still running.
      fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }));
      expect(onChangeSpy).toHaveBeenLastCalledWith([]);

      await act(async () => {
        release(makeFile('one.png'));
        // Promise.all, then the async continuation in handleDrop.
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // The removal must survive: the picked photo lands alone, not behind the
      // photo the member just took out.
      const next = onChangeSpy.mock.calls.at(-1)?.[0] as UploaderPhoto[];
      expect(next).toHaveLength(1);
      expect(next[0].kind).toBe('picked');
    });

    it('keeps both batches when two drops resolve in the same tick', async () => {
      const onChangeSpy = vi.fn();
      const releases: Array<(file: File) => void> = [];
      const transformFile = vi.fn(
        () => new Promise<File>((resolve) => { releases.push(resolve); })
      );
      render(<Harness onChangeSpy={onChangeSpy} max={3} transformFile={transformFile} />);

      // Two selections, neither transform finished yet.
      await pickFiles([makeFile('one.png')]);
      await pickFiles([makeFile('two.png')]);
      expect(releases).toHaveLength(2);
      expect(onChangeSpy).not.toHaveBeenCalled();

      await act(async () => {
        releases[0](makeFile('one.png'));
        releases[1](makeFile('two.png'));
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Neither batch may overwrite the other.
      const next = onChangeSpy.mock.calls.at(-1)?.[0] as UploaderPhoto[];
      expect(next).toHaveLength(2);
      expect(next.map((photo) => (photo.kind === 'picked' ? photo.file.name : photo.url))).toEqual([
        'one.png',
        'two.png',
      ]);
    });

    it('reports a failure even when nothing survives', async () => {
      const onChangeSpy = vi.fn();
      const transformFile = vi.fn().mockRejectedValue(new Error('unreadable'));
      render(<Harness onChangeSpy={onChangeSpy} transformFile={transformFile} />);

      await pickFiles([makeFile('bad.png')]);

      expect(onChangeSpy).not.toHaveBeenCalled();
      expect(screen.getByText(/1 photo could not be processed/i)).toBeDefined();
    });
  });
});
