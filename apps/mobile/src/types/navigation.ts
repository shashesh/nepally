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
  EmailVerification: {
    email: string;
    userId: string;
    fullName: string;
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
  CreatePost:
    | {
        editPostId?: string;
      }
    | undefined;
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
 * Routes that the Home, Events and Marketplace stacks all have, for the screens
 * that live in any of them: a seller's or organizer's profile opens on top of
 * the listing or event, and a profile opens posts.
 */
export type ProfileRoutesParamList = {
  PostDetail: { postId: string };
  PublicProfileView: { userId: string };
};

/**
 * Home stack parameter list (for post detail navigation)
 */
export type HomeStackParamList = ProfileRoutesParamList & {
  HomeMain: undefined;
  ManageLocations: undefined;
  AddLocation: undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
};

/**
 * Chat stack parameter list
 */
export type ChatStackParamList = {
  ConversationList: undefined;
  MessageThread: {
    conversationId: string;
    /** Null when the partner's account was purged. */
    otherUserId: string | null;
    otherUserName: string;
    otherUserTrustLevel: number;
    otherUserPhotoUrl?: string | null;
    /** Text the message box starts with, e.g. which listing a buyer is asking about. Not sent until the member taps Send. */
    initialDraft?: string;
  };
};

/**
 * Events stack parameter list
 */
export type EventsStackParamList = ProfileRoutesParamList & {
  EventsList: undefined;
  EventDetail: { eventId: string };
  CreateEvent: { editEventId?: string } | undefined;
};

/**
 * Marketplace stack parameter list
 */
export type MarketplaceStackParamList = ProfileRoutesParamList & {
  MarketplaceHome: undefined;
  MarketplaceCategory: { categorySlug: string; categoryName: string };
  ListingDetail: { listingId: string };
  CreateListing: { editListingId?: string } | undefined;
  MyListings: undefined;
  // New in 2026-04-14 redesign:
  BrowseCategories: undefined;
  MarketplaceRules: undefined;
  SavedListings: undefined;
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
  /** A member pending deletion sees only this (RootNavigator's gate). */
  AccountRestore: undefined;
};

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace ReactNavigation {
    // Required by React Navigation for global route typing augmentation.
    interface RootParamList extends RootStackParamList {
      _routeTypesBrand?: never;
    }
  }
}
