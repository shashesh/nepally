import React, { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '../../test-utils';
import { AuthCard } from './AuthCard';

describe('AuthCard', () => {
  it('renders its title as the one level-1 heading', () => {
    render(
      <AuthCard title="Welcome back">
        <p>Form</p>
      </AuthCard>
    );

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Welcome back');
  });

  it('hands the h1 to titleRef so a step change can focus it', () => {
    const titleRef = createRef<HTMLHeadingElement>();

    render(
      <AuthCard title="Find your area" titleRef={titleRef}>
        <p>Form</p>
      </AuthCard>
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'Find your area' });
    expect(titleRef.current).toBe(heading);
    expect(heading.getAttribute('tabindex')).toBe('-1');
  });

  it('renders the description, children and footer', () => {
    render(
      <AuthCard
        title="Join Nepally"
        description="Create your account"
        footer={<a href="/login">Log in</a>}
      >
        <p>The form</p>
      </AuthCard>
    );

    expect(screen.getByText('Create your account')).toBeTruthy();
    expect(screen.getByText('The form')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeTruthy();
  });
});
