import React from 'react';
import { render, screen } from '../test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { AppProps } from 'next/app';

vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'auth-provider' }, children),
}));

vi.mock('../contexts/LocationContext', () => ({
  LocationProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'location-provider' }, children),
}));

vi.mock('../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'layout' }, children),
}));

vi.mock('@mantine/core', () => ({
  MantineProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'mantine-provider' }, children),
}));

vi.mock('@mantine/notifications', () => ({
  Notifications: () => React.createElement('div', { 'data-testid': 'notifications' }),
}));

vi.mock('../styles/mantine-theme', () => ({
  nusaTheme: {},
}));

vi.mock('@mantine/core/styles.css', () => ({}));
vi.mock('@mantine/notifications/styles.css', () => ({}));
vi.mock('../styles/globals.css', () => ({}));

import App from './_app.page';

describe('App', () => {
  it('wraps Component in AuthProvider, LocationProvider, and Layout', () => {
    const TestPage = () => React.createElement('div', { 'data-testid': 'page' }, 'Page content');
    render(
      React.createElement(App, {
        Component: TestPage,
        pageProps: {},
        router: {} as AppProps['router'],
      })
    );
    expect(screen.getAllByTestId('mantine-provider').length).toBeGreaterThan(0);
    expect(screen.getByTestId('auth-provider')).toBeDefined();
    expect(screen.getByTestId('location-provider')).toBeDefined();
    expect(screen.getByTestId('layout')).toBeDefined();
    expect(screen.getByTestId('page')).toBeDefined();
  });

  it('passes pageProps down to the Component', () => {
    const TestPage: React.ComponentType<{ greeting: string }> = ({ greeting }) =>
      React.createElement('span', null, greeting);
    render(
      React.createElement(App, {
        Component: TestPage,
        pageProps: { greeting: 'Hello NUSA' },
        router: {} as AppProps['router'],
      })
    );
    expect(screen.getByText('Hello NUSA')).toBeDefined();
  });
});
