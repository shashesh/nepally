import React from 'react';
import { render, screen } from '../test-utils';
import { describe, expect, it, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));

import PrivacyPage from './privacy.page';
import TermsPage from './terms.page';
import GuidelinesPage from './guidelines.page';
import HelpPage from './help.page';

function expectMention(pattern: RegExp): void {
  expect(screen.getAllByText(pattern).length).toBeGreaterThan(0);
}

function expectLink(name: RegExp, href: string): void {
  const links = screen.getAllByRole('link', { name });
  expect(links.some((link) => link.getAttribute('href') === href)).toBe(true);
}

describe('Privacy Policy page', () => {
  it('states what is collected and who processes it', () => {
    render(<PrivacyPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeDefined();
    expectMention(/Last updated/);
    expectMention(/ZIP code/);
    for (const processor of [/Supabase/, /Google/, /Stripe/, /Vercel/, /Expo/]) {
      expectMention(processor);
    }
    expectLink(/support@nepally\.us/, 'mailto:support@nepally.us');
  });

  it('links to the Terms and explains deletion', () => {
    render(<PrivacyPage />);

    expectLink(/Terms of Service/, '/terms');
    expectMention(/delete your account/i);
  });
});

describe('Terms of Service page', () => {
  it('frames Nepally as a notice board and carries the emergency disclaimer', () => {
    render(<TermsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeDefined();
    expectMention(/community notice board/i);
    expectMention(/not a replacement for 911/i);
    expectMention(/18 years/);
    expectLink(/Privacy Policy/, '/privacy');
    expectLink(/Community Guidelines/, '/guidelines');
  });
});

describe('Community Guidelines page', () => {
  it('covers scams, harassment, the Emergency tag, and consequences', () => {
    render(<GuidelinesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Community Guidelines' })).toBeDefined();
    expectMention(/scam/i);
    expectMention(/harass/i);
    expectMention(/Emergency tag/);
    expectMention(/banned/i);
    expectLink(/Help Center/, '/help');
  });
});

describe('Help Center page', () => {
  it('explains verification, reporting, and account deletion with a support contact', () => {
    render(<HelpPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Help Center' })).toBeDefined();
    expectMention(/Verified/);
    expectMention(/report/i);
    expectMention(/delete your account/i);
    expectLink(/support@nepally\.us/, 'mailto:support@nepally.us');
    expectLink(/Privacy Policy/, '/privacy');
  });
});
