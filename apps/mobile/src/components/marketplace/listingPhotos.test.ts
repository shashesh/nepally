import {
  makeCover,
  photoKeys,
  photoUrlsInOrder,
  pickedPhotos,
  removePhoto,
  type ListingPhoto,
  type PickedListingPhoto,
} from './listingPhotos';

const stored = (url: string): ListingPhoto => ({ kind: 'stored', key: url, url });
const picked = (uri: string): PickedListingPhoto => ({
  kind: 'picked',
  key: uri,
  uri,
  fileData: new ArrayBuffer(4),
  mimeType: 'image/jpeg',
  sizeBytes: 4,
});

describe('listing photo helpers', () => {
  const photos = [stored('https://x/a.jpg'), picked('file:///b.jpg'), stored('https://x/c.jpg')];

  it('moves a photo to the front to make it the cover', () => {
    expect(photoKeys(makeCover(photos, 'https://x/c.jpg'))).toEqual([
      'https://x/c.jpg',
      'https://x/a.jpg',
      'file:///b.jpg',
    ]);
  });

  it('leaves the list alone for an unknown key or the current cover', () => {
    expect(makeCover(photos, 'nope')).toBe(photos);
    expect(makeCover(photos, 'https://x/a.jpg')).toBe(photos);
  });

  it('removes a photo by key', () => {
    expect(photoKeys(removePhoto(photos, 'file:///b.jpg'))).toEqual([
      'https://x/a.jpg',
      'https://x/c.jpg',
    ]);
  });

  it('lists only the picked photos, in display order', () => {
    const list = [picked('file:///1.jpg'), stored('https://x/a.jpg'), picked('file:///2.jpg')];
    expect(pickedPhotos(list).map((p) => p.uri)).toEqual(['file:///1.jpg', 'file:///2.jpg']);
  });

  it('puts the uploaded URLs where their picked photos sit', () => {
    const list = [picked('file:///1.jpg'), stored('https://x/a.jpg'), picked('file:///2.jpg')];
    expect(photoUrlsInOrder(list, ['https://x/up1.jpg', 'https://x/up2.jpg'])).toEqual([
      'https://x/up1.jpg',
      'https://x/a.jpg',
      'https://x/up2.jpg',
    ]);
  });
});
