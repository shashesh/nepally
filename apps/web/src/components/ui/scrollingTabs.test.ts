import type { FocusEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { scrollFocusedTabIntoView, scrollingTabsClassNames } from './scrollingTabs';

describe('scrollingTabs', () => {
  it('scrolls the focused tab itself to the nearest edge on both axes', () => {
    const tab = document.createElement('button');
    const scrollIntoView = vi.fn();
    tab.scrollIntoView = scrollIntoView;

    scrollFocusedTabIntoView({ currentTarget: tab } as unknown as FocusEvent<HTMLElement>);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
  });

  it('provides classNames for the tab list and each tab', () => {
    expect(Object.keys(scrollingTabsClassNames).sort()).toEqual(['list', 'tab']);
  });
});
