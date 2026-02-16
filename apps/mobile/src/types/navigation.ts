import { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Onboarding stack parameter list
 */
export type OnboardingStackParamList = {
  Welcome: undefined;
  SignupMethod: undefined;
  EmailSignup: {
    mode?: 'signup' | 'login';
  };
  ZipCodeEntry: {
    userId: string;
  };
  MetroConfirmation: {
    userId: string;
    zipCode: string;
    metroAreaId: string;
    metroName: string;
  };
  Tutorial: undefined;
};

/**
 * Post creation stack parameter list
 */
export type PostStackParamList = {
  CategorySelect: undefined;
  CreatePost: {
    category: 'housing' | 'jobs' | 'emergency' | 'travel';
  };
};

/**
 * Profile stack parameter list
 */
export type ProfileStackParamList = {
  ProfileView: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
};

/**
 * Main tab navigator parameter list
 */
export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Post: NavigatorScreenParams<PostStackParamList>;
  Messages: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

/**
 * Root stack parameter list
 */
export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
