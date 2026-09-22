// Import order is cascade order: Next emits CSS in the order it meets it, and
// the production build splits it into chunks that keep that order. Mantine's
// sheets come first, then globals.css, then the theme's class hooks
// (mantine-theme pulls in mantine-components.module.css), then the components.
// Each layer then wins ties at equal specificity over the one before, so a
// component's module overrides both Mantine and the theme. With these sheets
// below the component imports, production loaded the modules before Mantine
// core and Mantine won every tie.
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import '../styles/globals.css';
import { cssVariablesResolver, nepallyTheme } from '../styles/mantine-theme';

import type { AppProps } from 'next/app';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from '../contexts/AuthContext';
import { LocationProvider } from '../contexts/LocationContext';
import Layout from '../components/Layout';
import FontVariables from '../components/layout/FontVariables';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={nepallyTheme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light">
      <FontVariables />
      <ModalsProvider>
        <Notifications position="top-right" />
        <AuthProvider>
          <LocationProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </LocationProvider>
        </AuthProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
