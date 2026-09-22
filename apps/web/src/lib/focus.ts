/**
 * Focus has nowhere useful to be: on `<body>` (nothing is focused), or still
 * inside a modal that is in the middle of closing.
 *
 * Mantine's `useFocusReturn` restores focus with a `setTimeout`, and
 * `ModalsProvider` keeps the modal mounted for its exit transition (~200ms).
 * When an action inside a confirm modal (e.g. deleting a row) resolves
 * quickly, the row it was about to focus can unmount while focus is still on
 * the dialog's own button — checking only `activeElement === document.body`
 * misses that window, so effects that "reclaim" focus must treat a focused
 * element still inside a closing modal the same as focus already having been
 * lost.
 *
 * `[aria-modal="true"]` specifically, not `role="dialog"`: Mantine's Popover
 * dropdowns (e.g. LocationSwitcher) also render with `role="dialog"` but are
 * not modal, and must not be treated as "closing" while a member is using one.
 */
export function isFocusStranded(): boolean {
  const active = document.activeElement;
  return !active || active === document.body || active.closest('[aria-modal="true"]') !== null;
}
