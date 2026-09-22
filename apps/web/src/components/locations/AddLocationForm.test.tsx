import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  searchMetroAreasMock: vi.fn(),
  getMetroByZipMock: vi.fn(),
  isValidZipCodeMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    searchMetroAreas: mocks.searchMetroAreasMock,
    getMetroByZip: mocks.getMetroByZipMock,
    isValidZipCode: mocks.isValidZipCodeMock,
    SUGGESTED_LOCATION_LABELS: ['Home', 'Work', 'Family'],
  };
});

import { AddLocationForm } from './AddLocationForm';

describe('AddLocationForm', () => {
  const onSave = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isValidZipCodeMock.mockReturnValue(false);
    onSave.mockResolvedValue({});
  });

  function renderForm(usedLabels: string[] = ['home']) {
    return render(<AddLocationForm usedLabels={usedLabels} onSave={onSave} onClose={onClose} />);
  }

  it('shows the search field', () => {
    renderForm();
    expect(screen.getByLabelText('Search by metro name or ZIP code')).toBeDefined();
  });

  it('searches metro areas as the user types', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ data: [{ id: '41940', name: 'San Jose', state: 'CA' }] });
    renderForm();
    fireEvent.change(screen.getByLabelText('Search by metro name or ZIP code'), { target: { value: 'San Jo' } });
    await waitFor(() => expect(screen.getByText('San Jose, CA')).toBeDefined());
  });

  it('looks up by ZIP code when the query is a valid ZIP', async () => {
    mocks.isValidZipCodeMock.mockReturnValue(true);
    mocks.getMetroByZipMock.mockResolvedValue({ data: { id: '19100', name: 'Dallas', state: 'TX' } });
    renderForm();
    fireEvent.change(screen.getByLabelText('Search by metro name or ZIP code'), { target: { value: '75001' } });
    await waitFor(() => expect(screen.getByText('Dallas, TX')).toBeDefined());
    expect(mocks.searchMetroAreasMock).not.toHaveBeenCalled();
  });

  it('ignores a stale search response that resolves after a newer one', async () => {
    let resolveFirst: (value: { data: { id: string; name: string; state: string }[] }) => void = () => {};
    mocks.searchMetroAreasMock
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ data: [{ id: 'bos', name: 'Boston', state: 'MA' }] });

    renderForm();
    const input = screen.getByLabelText('Search by metro name or ZIP code');
    fireEvent.change(input, { target: { value: 'Bo' } });
    fireEvent.change(input, { target: { value: 'Bos' } });
    await act(async () => {});

    expect(screen.getByText('Boston, MA')).toBeDefined();

    await act(async () => {
      resolveFirst({ data: [{ id: 'bal', name: 'Baltimore', state: 'MD' }] });
    });

    expect(screen.queryByText('Baltimore, MD')).toBeNull();
    expect(screen.getByText('Boston, MA')).toBeDefined();
  });

  it('shows an inline message when the search fails', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ error: new Error('network down') });
    renderForm();
    fireEvent.change(screen.getByLabelText('Search by metro name or ZIP code'), { target: { value: 'Bos' } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/something went wrong/i));
  });

  it('shows "No metros match" for a query with no results', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ data: [] });
    renderForm();
    fireEvent.change(screen.getByLabelText('Search by metro name or ZIP code'), { target: { value: 'Zzz' } });
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/no metros match/i));
  });

  it('shows the name field and suggestion chips after selecting a metro', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ data: [{ id: '41940', name: 'San Jose', state: 'CA' }] });
    renderForm();
    fireEvent.change(screen.getByLabelText('Search by metro name or ZIP code'), { target: { value: 'San Jo' } });
    await waitFor(() => expect(screen.getByText('San Jose, CA')).toBeDefined());
    fireEvent.click(screen.getByText('San Jose, CA'));

    expect(await screen.findByLabelText('Name this location')).toBeDefined();
    expect(screen.getByText('Work')).toBeDefined(); // suggestion chip; 'Home' already used
  });

  async function selectMetro() {
    mocks.searchMetroAreasMock.mockResolvedValue({ data: [{ id: '41940', name: 'San Jose', state: 'CA' }] });
    fireEvent.change(screen.getByLabelText('Search by metro name or ZIP code'), { target: { value: 'San' } });
    await waitFor(() => expect(screen.getByText('San Jose, CA')).toBeDefined());
    fireEvent.click(screen.getByText('San Jose, CA'));
    await screen.findByLabelText('Name this location');
  }

  it('shows an error for a duplicate label and never calls onSave', async () => {
    renderForm();
    await selectMetro();
    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Home' } });
    fireEvent.click(screen.getByText('Save Location'));

    await waitFor(() => {
      expect(screen.getByText('You already have a location named "Home".')).toBeDefined();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with the metro and trimmed label, then onClose on success', async () => {
    renderForm();
    await selectMetro();
    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Family' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Location'));
    });

    expect(onSave).toHaveBeenCalledWith({ id: '41940', name: 'San Jose', state: 'CA' }, 'Family');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the error message and does not close when onSave fails', async () => {
    onSave.mockResolvedValue({ error: new Error("That name didn't save.") });
    renderForm();
    await selectMetro();
    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Family' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Location'));
    });

    expect(screen.getByText("That name didn't save.")).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose without onSave when Cancel is clicked', async () => {
    renderForm();
    await selectMetro();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('disables Save Location while the name is empty', async () => {
    renderForm();
    await selectMetro();
    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: '' } });
    expect((screen.getByText('Save Location').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
