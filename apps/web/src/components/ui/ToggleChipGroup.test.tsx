import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test-utils';
import { ToggleChipGroup, type ToggleChipGroupProps, type ToggleChipOption } from './ToggleChipGroup';

const TAGS: ToggleChipOption[] = [
  { value: 'housing', label: '🏠 Housing', name: 'Housing tag' },
  { value: 'jobs', label: '💼 Jobs', name: 'Jobs tag' },
  { value: 'help', label: '🙏 Help', name: 'Help tag' },
];

type HarnessProps = Partial<ToggleChipGroupProps> & {
  initial?: string[];
  onChangeSpy?: (value: string[]) => void;
};

function Harness({ initial = [], onChangeSpy, ...props }: HarnessProps) {
  const [value, setValue] = useState<string[]>(initial);

  return (
    <ToggleChipGroup
      label="Tags"
      options={TAGS}
      value={value}
      onChange={(next) => {
        onChangeSpy?.(next);
        setValue(next);
      }}
      {...props}
    />
  );
}

function chip(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

describe('ToggleChipGroup', () => {
  it('names the group after its label', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Tags' })).toBeDefined();
  });

  it('takes each chip name from the option, not from its decorated label', () => {
    render(<Harness />);

    expect(chip('Housing tag')).toBeDefined();
    expect(screen.getByText('🏠 Housing')).toBeDefined();
  });

  it('falls back to the label when an option gives no name', () => {
    render(<Harness options={[{ value: 'cultural', label: '🎭 Cultural' }]} />);

    expect(chip('🎭 Cultural')).toBeDefined();
  });

  it('reports each chip as pressed or not', () => {
    render(<Harness initial={['jobs']} />);

    expect(chip('Housing tag').getAttribute('aria-pressed')).toBe('false');
    expect(chip('Jobs tag').getAttribute('aria-pressed')).toBe('true');
  });

  it('adds to the selection in multiple mode', () => {
    const onChangeSpy = vi.fn();
    render(<Harness initial={['housing']} onChangeSpy={onChangeSpy} />);

    fireEvent.click(chip('Jobs tag'));

    expect(onChangeSpy).toHaveBeenCalledWith(['housing', 'jobs']);
  });

  it('removes from the selection when a pressed chip is pressed again', () => {
    const onChangeSpy = vi.fn();
    render(<Harness initial={['housing', 'jobs']} onChangeSpy={onChangeSpy} />);

    fireEvent.click(chip('Housing tag'));

    expect(onChangeSpy).toHaveBeenCalledWith(['jobs']);
  });

  it('replaces the selection in single mode', () => {
    const onChangeSpy = vi.fn();
    render(<Harness mode="single" initial={['housing']} onChangeSpy={onChangeSpy} />);

    fireEvent.click(chip('Jobs tag'));

    expect(onChangeSpy).toHaveBeenCalledWith(['jobs']);
  });

  it('keeps the choice made in single mode when its chip is pressed again', () => {
    const onChangeSpy = vi.fn();
    render(<Harness mode="single" initial={['housing']} onChangeSpy={onChangeSpy} />);

    fireEvent.click(chip('Housing tag'));

    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(chip('Housing tag').getAttribute('aria-pressed')).toBe('true');
  });

  it('disables the chips that cannot be added once the cap is reached', () => {
    render(<Harness max={2} initial={['housing', 'jobs']} />);

    expect(chip('Help tag').hasAttribute('disabled')).toBe(true);
    expect(chip('Housing tag').hasAttribute('disabled')).toBe(false);
  });

  it('still lets a pressed chip be released at the cap', () => {
    const onChangeSpy = vi.fn();
    render(<Harness max={2} initial={['housing', 'jobs']} onChangeSpy={onChangeSpy} />);

    fireEvent.click(chip('Jobs tag'));

    expect(onChangeSpy).toHaveBeenCalledWith(['housing']);
  });

  it('disables every chip when the group is disabled', () => {
    render(<Harness disabled />);

    expect(chip('Housing tag').hasAttribute('disabled')).toBe(true);
    expect(chip('Jobs tag').hasAttribute('disabled')).toBe(true);
  });

  it('describes the group with its description and error', () => {
    render(<Harness description="Pick up to three" error="Select at least one tag" />);

    const group = screen.getByRole('group', { name: 'Tags' });
    const describedBy = group.getAttribute('aria-describedby') ?? '';

    expect(screen.getByText('Pick up to three')).toBeDefined();
    expect(screen.getByText('Select at least one tag')).toBeDefined();
    expect(describedBy.split(' ')).toContain(screen.getByText('Select at least one tag').id);
    expect(describedBy.split(' ')).toContain(screen.getByText('Pick up to three').id);
  });

  it('marks each chip with its value, so a caller can colour it', () => {
    render(<Harness />);

    expect(chip('Housing tag').getAttribute('data-value')).toBe('housing');
  });
});
