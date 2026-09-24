import Head from 'next/head';
import { useAuth } from '../hooks/useAuth';
import { FeedPage } from './feed.page';
import { LandingPage } from '../components/landing/LandingPage';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <FeedPage routeBasePath="/" />;
  }

  return (
    <>
      <Head>
        <title>Nepally - The Nepali community in the USA</title>
        <meta
          name="description"
          content="Community platform for the Nepalese diaspora in the USA. Find housing, jobs, emergency help, and travel companions."
        />
      </Head>
      <LandingPage />
    </>
  );
}
