import { describe, expect, it } from 'vitest';
import { pluralize } from './text';

describe('pluralize', () => {
  it('keeps the singular noun for a count of 1', () => {
    expect(pluralize(1, 'like')).toBe('1 like');
  });

  it('pluralises for a count of 0', () => {
    expect(pluralize(0, 'like')).toBe('0 likes');
  });

  it('pluralises for a count greater than 1', () => {
    expect(pluralize(2, 'comment')).toBe('2 comments');
  });

  it('uses an explicit irregular plural', () => {
    expect(pluralize(2, 'person', 'people')).toBe('2 people');
  });

  it('uses the explicit singular for an irregular noun at a count of 1', () => {
    expect(pluralize(1, 'person', 'people')).toBe('1 person');
  });
});
