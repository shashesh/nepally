import { z } from 'zod';

/**
 * Job post validation schema
 */

export const jobPostSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(100),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000),
  jobTitle: z.string().min(3).max(100),
  companyName: z.string().min(2).max(100),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship']),
  payRateMin: z.number().min(0),
  payRateMax: z.number().min(0),
  payRateType: z.enum(['hourly', 'annual', 'per-project']),
  experienceRequired: z.enum(['entry', 'mid', 'senior']),
  benefits: z.array(z.string()).optional(),
  remote: z.boolean(),
  zipCode: z.string().regex(/^\d{5}$/, 'Invalid ZIP code'),
  contactMethod: z.enum(['in-app', 'email', 'apply-url']),
  applyUrl: z.string().url().optional(),
  photos: z.array(z.string().url()).max(3).optional(),
}).refine(
  (data) => data.payRateMax >= data.payRateMin,
  { message: 'Max pay must be greater than or equal to min pay', path: ['payRateMax'] }
);

export type JobPostInput = z.infer<typeof jobPostSchema>;
