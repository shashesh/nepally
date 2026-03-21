import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'placeholder-anon-key';

// jsdom does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = function () {};

// jsdom does not implement matchMedia (required by Mantine)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

afterEach(cleanup);
