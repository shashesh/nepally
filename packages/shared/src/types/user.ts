import { TrustLevel } from '../constants/trustLevels';

/**
 * User data types
 */

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  phoneVerified: boolean;
  metroAreaId: string;
  zipCode: string;
  trustLevel: TrustLevel;
  profilePhoto?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;

  // Social verification
  facebookVerified?: boolean;
  googleVerified?: boolean;

  // Engagement metrics
  postsCount: number;
  helpfulVotesReceived: number;
  reportsReceived: number;

  // Moderation
  isBanned: boolean;
  banReason?: string;
  isModerator: boolean;
}

export interface UserProfile extends Omit<User, 'email' | 'phone'> {
  // Public profile (sensitive data removed)
  memberSince: string;
}

export interface UserSettings {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  emergencyAlerts: boolean;
  metroAreaAlerts: boolean;
}
