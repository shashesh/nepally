import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True when the app runs inside Expo Go, which has only the native modules
 * Expo ships with. Code that needs another native module (push notifications,
 * the Galeria photo viewer) checks this before loading it, and works in a
 * development or store build.
 * @see https://docs.expo.dev/develop/development-builds/introduction/
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
