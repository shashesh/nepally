import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const zipMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  isValidZipCodeMock: vi.fn(),
  cleanZipCodeMock: vi.fn(),
  getMetroByZipMock: vi.fn(),
  updateUserLocationMock: vi.fn(),
  addSavedLocationMock: vi.fn(),
  detectLocationMetroMock: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: zipMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: zipMocks.useRouterMock }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../lib/location', () => ({ detectLocationMetro: zipMocks.detectLocationMetroMock }));
vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    isValidZipCode: zipMocks.isValidZipCodeMock,
    cleanZipCode: zipMocks.cleanZipCodeMock,
    getMetroByZip: zipMocks.getMetroByZipMock,
    updateUserLocation: zipMocks.updateUserLocationMock,
    addSavedLocation: zipMocks.addSavedLocationMock,
  };
});
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import ZipCodePage from './zip';

describe('ZipCodePage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockRefreshUser = vi.fn();
  const mockUser = { id: 'user-1', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    zipMocks.useRouterMock.mockReturnValue({ push: mockPush, replace: mockReplace });
    zipMocks.useAuthMock.mockReturnValue({ user: mockUser, refreshUser: mockRefreshUser });
    zipMocks.cleanZipCodeMock.mockImplementation((v: string) => v);
    zipMocks.isValidZipCodeMock.mockReturnValue(true);
  });

  it('redirects to /login when user is not logged in', () => {
    zipMocks.useAuthMock.mockReturnValue({ user: null, refreshUser: mockRefreshUser });
    render(<ZipCodePage />);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('renders the ZIP entry form', () => {
    render(<ZipCodePage />);
    expect(screen.getByText('Where are you?')).toBeDefined();
    expect(screen.getByLabelText('ZIP Code')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Find My Area' })).toBeDefined();
    expect(screen.getByRole('button', { name: '📍 Detect My Location' })).toBeDefined();
  });

  it('shows error when ZIP code is invalid', async () => {
    zipMocks.isValidZipCodeMock.mockReturnValue(false);
    render(<ZipCodePage />);
    const input = screen.getByLabelText('ZIP Code');
    fireEvent.change(input, { target: { value: '99999' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Find My Area' }));
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid 5-digit ZIP code.')).toBeDefined();
    });
  });

  it('shows error when ZIP code is not found in the database', async () => {
    zipMocks.getMetroByZipMock.mockResolvedValue({ error: new Error('not found'), data: null });
    render(<ZipCodePage />);
    const input = screen.getByLabelText('ZIP Code');
    fireEvent.change(input, { target: { value: '10001' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Find My Area' }));
    await waitFor(() => {
      expect(screen.getByText('ZIP code not found. Please double-check and try again.')).toBeDefined();
    });
  });

  it('advances to confirm step when metro is found', async () => {
    zipMocks.getMetroByZipMock.mockResolvedValue({
      data: { id: '35620', name: 'New York-Newark-Jersey City', state: 'NY' },
      error: null,
    });
    render(<ZipCodePage />);
    const input = screen.getByLabelText('ZIP Code');
    fireEvent.change(input, { target: { value: '10001' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Find My Area' }));
    await waitFor(() => {
      expect(screen.getByText('Confirm Your Area')).toBeDefined();
      expect(screen.getByText('New York-Newark-Jersey City, NY')).toBeDefined();
    });
  });

  it('allows going back to ZIP entry from confirm step', async () => {
    zipMocks.getMetroByZipMock.mockResolvedValue({
      data: { id: '35620', name: 'New York', state: 'NY' },
      error: null,
    });
    render(<ZipCodePage />);
    fireEvent.change(screen.getByLabelText('ZIP Code'), { target: { value: '10001' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Find My Area' }));
    await waitFor(() => expect(screen.getByText('Change ZIP')).toBeDefined());
    fireEvent.click(screen.getByText('Change ZIP'));
    await waitFor(() => expect(screen.getByText('Where are you?')).toBeDefined());
  });

  it('saves location and redirects to /feed on confirm', async () => {
    zipMocks.getMetroByZipMock.mockResolvedValue({
      data: { id: '35620', name: 'New York', state: 'NY' },
      error: null,
    });
    zipMocks.updateUserLocationMock.mockResolvedValue({ error: null });
    zipMocks.addSavedLocationMock.mockResolvedValue({ error: null });
    mockRefreshUser.mockResolvedValue(undefined);

    render(<ZipCodePage />);
    fireEvent.change(screen.getByLabelText('ZIP Code'), { target: { value: '10001' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Find My Area' }));
    await waitFor(() => expect(screen.getByText('Confirm & Continue')).toBeDefined());
    fireEvent.click(screen.getByText('Confirm & Continue'));
    await waitFor(() => {
      expect(zipMocks.updateUserLocationMock).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/feed');
    });
  });

  it('shows error when location save fails', async () => {
    zipMocks.getMetroByZipMock.mockResolvedValue({
      data: { id: '35620', name: 'New York', state: 'NY' },
      error: null,
    });
    zipMocks.updateUserLocationMock.mockResolvedValue({ error: new Error('DB error') });
    render(<ZipCodePage />);
    fireEvent.change(screen.getByLabelText('ZIP Code'), { target: { value: '10001' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Find My Area' }));
    await waitFor(() => expect(screen.getByText('Confirm & Continue')).toBeDefined());
    fireEvent.click(screen.getByText('Confirm & Continue'));
    await waitFor(() => {
      expect(screen.getByText('Failed to save location. Please try again.')).toBeDefined();
    });
  });

  it('advances to confirm via detect location', async () => {
    zipMocks.detectLocationMetroMock.mockResolvedValue({
      metro_area_id: '19100',
      metro_name: 'Dallas',
      metro_state: 'TX',
      zip_code: '75001',
      source: 'gps',
    });
    render(<ZipCodePage />);
    fireEvent.click(screen.getByRole('button', { name: '📍 Detect My Location' }));
    await waitFor(() => {
      expect(screen.getByText('Dallas, TX')).toBeDefined();
    });
  });

  it('shows error when location detection fails', async () => {
    zipMocks.detectLocationMetroMock.mockResolvedValue(null);
    render(<ZipCodePage />);
    fireEvent.click(screen.getByRole('button', { name: '📍 Detect My Location' }));
    await waitFor(() => {
      expect(screen.getByText("Couldn't detect your location. Please enter your ZIP code instead.")).toBeDefined();
    });
  });
});
