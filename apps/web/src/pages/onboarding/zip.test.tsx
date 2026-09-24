import React from 'react';
import { render, screen, fireEvent, act } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const zipMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getMetroByZipMock: vi.fn(),
  updateUserLocationMock: vi.fn(),
  addSavedLocationMock: vi.fn(),
  detectLocationMetroMock: vi.fn(),
  logClientEventMock: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: zipMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: zipMocks.useRouterMock }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../lib/location', () => ({ detectLocationMetro: zipMocks.detectLocationMetroMock }));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getMetroByZip: zipMocks.getMetroByZipMock,
    updateUserLocation: zipMocks.updateUserLocationMock,
    addSavedLocation: zipMocks.addSavedLocationMock,
    logClientEvent: zipMocks.logClientEventMock,
  };
});
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import ZipCodePage from './zip.page';

const NEW_YORK = { id: '35620', name: 'New York-Newark-Jersey City', state: 'NY' };

/** The text of every element an element's aria-describedby points at. */
function descriptionOf(element: HTMLElement): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

const zipField = () => screen.getByRole('textbox', { name: 'ZIP code' });
const findButton = () => screen.getByRole('button', { name: 'Find my area' });
const detectButton = () => screen.getByRole('button', { name: 'Detect my location' });
const confirmButton = () => screen.getByRole('button', { name: 'Confirm and continue' });

async function lookUp(zip: string) {
  fireEvent.change(zipField(), { target: { value: zip } });
  await act(async () => {
    fireEvent.click(findButton());
  });
}

async function reachConfirmStep() {
  zipMocks.getMetroByZipMock.mockResolvedValue({ data: NEW_YORK, error: null });
  await lookUp('10001');
}

