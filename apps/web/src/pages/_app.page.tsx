import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { LocationProvider } from '../contexts/LocationContext';
import Layout from '../components/Layout';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <LocationProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </LocationProvider>
    </AuthProvider>
  );
}
