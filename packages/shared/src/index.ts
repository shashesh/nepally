/**
 * Main entry point for @nepally/shared package
 * Export all types, constants, utilities, API functions, and validation schemas
 */

// Types
export * from './types';

// Constants
export * from './constants/appConfig';
export * from './constants/postCategories';
export * from './constants/postPhotos';
export * from './constants/tags';
export * from './constants/trustLevels';
export * from './constants/location';
export * from './constants/events';
export * from './constants/marketplace';
export * from './constants/promotions';

// Utilities
export * from './utils';

// Validation
export * from './validation';

// API functions (Supabase query logic with dependency injection)
export * from './api';

// Business logic helpers
export * from './logic';
