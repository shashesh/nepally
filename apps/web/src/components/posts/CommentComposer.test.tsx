import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { CommentComposer } from './CommentComposer';

describe('CommentComposer', () => {
  it('gives the field an accessible name', () => {
    render(<CommentComposer onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Write a comment')).toBeDefined();
  });

  it('submits the text and clears the field', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CommentComposer onSubmit={onSubmit} />);

    const field = screen.getByLabelText('Write a comment');
    fireEvent.change(field, { target: { value: 'Great post' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Great post'));
    await waitFor(() => expect((field as HTMLInputElement).value).toBe(''));
  });

  it('keeps the text when the submit fails, so it can be retried', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('createComment failed'));
    render(<CommentComposer onSubmit={onSubmit} />);

    const field = screen.getByLabelText('Write a comment') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Great post' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Great post'));
    expect(field.value).toBe('Great post');
  });

  it('keeps text typed while the submit was in flight', async () => {
    let settleSubmit: () => void = () => {};
    const onSubmit = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        settleSubmit = resolve;
      })
    );
    render(<CommentComposer onSubmit={onSubmit} />);

    const field = screen.getByLabelText('Write a comment') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Great post' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Great post'));

    // The next comment, started before the first one landed.
    fireEvent.change(field, { target: { value: 'One more thing' } });
    await act(async () => {
      settleSubmit();
    });

    expect(field.value).toBe('One more thing');
  });

  it('keeps an identical draft retyped while the submit was in flight', async () => {
    let settleSubmit: () => void = () => {};
    const onSubmit = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        settleSubmit = resolve;
      })
    );
    render(<CommentComposer onSubmit={onSubmit} />);

    const field = screen.getByLabelText('Write a comment') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Great post' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Great post'));

    // Cleared and retyped, so the field holds a new draft that happens to read
    // the same as the one in flight.
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.change(field, { target: { value: 'Great post' } });
    await act(async () => {
      settleSubmit();
    });

    expect(field.value).toBe('Great post');
  });

  it('will not submit blank text', () => {
    const onSubmit = vi.fn();
    render(<CommentComposer onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Write a comment'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('names the person being replied to and can cancel', () => {
    const onCancelReply = vi.fn();
    render(<CommentComposer replyingToName="Bikal Shrestha" onCancelReply={onCancelReply} onSubmit={vi.fn()} />);

    expect(screen.getByText('Replying to Bikal Shrestha')).toBeDefined();
    expect(screen.getByLabelText('Write a reply')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel reply' }));
    expect(onCancelReply).toHaveBeenCalledTimes(1);
  });

  it('keeps the text while a submission is in flight', () => {
    render(<CommentComposer onSubmit={vi.fn()} submitting />);

    const field = screen.getByLabelText('Write a comment') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Great post' } });

    expect((screen.getByRole('button', { name: 'Post' }) as HTMLButtonElement).disabled).toBe(true);
    expect(field.value).toBe('Great post');
  });
});