describe('ZipCodePage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockRefreshUser = vi.fn();
  const mockUser = { id: 'user-1', email: 'test@example.com', metro_area_id: null };

  beforeEach(() => {
    vi.clearAllMocks();
    zipMocks.useRouterMock.mockReturnValue({ push: mockPush, replace: mockReplace });
    zipMocks.useAuthMock.mockReturnValue({ user: mockUser, refreshUser: mockRefreshUser });
    zipMocks.updateUserLocationMock.mockResolvedValue({ error: null });
    zipMocks.addSavedLocationMock.mockResolvedValue({ error: null });
    mockRefreshUser.mockResolvedValue(undefined);
  });

  it('sends a signed-out visitor to /login from an effect', async () => {
    zipMocks.useAuthMock.mockReturnValue({ user: null, refreshUser: mockRefreshUser });
    render(<ZipCodePage />);
    await act(async () => {});
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/login');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('sends a member who already has a metro to /feed from an effect', async () => {
    zipMocks.useAuthMock.mockReturnValue({
      user: { ...mockUser, metro_area_id: '35620' },
      refreshUser: mockRefreshUser,
    });
    render(<ZipCodePage />);
    await act(async () => {});
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/feed');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('renders the ZIP step', () => {
    render(<ZipCodePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Where are you?' })).toBeDefined();
    expect(zipField().getAttribute('inputmode')).toBe('numeric');
    expect(zipField().getAttribute('autocomplete')).toBe('postal-code');
    expect(detectButton()).toBeDefined();
  });

  it('keeps Find my area enabled with an incomplete ZIP', () => {
    render(<ZipCodePage />);
    fireEvent.change(zipField(), { target: { value: '123' } });
    expect((findButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('keeps only digits in the ZIP field', () => {
    render(<ZipCodePage />);
    fireEvent.change(zipField(), { target: { value: '1a2-3' } });
    expect((zipField() as HTMLInputElement).value).toBe('123');
  });

  it('shows the five-digit error on the field and focuses it', async () => {
    render(<ZipCodePage />);
    await lookUp('123');
    expect(zipField().getAttribute('aria-invalid')).toBe('true');
    expect(descriptionOf(zipField())).toContain('Please enter a valid 5-digit ZIP code.');
    expect(document.activeElement).toBe(zipField());
    expect(zipMocks.getMetroByZipMock).not.toHaveBeenCalled();
  });

  it('clears the five-digit error once the ZIP is complete', async () => {
    render(<ZipCodePage />);
    await lookUp('123');
    fireEvent.change(zipField(), { target: { value: '12345' } });
    expect(zipField().getAttribute('aria-invalid')).not.toBe('true');
  });

  it('shows an unknown ZIP on the field', async () => {
    zipMocks.getMetroByZipMock.mockResolvedValue({ error: new Error('not found'), data: null });
    render(<ZipCodePage />);
    await lookUp('10001');
    expect(descriptionOf(zipField())).toContain('ZIP code not found. Please double-check and try again.');
  });

  it('moves to the confirm step and focuses its heading', async () => {
    render(<ZipCodePage />);
    await reachConfirmStep();
    const heading = screen.getByRole('heading', { level: 1, name: 'Confirm your area' });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByText('New York-Newark-Jersey City, NY')).toBeDefined();
  });

  it('goes back with Change ZIP and focuses the ZIP step heading', async () => {
    render(<ZipCodePage />);
    await reachConfirmStep();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Change ZIP' }));
    });
    const heading = screen.getByRole('heading', { level: 1, name: 'Where are you?' });
    expect(document.activeElement).toBe(heading);
    expect((zipField() as HTMLInputElement).value).toBe('10001');
  });

  it('saves the location, adds Home and goes to /feed', async () => {
    render(<ZipCodePage />);
    await reachConfirmStep();
    await act(async () => {
      fireEvent.click(confirmButton());
    });
    expect(zipMocks.updateUserLocationMock).toHaveBeenCalledWith({}, 'user-1', '10001', '35620');
    expect(zipMocks.addSavedLocationMock).toHaveBeenCalledWith({}, 'user-1', '35620', 'Home', '10001', true);
    expect(mockRefreshUser).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/feed');
  });

  it('does not redirect on its own while its confirm completes', async () => {
    const { rerender } = render(<ZipCodePage />);
    await reachConfirmStep();
    await act(async () => {
      fireEvent.click(confirmButton());
    });
    zipMocks.useAuthMock.mockReturnValue({
      user: { ...mockUser, metro_area_id: '35620' },
      refreshUser: mockRefreshUser,
    });
    rerender(<ZipCodePage />);
    await act(async () => {});
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('still goes to /feed when adding Home fails, and logs it', async () => {
    zipMocks.addSavedLocationMock.mockResolvedValue({ error: new Error('insert failed') });
    render(<ZipCodePage />);
    await reachConfirmStep();
    await act(async () => {
      fireEvent.click(confirmButton());
    });
    expect(mockPush).toHaveBeenCalledWith('/feed');
    expect(zipMocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'onboarding_home_location_failed' })
    );
  });

  it('keeps Confirm focusable and aria-disabled while it saves', async () => {
    zipMocks.updateUserLocationMock.mockImplementation(() => new Promise(() => {}));
    render(<ZipCodePage />);
    await reachConfirmStep();
    await act(async () => {
      fireEvent.click(confirmButton());
    });
    const button = confirmButton();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(false);
    await act(async () => {
      fireEvent.click(button);
    });
    expect(zipMocks.updateUserLocationMock).toHaveBeenCalledTimes(1);
  });

  it('locks Change ZIP while Confirm saves', async () => {
    zipMocks.updateUserLocationMock.mockImplementation(() => new Promise(() => {}));
    render(<ZipCodePage />);
    await reachConfirmStep();
    await act(async () => {
      fireEvent.click(confirmButton());
    });
    const changeZip = screen.getByRole('button', { name: 'Change ZIP' });
    expect(changeZip.getAttribute('aria-disabled')).toBe('true');
    expect((changeZip as HTMLButtonElement).disabled).toBe(false);
    await act(async () => {
      fireEvent.click(changeZip);
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Confirm your area' })).toBeDefined();
  });

  it('shows an alert when saving the location fails', async () => {
    zipMocks.updateUserLocationMock.mockResolvedValue({ error: new Error('DB error') });
    render(<ZipCodePage />);
    await reachConfirmStep();
    await act(async () => {
      fireEvent.click(confirmButton());
    });
    expect(screen.getByRole('alert').textContent).toContain('Failed to save location. Please try again.');
    expect(confirmButton().getAttribute('aria-disabled')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('moves to the confirm step via Detect my location', async () => {
    zipMocks.detectLocationMetroMock.mockResolvedValue({
      metro_area_id: '19100',
      metro_name: 'Dallas',
      metro_state: 'TX',
      zip_code: '75001',
      source: 'gps',
    });
    render(<ZipCodePage />);
    await act(async () => {
      fireEvent.click(detectButton());
    });
    expect(screen.getByText('Dallas, TX')).toBeDefined();
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Confirm your area' }));
  });

  it('shows an alert when location detection fails', async () => {
    zipMocks.detectLocationMetroMock.mockResolvedValue(null);
    render(<ZipCodePage />);
    await act(async () => {
      fireEvent.click(detectButton());
    });
    expect(screen.getByRole('alert').textContent).toContain(
      "Couldn't detect your location. Please enter your ZIP code instead."
    );
  });
});
