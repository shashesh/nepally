import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import styles from '../styles/ComingSoon.module.css';

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
      <div className={styles.container}>
        <div className={styles.iconCircle}>
          📅
        </div>
        <h1 className={styles.title}>
          Events Coming Soon
        </h1>
        <p className={styles.subtitle}>
          Discover local community events, cultural celebrations, and gatherings in your metro area.
        </p>
        <div className={styles.listContainer}>
          <h3 className={styles.listTitle}>
            What&apos;s coming:
          </h3>
          <ul className={styles.list}>
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
