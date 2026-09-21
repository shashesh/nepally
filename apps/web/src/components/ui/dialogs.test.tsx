import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, expect, it } from 'vitest';
import { useConfirm, usePrompt } from './dialogs';

function ConfirmHarness() {
  const confirm = useConfirm();
  const [result, setResult] = useState('pending');
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const ok = await confirm({
            title: 'Delete post?',
            message: 'This cannot be undone.',
            confirmLabel: 'Delete',
            danger: true,
          });
          setResult(String(ok));
        }}
      >
        Open confirm
      </button>
      <output>{result}</output>
    </>
  );
}

function PromptHarness() {
  const prompt = usePrompt();
  const [result, setResult] = useState('pending');
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const value = await prompt({
            title: 'Edit name',
            label: 'Full name',
            initialValue: 'Sita',
            validate: (v) => (v.trim().length < 2 ? 'Name is too short' : null),
          });
          setResult(value ?? 'null');
        }}
      >
        Open prompt
      </button>
      <output>{result}</output>
    </>
  );
}

describe('useConfirm', () => {
  it('resolves true when confirmed', async () => {
    render(<ConfirmHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
    expect(await screen.findByText('This cannot be undone.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('true'));
  });

  it('resolves false when cancelled', async () => {
    render(<ConfirmHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('false'));
  });
});

describe('usePrompt', () => {
  it('resolves the submitted value', async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open prompt' }));
    const input = await screen.findByLabelText('Full name');
    fireEvent.change(input, { target: { value: 'Sita Gurung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Sita Gurung'));
  });

  it('shows validation errors and keeps the dialog open', async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open prompt' }));
    fireEvent.change(await screen.findByLabelText('Full name'), { target: { value: 'S' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Name is too short')).toBeDefined();
    expect(screen.getByRole('status').textContent).toBe('pending');
  });

  it('resolves null when cancelled', async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open prompt' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('null'));
  });

  it('resolves null when Escape is pressed', async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open prompt' }));
    await screen.findByLabelText('Full name');
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('null'));
  });

  // Cancel precedes Save in the form, so if it ever became a submit button it
  // would be the form's default and swallow Enter, discarding the typed value.
  // Mantine's UnstyledButton supplies type="button"; Save opts in explicitly.
  it('keeps Cancel out of the form submission path', async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open prompt' }));
    expect((await screen.findByRole('button', { name: 'Cancel' })).getAttribute('type')).toBe(
      'button'
    );
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('type')).toBe('submit');
  });
});
