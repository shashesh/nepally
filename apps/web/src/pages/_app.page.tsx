import type { AppProps } from 'next/app';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from '../contexts/AuthContext';
import { LocationProvider } from '../contexts/LocationContext';
import Layout from '../components/Layout';
import FontVariables from '../components/layout/FontVariables';
import { nusaTheme } from '../styles/mantine-theme';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={nusaTheme} defaultColorScheme="light">
      <FontVariables />
      <Notifications position="top-right" />
      <AuthProvider>
        <LocationProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </LocationProvider>
      </AuthProvider>
    </MantineProvider>
  );
}
