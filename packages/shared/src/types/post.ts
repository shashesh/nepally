import { PostCategory } from '../constants/postCategories';

/**
 * Post data types
 */

export interface BasePost {
  id: string;
  authorId: string;
  category: PostCategory;
  metroAreaId: string;
  title: string;
  description: string;
  photos: string[];
  location: {
    zipCode: string;
    city: string;
    state: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  status: 'active' | 'expired' | 'removed' | 'pending';
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;

  // Engagement
  viewsCount: number;
  responsesCount: number;
  reportsCount: number;
}

// Housing-specific fields
export interface HousingPost extends BasePost {
  category: PostCategory.HOUSING;
  fields: {
    rentAmount: number;
    moveInDate: Date;
    roomType: 'private' | 'shared' | 'entire-place';
    bedrooms: number;
    bathrooms: number;
    furnished: boolean;
    utilitiesIncluded: boolean;
    petsAllowed: boolean;
    parking: boolean;
    lease: 'month-to-month' | 'fixed-term';
    contactMethod: 'in-app' | 'phone' | 'email';
  };
}

// Jobs-specific fields
export interface JobPost extends BasePost {
  category: PostCategory.JOBS;
  fields: {
    jobTitle: string;
    companyName: string;
    employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
    payRate: {
      min: number;
      max: number;
      type: 'hourly' | 'annual' | 'per-project';
    };
    experienceRequired: 'entry' | 'mid' | 'senior';
    benefits: string[];
    remote: boolean;
    contactMethod: 'in-app' | 'email' | 'apply-url';
    applyUrl?: string;
  };
}

// Emergency-specific fields
export interface EmergencyPost extends BasePost {
  category: PostCategory.EMERGENCY;
  fields: {
    emergencyType: 'medical' | 'housing' | 'legal' | 'financial' | 'other';
    urgency: 'critical' | 'high' | 'medium';
    assistanceNeeded: string[];
    contactPhone: string;
    contactName: string;
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: Date;
    redAlertSent: boolean;
  };
}

// Travel-specific fields
export interface TravelPost extends BasePost {
  category: PostCategory.TRAVEL;
  fields: {
    travelDate: Date;
    route: {
      from: string;
      to: string;
    };
    airline?: string;
    seatsAvailable: number;
    carryingPackages: boolean;
    packageDetails?: string;
    contactMethod: 'in-app' | 'phone';
  };
}

export type Post = HousingPost | JobPost | EmergencyPost | TravelPost;
