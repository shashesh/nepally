import { describe, expect, it } from 'vitest';
import { uniqueChannelTopic } from './realtime';

describe('uniqueChannelTopic', () => {
  it('keeps the base so the topic still says what it is for', () => {
    expect(uniqueChannelTopic('messages:c1').startsWith('messages:c1:')).toBe(true);
  });

  it('never repeats, so a new channel never reuses one that is still leaving', () => {
    const topics = new Set(Array.from({ length: 50 }, () => uniqueChannelTopic('messages:c1')));
    expect(topics.size).toBe(50);
  });
});
