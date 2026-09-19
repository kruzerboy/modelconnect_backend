import { z } from 'zod'

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['model', 'business', 'camera', 'drone'], {
    message: 'Role must be "model", "business", "camera", or "drone"',
  }),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  otp: z.string().min(4, 'Verification code is required').optional(),
  token: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => Boolean(data.token || (data.email && data.otp)), {
  message: 'Either a reset token or email and OTP code are required',
})

// Profile schemas
export const modelProfileSchema = z.object({
  name: z.string().optional(),
  bio: z.string().max(1000, 'Bio must be at most 1000 characters').optional(),
  specialties: z.array(z.string()).optional().default([]),
  experience: z.enum(['beginner', 'intermediate', 'professional', 'expert']).optional().default('intermediate'),
  location: z.object({
    city: z.string().optional().default(''),
    country: z.string().optional().default(''),
  }).optional().default({ city: '', country: '' }),
  portfolio: z.array(z.string()).optional(),
  socialHandle: z.string().max(100, 'Social media handle must be at most 100 characters').optional(),
  height: z.string().optional(),
  eyeColor: z.string().optional(),
  hairColor: z.string().optional(),
  measurements: z.string().optional(),
  shoeSize: z.string().optional(),
  agency: z.string().optional(),
  hourlyRate: z.number().optional(),
  dailyRate: z.number().optional(),
  projectRate: z.number().optional(),
}).passthrough()

export const businessProfileSchema = z.object({
  companyName: z.string().optional().default('Business Account'),
  email: z.string().email().optional().or(z.literal('')),
  industry: z.string().optional().default(''),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional().default(''),
  website: z.string().optional().default(''),
  location: z.object({
    city: z.string().optional().default(''),
    country: z.string().optional().default(''),
  }).optional().default({ city: '', country: '' }),
  city: z.string().optional(),
  country: z.string().optional(),
  socialHandle: z.string().max(100, 'Social media handle must be at most 100 characters').optional().nullable(),
  logoUrl: z.string().optional().nullable(),
}).passthrough()

// Pricing schema
export const pricingSchema = z.object({
  baseRate: z.number().positive('Base rate must be positive'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  rateUnit: z.enum(['hour', 'day', 'project', 'shoot']),
  negotiable: z.boolean().default(true),
})

// Availability schema
export const availabilitySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  hoursPerWeek: z.number().int().min(0).max(168),
  type: z.enum(['available', 'unavailable']),
})

// Opportunity schema
export const opportunitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['shoot', 'campaign', 'test', 'collaboration', 'other']).default('shoot'),
  budget: z.object({
    min: z.number().positive('Min budget must be positive'),
    max: z.number().positive('Max budget must be positive'),
    currency: z.string().length(3).default('INR'),
  }),
  deadline: z.string(),
  businessName: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  engagement_type: z.string().optional(),
  date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_minutes: z.number().optional(),
  models_required: z.number().optional(),
  location: z.object({
    city: z.string().optional().default(''),
    country: z.string().optional().default(''),
  }).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  additional_requirements: z.string().optional().nullable(),
  additionalRequirements: z.string().optional().nullable(),
  production_services: z.array(z.string()).optional(),
  productionServices: z.array(z.string()).optional(),
  durationDays: z.number().int().positive('Duration must be positive').optional().nullable(),
  contactPersonName: z.string().optional().nullable(),
  contactPersonDesignation: z.string().optional().nullable(),
  verificationUrl: z.string().optional().nullable(),
  customGearDetails: z.string().optional().nullable(),
  preferredGender: z.string().optional().nullable(),
  preferredComplexion: z.string().optional().nullable(),
  preferredAgeMin: z.number().optional().nullable(),
  preferredAgeMax: z.number().optional().nullable(),
  clothType: z.string().optional().nullable(),
  clothesProvidedByOwner: z.boolean().optional().nullable(),
  wardrobeNote: z.string().optional().nullable(),
}).passthrough()


// Application schema
export const applicationSchema = z.object({
  proposedPrice: z.number().positive('Proposed price must be positive'),
  message: z.string().min(1, 'Message is required').max(1000),
})

// Chat schemas
export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000),
  type: z.enum(['text', 'attachment']).default('text'),
})

export const createConversationSchema = z.object({
  opportunityId: z.string().optional(),
  recipientId: z.string().min(1, 'Recipient ID is required'),
})

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})


export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ModelProfileInput = z.infer<typeof modelProfileSchema>
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>
export type PricingInput = z.infer<typeof pricingSchema>
export type AvailabilityInput = z.infer<typeof availabilitySchema>
export type OpportunityInput = z.infer<typeof opportunitySchema>
export type ApplicationInput = z.infer<typeof applicationSchema>
export type MessageInput = z.infer<typeof messageSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
