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
  CreatePost: undefined;
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
    otherUserPhotoUrl?: string | null;
    postId?: string;
    postTitle?: string;
  };
};

/**
 * Events stack parameter list
 */
export type EventsStackParamList = {
  EventsList: undefined;
  // Future: EventDetail: { eventId: string };
};

/**
 * Marketplace stack parameter list
 */
export type MarketplaceStackParamList = {
  MarketplaceMain: undefined;
  // Future: BusinessDetail: { businessId: string };
};

/**
 * Main tab navigator parameter list
 */
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Post: NavigatorScreenParams<PostStackParamList>;
  Events: NavigatorScreenParams<EventsStackParamList>;
  Marketplace: NavigatorScreenParams<MarketplaceStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
  // Messages moved to top nav, but keeping ChatNavigator accessible via navigation
};

/**
 * Root stack parameter list
 */
export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Chat: NavigatorScreenParams<ChatStackParamList>;
};

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
