/**
 * Post categories and their configurations
 */

import type { PostCategory } from '../types/post';

export interface PostCategoryConfig {
  id: PostCategory;
  name: string;
  expiryDays: number;
  maxPhotos: number;
  requiresModeration: boolean;
}

export const POST_CATEGORIES: Record<PostCategory, PostCategoryConfig> = {
  housing: {
    id: 'housing',
    name: 'Housing',
    expiryDays: 30,
    maxPhotos: 10,
    requiresModeration: false,
  },
  jobs: {
    id: 'jobs',
    name: 'Jobs',
    expiryDays: 30,
    maxPhotos: 3,
    requiresModeration: false,
  },
  emergency: {
    id: 'emergency',
    name: 'Emergency',
    expiryDays: 7,
    maxPhotos: 5,
    requiresModeration: true, // Red Alert system
  },
  travel: {
    id: 'travel',
    name: 'Travel',
    expiryDays: 2, // Expires 2 days after travel date
    maxPhotos: 2,
    requiresModeration: false,
  },
};
