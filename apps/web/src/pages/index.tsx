import Head from 'next/head';
import { PostCategory } from '@unhn/shared';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <>
      <Head>
        <title>UNHN - US-Nepal Help Network</title>
        <meta
          name="description"
          content="Community platform for the Nepalese diaspora in the USA. Find housing, jobs, emergency help, and travel companions."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Welcome to UNHN</h1>
          <p className={styles.subtitle}>US-Nepal Help Network</p>
          <p className={styles.description}>
            Your community platform for housing, jobs, emergencies, and travel coordination.
          </p>

          <div className={styles.categories}>
            <h2>Explore Categories</h2>
            <div className={styles.grid}>
              <CategoryCard
                icon="🏠"
                title="Housing"
                description="Find roommates, apartments, and housing opportunities"
                category={PostCategory.HOUSING}
              />
              <CategoryCard
                icon="💼"
                title="Jobs"
                description="Discover job openings and career opportunities"
                category={PostCategory.JOBS}
              />
              <CategoryCard
                icon="🚨"
                title="Emergency"
                description="Get urgent help from the community"
                category={PostCategory.EMERGENCY}
              />
              <CategoryCard
                icon="✈️"
                title="Travel"
                description="Find travel companions and coordinate trips"
                category={PostCategory.TRAVEL}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

interface CategoryCardProps {
  icon: string;
  title: string;
  description: string;
  category: PostCategory;
}

function CategoryCard({ icon, title, description }: CategoryCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.icon}>{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
