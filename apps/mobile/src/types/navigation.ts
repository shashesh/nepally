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
  LocationPermission: {
    userId: string;
  };
  ZipCodeEntry: {
    userId: string;
  };
  MetroConfirmation: {
    userId: string;
    zipCode: string;
    metroAreaId: string;
    metroName: string;
    fromGps?: boolean;
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
 * Home stack parameter list (for post detail navigation)
 */
export type HomeStackParamList = {
  HomeMain: undefined;
  PostDetail: { postId: string };
  ManageLocations: undefined;
  AddLocation: undefined;
};

/**
 * Chat stack parameter list
 */
export type ChatStackParamList = {
  ConversationList: undefined;
  MessageThread: {
    conversationId: string;
    otherUserId: string;
    otherUserName: string;
    otherUserTrustLevel: number;
    postId?: string;
    postTitle?: string;
    postCategory?: string;
  };
};

/**
 * Main tab navigator parameter list
 */
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Search: undefined;
  Post: NavigatorScreenParams<PostStackParamList>;
  Messages: NavigatorScreenParams<ChatStackParamList>;
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
