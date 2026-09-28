import { gridCardWidth } from './useGridCardWidth';

describe('gridCardWidth', () => {
  it('fits two cards and three gutters in the window width', () => {
    expect(gridCardWidth(390, 12)).toBe(177);
  });

  it('follows the window when it changes size (rotation, iPad Split View)', () => {
    expect(gridCardWidth(1024, 12)).toBe(494);
    expect(gridCardWidth(320, 12)).toBe(142);
  });
});
