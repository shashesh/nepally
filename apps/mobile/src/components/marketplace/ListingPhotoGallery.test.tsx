import React from 'react';
import { ScrollView } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Galeria } from '@nandorojo/galeria';
import { ListingPhotoGallery } from './ListingPhotoGallery';

// Galeria is jest.setup's stand-in, which renders its children. Jest isn't Expo
// Go, so the gallery loads it; the Expo Go test mocks isExpoGo in its own registry.
// (A top-level jest.mock of isExpoGo would outrank that: Jest reuses a mock it
// has already built.)

const WIDTH = 390;
const photo = (name: string) => `https://cdn.example.com/listing-photos/u/${name}.jpg`;
const PHOTOS = [photo('a'), photo('b'), photo('c')];

function renderGallery(photos: string[] = PHOTOS) {
  return render(<ListingPhotoGallery photos={photos} width={WIDTH} height={250} />);
}

function swipeTo(screen: ReturnType<typeof render>, index: number) {
  const carousel = screen.UNSAFE_getAllByType(ScrollView).find((view) => view.props.pagingEnabled)!;
  fireEvent(carousel, 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { x: index * WIDTH, y: 0 } },
  });
}

describe('ListingPhotoGallery', () => {
  describe('in a development or store build', () => {
    it('opens every photo in the full-screen viewer, in order', () => {
      const screen = renderGallery();

      expect(screen.UNSAFE_getByType(Galeria).props.urls).toEqual(PHOTOS);
      expect(screen.UNSAFE_getAllByType(Galeria.Image).map((image) => image.props.index)).toEqual([
        0, 1, 2,
      ]);
    });

    it('follows the viewer, so closing it lands on the photo last shown', () => {
      const screen = renderGallery();

      act(() => {
        screen.UNSAFE_getAllByType(Galeria.Image)[0].props.onIndexChange({
          nativeEvent: { currentIndex: 2 },
        });
      });

      expect(screen.getByText('3 / 3')).toBeTruthy();
    });
  });

  describe('in Expo Go', () => {
    it('shows the photos without the viewer, which Expo Go lacks', () => {
      // The gallery picks Galeria once, when it loads, so Expo Go needs a fresh
      // module registry: React and the test renderer come from it too, so there's
      // one copy of React.
      jest.isolateModules(() => {
        jest.doMock('../../utils/isExpoGo', () => ({ isExpoGo: true }));
        /* eslint-disable @typescript-eslint/no-require-imports */
        const IsolatedReact: typeof React = require('react');
        const isolated: typeof import('@testing-library/react-native') = require('@testing-library/react-native');
        const IsolatedGaleria: typeof Galeria = require('@nandorojo/galeria').Galeria;
        const Isolated: typeof ListingPhotoGallery = require('./ListingPhotoGallery').ListingPhotoGallery;
        /* eslint-enable @typescript-eslint/no-require-imports */

        const screen = isolated.render(
          IsolatedReact.createElement(Isolated, { photos: PHOTOS, width: WIDTH, height: 250 })
        );

        expect(screen.UNSAFE_queryAllByType(IsolatedGaleria)).toHaveLength(0);
        expect(screen.getAllByLabelText(/^Photo \d of 3$/)).toHaveLength(3);
        screen.unmount();
      });
    });
  });

  it('counts the photo on screen as the member swipes', () => {
    const screen = renderGallery();
    expect(screen.getByText('1 / 3')).toBeTruthy();

    swipeTo(screen, 1);

    expect(screen.getByText('2 / 3')).toBeTruthy();
  });

  it('has no counter for a single photo', () => {
    const screen = renderGallery([photo('a')]);
    expect(screen.queryByText('1 / 1')).toBeNull();
  });

  it('starts over at the first photo when the photos change', () => {
    const screen = renderGallery();
    swipeTo(screen, 2);
    expect(screen.getByText('3 / 3')).toBeTruthy();

    screen.rerender(<ListingPhotoGallery photos={[photo('a'), photo('b')]} width={WIDTH} height={250} />);

    expect(screen.getByText('1 / 2')).toBeTruthy();
  });
});
