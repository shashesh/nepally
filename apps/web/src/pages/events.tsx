import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

export default function EventsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Events - NUSA</title>
      </Head>
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 48,
          }}
        >
          📅
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: 'var(--color-text-primary)' }}>
          Events Coming Soon
        </h1>
        <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>
          Discover local community events, cultural celebrations, and gatherings in your metro area.
        </p>
        <div style={{ textAlign: 'left', maxWidth: 300, margin: '0 auto' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>
            What&apos;s coming:
          </h3>
          <ul style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Browse upcoming events</li>
            <li>RSVP and get reminders</li>
            <li>Create and share events</li>
            <li>Filter by event type</li>
          </ul>
        </div>
      </div>
    </>
  );
}
