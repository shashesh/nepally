/**
 * Trust & Safety System - Account levels
 */

export enum TrustLevel {
  NEW = 0,
  VERIFIED = 1,
  CONTRIBUTOR = 2,
}

export interface TrustLevelConfig {
  level: TrustLevel;
  name: string;
  description: string;
  postsPerDay: number;
  canPostEmergency: boolean;
  canVerifyEmergency: boolean;
  requirements: string[];
}

export const TRUST_LEVELS: Record<TrustLevel, TrustLevelConfig> = {
  [TrustLevel.NEW]: {
    level: TrustLevel.NEW,
    name: 'New',
    description: 'New user with limited access',
    postsPerDay: 1,
    canPostEmergency: false,
    canVerifyEmergency: false,
    requirements: ['Account created'],
  },
  [TrustLevel.VERIFIED]: {
    level: TrustLevel.VERIFIED,
    name: 'Verified',
    description: 'Phone or social media verified',
    postsPerDay: 10,
    canPostEmergency: true,
    canVerifyEmergency: false,
    requirements: ['Phone verification', 'OR social media verification'],
  },
  [TrustLevel.CONTRIBUTOR]: {
    level: TrustLevel.CONTRIBUTOR,
    name: 'Contributor',
    description: 'High engagement or vouched by community',
    postsPerDay: 50,
    canPostEmergency: true,
    canVerifyEmergency: true,
    requirements: ['High engagement score', 'OR vouched by 2+ verified users'],
  },
};
