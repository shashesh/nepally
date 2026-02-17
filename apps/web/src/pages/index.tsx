import Head from 'next/head';
import Link from 'next/link';
import type { PostCategory } from '@nusa/shared';
import { useAuth } from '../hooks/useAuth';
import styles from '../styles/Home.module.css';

export default function Home() {
  const { user } = useAuth();

  return (
    <>
      <Head>
        <title>NUSA - Nepalese United Support Alliance</title>
        <meta
          name="description"
          content="Community platform for the Nepalese diaspora in the USA. Find housing, jobs, emergency help, and travel companions."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.container}>
        <h1 className={styles.title}>Welcome to NUSA</h1>
        <p className={styles.subtitle}>Nepalese United Support Alliance</p>
        <p className={styles.description}>
          Your community platform for housing, jobs, emergencies, and travel coordination.
        </p>

        {user && (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Link href="/feed" className={styles.ctaLink}>
              Go to Your Feed &rarr;
            </Link>
          </div>
        )}

        <div className={styles.categories}>
          <h2>Explore Categories</h2>
          <div className={styles.grid}>
            <CategoryCard
              icon="🏠"
              title="Housing"
              description="Find roommates, apartments, and housing opportunities"
              category="housing"
            />
            <CategoryCard
              icon="💼"
              title="Jobs"
              description="Discover job openings and career opportunities"
              category="jobs"
            />
            <CategoryCard
              icon="🚨"
              title="Emergency"
              description="Get urgent help from the community"
              category="emergency"
            />
            <CategoryCard
              icon="✈️"
              title="Travel"
              description="Find travel companions and coordinate trips"
              category="travel"
            />
          </div>
        </div>
      </div>
    </>
  );
}

interface CategoryCardProps {
  icon: string;
  title: string;
  description: string;
  category: PostCategory;
}

function CategoryCard({ icon, title, description, category }: CategoryCardProps) {
  return (
    <Link href={`/feed?category=${category}`} className={styles.card}>
      <div className={styles.icon}>{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </Link>
  );
}
