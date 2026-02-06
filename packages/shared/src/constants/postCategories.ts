/**
 * Post categories and their configurations
 */

export enum PostCategory {
  HOUSING = 'housing',
  JOBS = 'jobs',
  EMERGENCY = 'emergency',
  TRAVEL = 'travel',
}

export interface PostCategoryConfig {
  id: PostCategory;
  name: string;
  expiryDays: number;
  maxPhotos: number;
  requiresModeration: boolean;
}

export const POST_CATEGORIES: Record<PostCategory, PostCategoryConfig> = {
  [PostCategory.HOUSING]: {
    id: PostCategory.HOUSING,
    name: 'Housing',
    expiryDays: 30,
    maxPhotos: 10,
    requiresModeration: false,
  },
  [PostCategory.JOBS]: {
    id: PostCategory.JOBS,
    name: 'Jobs',
    expiryDays: 30,
    maxPhotos: 3,
    requiresModeration: false,
  },
  [PostCategory.EMERGENCY]: {
    id: PostCategory.EMERGENCY,
    name: 'Emergency',
    expiryDays: 7,
    maxPhotos: 5,
    requiresModeration: true, // Red Alert system
  },
  [PostCategory.TRAVEL]: {
    id: PostCategory.TRAVEL,
    name: 'Travel',
    expiryDays: 2, // Expires 2 days after travel date
    maxPhotos: 2,
    requiresModeration: false,
  },
};
