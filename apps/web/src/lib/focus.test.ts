import { afterEach, describe, expect, it } from 'vitest';
import { isFocusStranded } from './focus';

function appendFocusable(): HTMLButtonElement {
  const button = document.createElement('button');
  document.body.appendChild(button);
  return button;
}

describe('isFocusStranded', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    (document.activeElement as HTMLElement | null)?.blur?.();
  });

  it('is true when nothing is focused (activeElement is body)', () => {
    document.body.focus();
    expect(document.activeElement).toBe(document.body);
    expect(isFocusStranded()).toBe(true);
  });

  it('is false when a normal element outside a modal holds focus', () => {
    const button = appendFocusable();
    button.focus();
    expect(isFocusStranded()).toBe(false);
  });

  it('is true when focus is still inside a closing modal (aria-modal="true")', () => {
    const modal = document.createElement('div');
    modal.setAttribute('aria-modal', 'true');
    const button = document.createElement('button');
    modal.appendChild(button);
    document.body.appendChild(modal);
    button.focus();

    expect(isFocusStranded()).toBe(true);
  });

  it('is false for a button inside a plain role="dialog" that is not aria-modal', () => {
    // Mantine Popover dropdowns (e.g. LocationSwitcher) use role="dialog"
    // without aria-modal, and must not be treated as "closing".
    const dropdown = document.createElement('div');
    dropdown.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dropdown.appendChild(button);
    document.body.appendChild(dropdown);
    button.focus();

    expect(isFocusStranded()).toBe(false);
  });
});
