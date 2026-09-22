import type { FocusEvent } from 'react';
import styles from './scrollingTabs.module.css';

/**
 * Mantine `Tabs` classNames for a tab row that scrolls sideways instead of
 * wrapping on narrow screens. Pass as `<Tabs classNames={scrollingTabsClassNames}>`
 * (spread it to add more slots), and give every `Tabs.Tab`
 * `onFocus={scrollFocusedTabIntoView}`. See scrollingTabs.module.css.
 */
export const scrollingTabsClassNames: { list: string; tab: string } = {
  list: styles.list,
  tab: styles.tab,
};

/**
 * `onFocus` for each `Tabs.Tab` in a scrolling row. Chromium's focus scroll
 * skips a tab that is only partly clipped by the scroller, so arrowing onto
 * one would leave it half hidden.
 */
export function scrollFocusedTabIntoView(event: FocusEvent<HTMLElement>): void {
  event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
