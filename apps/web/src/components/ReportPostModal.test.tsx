import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import ReportPostModal from './ReportPostModal';

function getDetails() {
  return screen.getByLabelText('Additional details (optional)') as HTMLTextAreaElement;
}

function getSubmit() {
  return screen.getByRole('button', { name: 'Submit report' }) as HTMLButtonElement;
}

describe('ReportPostModal', () => {
  it('submits the selected reason with trimmed details, then closes', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    render(<ReportPostModal opened onClose={onClose} onSubmit={onSubmit} />);

    expect(getSubmit().disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Scam or fraud'));
    fireEvent.change(getDetails(), { target: { value: '  Asked for a deposit  ' } });
    fireEvent.click(getSubmit());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ reason: 'Scam', description: 'Asked for a deposit' });
  });

  it('shows the submit error and stays open', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: 'Already reported' });
    const onClose = vi.fn();
    render(<ReportPostModal opened onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByLabelText('Spam'));
    fireEvent.click(getSubmit());

    expect((await screen.findByRole('alert')).textContent).toBe('Already reported');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clears the previous reason, details and error when reopened', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: 'Already reported' });
    const onClose = vi.fn();
    const { rerender } = render(<ReportPostModal opened onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByLabelText('Spam'));
    fireEvent.change(getDetails(), { target: { value: 'Old details' } });
    fireEvent.click(getSubmit());
    await screen.findByRole('alert');

    rerender(<ReportPostModal opened={false} onClose={onClose} onSubmit={onSubmit} />);
    rerender(<ReportPostModal opened onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(getDetails().value).toBe('');
    expect((screen.getByLabelText('Spam') as HTMLInputElement).checked).toBe(false);
    expect(getSubmit().disabled).toBe(true);
  });
});
