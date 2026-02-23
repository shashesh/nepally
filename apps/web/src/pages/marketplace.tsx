import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import styles from '../styles/ComingSoon.module.css';

export default function MarketplacePage() {
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
        <title>Marketplace - NUSA</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.iconCircle}>
          🏪
        </div>
        <h1 className={styles.title}>
          Marketplace Coming Soon
        </h1>
        <p className={styles.subtitle}>
          Discover local Nepalese businesses, restaurants, and professional services in your community.
        </p>
        <div className={styles.listContainer}>
          <h3 className={styles.listTitle}>
            What&apos;s coming:
          </h3>
          <ul className={styles.list}>
            <li>Find local businesses</li>
            <li>Read reviews and ratings</li>
            <li>Connect with service providers</li>
            <li>Support community businesses</li>
          </ul>
        </div>
      </div>
    </>
  );
}
