import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '../../test-utils';
import { AboutYouSection, type AboutYouValues } from './AboutYouSection';

const BASE_VALUES: AboutYouValues = {
  hometown_district: 'Kathmandu',
  college: 'Pulchowk',
  years_in_us: 5,
  languages: ['nepali'],
};

function Harness({
  initial = BASE_VALUES,
  onChangeSpy,
  disabled,
}: {
  initial?: AboutYouValues;
  onChangeSpy?: (next: AboutYouValues) => void;
  disabled?: boolean;
}) {
  const [values, setValues] = useState<AboutYouValues>(initial);

  return (
    <AboutYouSection
      values={values}
      disabled={disabled}
      onChange={(next) => {
        onChangeSpy?.(next);
        setValues(next);
      }}
    />
  );
}

describe('AboutYouSection', () => {
  it('shows each field value, found by its label', () => {
    render(<Harness />);

    expect((screen.getByLabelText('Hometown district') as HTMLSelectElement).value).toBe('Kathmandu');
    expect((screen.getByLabelText('College / university') as HTMLInputElement).value).toBe('Pulchowk');
    expect((screen.getByLabelText('Years in the US') as HTMLInputElement).value).toBe('5');
    expect(screen.getByRole('button', { name: 'Nepali' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Newari' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('titles the section with an h2', () => {
    render(<Harness />);

    expect(screen.getByRole('heading', { level: 2, name: 'About You' })).toBeDefined();
  });

  it('names the section region "About You"', () => {
    render(<Harness />);

    expect(screen.getByRole('region', { name: 'About You' })).toBeDefined();
  });

  it('emits the picked district', () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);

    fireEvent.change(screen.getByLabelText('Hometown district'), { target: { value: 'Lalitpur' } });

    expect(onChangeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ hometown_district: 'Lalitpur' })
    );
  });

  it('emits null when "— Select —" is picked', () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);

    fireEvent.change(screen.getByLabelText('Hometown district'), { target: { value: '' } });

    expect(onChangeSpy).toHaveBeenCalledWith(expect.objectContaining({ hometown_district: null }));
  });

  it('emits null when college is emptied', () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);

    fireEvent.change(screen.getByLabelText('College / university'), { target: { value: '' } });

    expect(onChangeSpy).toHaveBeenCalledWith(expect.objectContaining({ college: null }));
  });

  it('emits the typed number of years', async () => {
    const onChangeSpy = vi.fn();
    render(<Harness initial={{ ...BASE_VALUES, years_in_us: null }} onChangeSpy={onChangeSpy} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Years in the US'), { target: { value: '5' } });
    });

    expect(onChangeSpy).toHaveBeenCalledWith(expect.objectContaining({ years_in_us: 5 }));
  });

  it('emits null when years is emptied', async () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Years in the US'), { target: { value: '' } });
    });

    expect(onChangeSpy).toHaveBeenCalledWith(expect.objectContaining({ years_in_us: null }));
  });

  it('keeps years a whole number from 0 to 99', async () => {
    const onChangeSpy = vi.fn();
    render(<Harness initial={{ ...BASE_VALUES, years_in_us: 15 }} onChangeSpy={onChangeSpy} />);
    const years = screen.getByLabelText('Years in the US') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(years, { target: { value: '150' } });
    });
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(years.value).toBe('15');

    await act(async () => {
      fireEvent.change(years, { target: { value: '5.5' } });
    });
    expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ years_in_us: 5 }));

    await act(async () => {
      fireEvent.change(years, { target: { value: '-3' } });
    });
    expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ years_in_us: 3 }));
  });

  it('toggles a language on and off', () => {
    const onChangeSpy = vi.fn();
    render(<Harness initial={{ ...BASE_VALUES, languages: [] }} onChangeSpy={onChangeSpy} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nepali' }));
    expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ languages: ['nepali'] }));

    fireEvent.click(screen.getByRole('button', { name: 'Nepali' }));
    expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ languages: [] }));
  });

  it('disables every control when disabled', () => {
    render(<Harness disabled />);

    expect((screen.getByLabelText('Hometown district') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText('College / university') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Years in the US') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Nepali' }).hasAttribute('disabled')).toBe(true);
  });
});
