import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  searchMetroAreasMock: vi.fn(),
  getMetroByZipMock: vi.fn(),
  isValidZipCodeMock: vi.fn(),
  logClientEventMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    searchMetroAreas: mocks.searchMetroAreasMock,
    getMetroByZip: mocks.getMetroByZipMock,
    isValidZipCode: mocks.isValidZipCodeMock,
    logClientEvent: mocks.logClientEventMock,
    SUGGESTED_LOCATION_LABELS: ['Home', 'Work', 'Family'],
  };
});

import { AddLocationForm } from './AddLocationForm';

describe('AddLocationForm', () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isValidZipCodeMock.mockReturnValue(false);
    onSave.mockResolvedValue({});
  });

  // Belt and suspenders alongside every inline vi.useRealTimers() below: if a
  // test throws between vi.useFakeTimers() and its own restore, fake timers
  // must not leak into whichever test runs next.
  afterEach(() => {
    vi.useRealTimers();
  });

  function renderForm(usedLabels: string[] = ['home']) {
    return render(<AddLocationForm usedLabels={usedLabels} userId="user-1" onSave={onSave} onCancel={onCancel} />);
  }

  /** Types into the search field and advances past the 250ms debounce. */
  async function search(value: string) {
    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByLabelText('Search by metro name or ZIP code'), { target: { value } });
      await act(async () => {
        vi.advanceTimersByTime(250);
      });
    } finally {
      vi.useRealTimers();
    }
  }

  it('shows the search field', () => {
    renderForm();
    expect(screen.getByLabelText('Search by metro name or ZIP code')).toBeDefined();
  });

  it('searches metro areas as the user types, after the debounce', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ data: [{ id: '41940', name: 'San Jose', state: 'CA' }] });
    renderForm();
    await search('San Jo');
    expect(screen.getByText('San Jose, CA')).toBeDefined();
  });

  it('looks up by ZIP code, not by name, when the query is a valid ZIP', async () => {
    mocks.isValidZipCodeMock.mockReturnValue(true);
    mocks.getMetroByZipMock.mockResolvedValue({ data: { id: '19100', name: 'Dallas', state: 'TX' } });
    renderForm();
    await search('75001');
    expect(screen.getByText('Dallas, TX')).toBeDefined();
    expect(mocks.searchMetroAreasMock).not.toHaveBeenCalled();
  });

  it('treats an unknown ZIP as no match, not a failure', async () => {
    mocks.isValidZipCodeMock.mockReturnValue(true);
    mocks.getMetroByZipMock.mockResolvedValue({ error: new Error('ZIP code not found') });
    renderForm();
    await search('99999');

    expect(screen.getByRole('status').textContent).toMatch(/no metros match/i);
    expect(mocks.logClientEventMock).not.toHaveBeenCalled();
  });

  it('ignores a stale search response that resolves after a newer one', async () => {
    const slow = { resolve: (_: unknown) => {} };
    mocks.searchMetroAreasMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            slow.resolve = resolve;
          })
      )
      .mockResolvedValueOnce({ data: [{ id: 'bos', name: 'Boston', state: 'MA' }] });

    renderForm();
    const input = screen.getByLabelText('Search by metro name or ZIP code');
    vi.useFakeTimers();
    try {
      fireEvent.change(input, { target: { value: 'Bo' } });
      await act(async () => {
        vi.advanceTimersByTime(250);
      });
      fireEvent.change(input, { target: { value: 'Bos' } });
      await act(async () => {
        vi.advanceTimersByTime(250);
      });
    } finally {
      vi.useRealTimers();
    }

    expect(screen.getByText('Boston, MA')).toBeDefined();

    await act(async () => {
      slow.resolve({ data: [{ id: 'bal', name: 'Baltimore', state: 'MD' }] });
    });

    expect(screen.queryByText('Baltimore, MD')).toBeNull();
    expect(screen.getByText('Boston, MA')).toBeDefined();
  });

  it('shows an inline message and logs when the search fails', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ error: new Error('network down') });
    renderForm();
    await search('Bos');

    expect(screen.getByRole('status').textContent).toMatch(/something went wrong/i);
    expect(mocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'profile_location_search_failed' })
    );
  });

  it('shows "No metros match" for a query with no results', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ data: [] });
    renderForm();
    await search('Zzz');
    expect(screen.getByRole('status').textContent).toMatch(/no metros match/i);
  });

  it('keeps a single always-mounted status region rather than remounting on every keystroke', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ data: [] });
    renderForm();
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');

    await search('Zzz');
    expect(screen.getByRole('status')).toBe(region); // same node, not a remount
    expect(region.textContent).toMatch(/no metros match/i);
  });

  it('shows the name field and suggestion chips after selecting a metro', async () => {
    mocks.searchMetroAreasMock.mockResolvedValue({ data: [{ id: '41940', name: 'San Jose', state: 'CA' }] });
    renderForm();
    await search('San Jo');
    fireEvent.click(screen.getByRole('button', { name: 'San Jose, CA' }));

    expect(await screen.findByLabelText('Name this location')).toBeDefined();
    expect(screen.getByText('Work')).toBeDefined(); // suggestion chip; 'Home' already used
  });

  async function selectMetro() {
    mocks.searchMetroAreasMock.mockResolvedValue({ data: [{ id: '41940', name: 'San Jose', state: 'CA' }] });
    await search('San');
    fireEvent.click(screen.getByRole('button', { name: 'San Jose, CA' }));
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

  it('calls onSave with the metro and trimmed label; the page (not this form) closes on success', async () => {
    renderForm();
    await selectMetro();
    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Family' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Location'));
    });

    expect(onSave).toHaveBeenCalledWith({ id: '41940', name: 'San Jose', state: 'CA' }, 'Family');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('submits on Enter in the name field', async () => {
    renderForm();
    await selectMetro();
    const nameField = screen.getByLabelText('Name this location');
    fireEvent.change(nameField, { target: { value: 'Family' } });

    await act(async () => {
      fireEvent.submit(nameField.closest('form') as HTMLFormElement);
    });

    expect(onSave).toHaveBeenCalledWith({ id: '41940', name: 'San Jose', state: 'CA' }, 'Family');
  });

  it('shows the message onSave returns and does not close when it fails', async () => {
    onSave.mockResolvedValue({ error: "That name didn't save." });
    renderForm();
    await selectMetro();
    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Family' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Location'));
    });

    expect(screen.getByText("That name didn't save.")).toBeDefined();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('offers Cancel while searching, before a metro is picked', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onCancel without onSave when Cancel is clicked', async () => {
    renderForm();
    await selectMetro();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('disables Save Location while the name is empty', async () => {
    renderForm();
    await selectMetro();
    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: '' } });
    expect((screen.getByText('Save Location').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('stays busy (aria-disabled, not native disabled) on Save while onSave is in flight', async () => {
    let resolveSave: (value: { error?: string | null }) => void = () => {};
    onSave.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderForm();
    await selectMetro();
    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Family' } });
    const saveButton = screen.getByText('Save Location').closest('button') as HTMLButtonElement;
    saveButton.focus();

    fireEvent.click(saveButton);
    await act(async () => {});

    expect(saveButton.disabled).toBe(false);
    expect(saveButton.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(saveButton);

    await act(async () => {
      resolveSave({});
    });
  });

  it('keeps Cancel focusable but inert while onSave is in flight', async () => {
    let resolveSave: (value: { error?: string | null }) => void = () => {};
    onSave.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderForm();
    await selectMetro();
    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Family' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Location' }));
    await act(async () => {});

    const cancelButton = screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement;
    expect(cancelButton.disabled).toBe(false);
    expect(cancelButton.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(cancelButton);
    expect(onCancel).not.toHaveBeenCalled();

    await act(async () => {
      resolveSave({ error: "Couldn't add this location. Please try again." });
    });

    // Once the save settles (here, failing), Cancel works again.
    expect(cancelButton.hasAttribute('aria-disabled')).toBe(false);
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
