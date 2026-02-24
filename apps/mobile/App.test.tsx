import { getButtonTextTransform, getNumericKeyboardType } from './src/utils/platform';

describe('platform utils', () => {
  it('returns a supported button text transform', () => {
    const value = getButtonTextTransform();
    expect(['uppercase', 'none']).toContain(value);
  });

  it('returns a supported numeric keyboard type', () => {
    const value = getNumericKeyboardType();
    expect(['number-pad', 'numeric']).toContain(value);
  });
});
