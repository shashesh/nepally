import Head from 'next/head';
import Link from 'next/link';
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
          <div className={styles.ctaContainer}>
            <Link href="/feed" className={styles.ctaLink}>
              Go to Your Feed &rarr;
            </Link>
          </div>
        )}

        <div className={styles.categories}>
          <h2>Explore Tags</h2>
          <div className={styles.grid}>
            <TagCard
              icon="🏠"
              title="Housing"
              description="Find roommates, apartments, and housing opportunities"
              slug="housing"
            />
            <TagCard
              icon="💼"
              title="Jobs"
              description="Discover job openings and career opportunities"
              slug="jobs"
            />
            <TagCard
              icon="🤝"
              title="Help"
              description="Ask for or offer help to the community"
              slug="help"
            />
            <TagCard
              icon="❓"
              title="Question"
              description="Ask questions and get answers from the community"
              slug="question"
            />
          </div>
        </div>
      </div>
    </>
  );
}

interface TagCardProps {
  icon: string;
  title: string;
  description: string;
  slug: string;
}

function TagCard({ icon, title, description, slug }: TagCardProps) {
  return (
    <Link href={`/feed?tags=${slug}`} className={styles.card}>
      <div className={styles.icon}>{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </Link>
  );
}
