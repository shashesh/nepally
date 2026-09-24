import React from 'react';
import { fireEvent, render, screen, within } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import LegalDocument from './LegalDocument';
import { Callout } from './Callout';
import { Faq, FaqItem } from './Faq';

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children?: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}));

describe('Callout', () => {
  it('renders its content as a note', () => {
    render(
      <Callout>
        <p>Call 911 in an emergency.</p>
      </Callout>
    );

    const note = screen.getByRole('note');
    expect(within(note).getByText('Call 911 in an emergency.')).toBeDefined();
  });
});

describe('Faq', () => {
  it('shows each question as a summary and opens its answer on click', () => {
    const { container } = render(
      <Faq>
        <FaqItem question="Why do you ask for my ZIP code?">
          <p>To show you your metro.</p>
        </FaqItem>
        <FaqItem question="Can I edit a post?">
          <p>Yes.</p>
        </FaqItem>
      </Faq>
    );

    const summaries = Array.from(container.querySelectorAll('summary'));
    expect(summaries.map((summary) => summary.textContent)).toEqual([
      'Why do you ask for my ZIP code?',
      'Can I edit a post?',
    ]);

    const details = summaries[0].closest('details');
    expect(details).not.toBeNull();
    expect(details?.hasAttribute('open')).toBe(false);

    fireEvent.click(screen.getByText('Why do you ask for my ZIP code?'));

    expect(details?.hasAttribute('open')).toBe(true);
    expect(summaries[1].closest('details')?.hasAttribute('open')).toBe(false);
  });
});

describe('LegalDocument', () => {
  it('names the page and links the three other policy pages', () => {
    render(
      <LegalDocument title="Terms of Service" description="The rules." intro={<p>Welcome.</p>}>
        <h2>Section</h2>
      </LegalDocument>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeDefined();

    const nav = screen.getByRole('navigation', { name: 'Policies and help' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Privacy Policy', '/privacy'],
      ['Community Guidelines', '/guidelines'],
      ['Help Center', '/help'],
    ]);
  });
});
