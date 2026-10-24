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
  phoneNumber: z.string().optional().nullable(),
  socialHandle: z.string().optional().nullable(),
  firebaseUid: z.string().optional().nullable(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  firebaseUid: z.string().optional().nullable(),
})

export const checkPhoneSchema = z.object({
  phoneNumber: z.string().min(8, 'Valid phone number is required'),
})

export const phoneLoginSchema = z.object({
  phoneNumber: z.string().min(8, 'Valid phone number is required'),
  firebaseUid: z.string().optional().nullable(),
})

export const completeProfileSchema = z.object({
  role: z.enum(['model', 'business', 'camera', 'drone'], {
    message: 'Role must be "model", "business", "camera", or "drone"',
  }),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  city: z.string().optional().nullable(),
  socialHandle: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
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
  gender: z.preprocess((val) => {
    if (typeof val !== 'string' || !val.trim()) return undefined
    const v = val.trim().toLowerCase()
    if (v === 'male' || v === 'female' || v === 'other') return v
    if (v === 'non-binary' || v === 'nonbinary') return 'other'
    return undefined
  }, z.enum(['male', 'female', 'other']).optional()),
  dateOfBirth: z.string().optional(), // ISO date string
  agreedToPrivacyPolicy: z.boolean().optional(),
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
  targetRole: z.enum(['model', 'camera', 'drone']).optional().default('model'),
  target_role: z.enum(['model', 'camera', 'drone']).optional(),
  isPriceOnCall: z.boolean().optional(),
  is_price_on_call: z.boolean().optional(),
  type: z.enum(['shoot', 'campaign', 'test', 'collaboration', 'other']).default('shoot'),
  budget: z.object({
    min: z.number().min(0, 'Min budget must be non-negative').default(0),
    max: z.number().min(0, 'Max budget must be non-negative').default(0),
    currency: z.string().length(3).default('INR'),
  }).optional().default({ min: 0, max: 0, currency: 'INR' }),
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
  shootType: z.string().optional().nullable(),
  shoot_type: z.string().optional().nullable(),
  clothesProvidedByOwner: z.boolean().optional().nullable(),
  wardrobeNote: z.string().optional().nullable(),
}).passthrough()


// Application schema
export const applicationSchema = z.object({
  proposedPrice: z.number().min(0, 'Proposed price must be non-negative').optional().default(0),
  message: z.string().min(1, 'Message is required').max(1000),
  phone: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
})

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})


export const fcmTokenSchema = z.object({
  fcmToken: z.string().min(1, 'FCM Token is required'),
  platform: z.enum(['android', 'ios', 'web', 'unknown']).optional().default('unknown'),
})

// Banner schemas
export const bannerSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  subtitle: z.string().max(250).optional().default(''),
  imageUrl: z.string().url('Must be a valid image URL'),
  ctaText: z.string().max(50).optional().default('Explore'),
  targetType: z.enum(['category', 'creator', 'casting', 'external']).default('category'),
  targetPayload: z.string().min(1, 'targetPayload is required'),
  targetAudience: z.enum(['all', 'talent', 'business']).default('all'),
  gradientColors: z.array(z.string()).optional().default(['#00204B', '#0877E8']),
  badge: z.string().max(50).optional().default(''),
  displayOrder: z.number().int().default(0),
  active: z.boolean().default(true),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
})

export const updateBannerSchema = bannerSchema.partial()

// Featured Profile schema
export const featuredSlotSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  slotOrder: z.number().int().min(1).max(50).default(1),
  featuredRole: z.enum(['model', 'camera', 'drone', 'business', 'all']).default('all'),
  curatorNote: z.string().max(300).optional().default('Curator Choice'),
  badge: z.string().max(50).optional().default('Featured'),
  active: z.boolean().default(true),
})

// Pricing Plan schema
export const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  code: z.string().min(1, 'Plan code is required').toLowerCase().regex(/^[a-z0-9_-]+$/),
  price: z.number().min(0, 'Price must be non-negative'),
  billingCycle: z.enum(['one_time', 'monthly', 'yearly']).default('one_time'),
  includedPosts: z.number().int().min(1).default(1),
  maxTalentsPerPost: z.number().int().min(1).default(2),
  features: z.array(z.string()).default([]),
  badge: z.string().max(50).optional().default(''),
  highlight: z.boolean().default(false),
  active: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
})

export const updatePlanSchema = planSchema.partial()

// Coupon / Promo Code schema
export const couponSchema = z.object({
  code: z.string().min(2, 'Code is required').toUpperCase().trim(),
  description: z.string().max(250).optional().default(''),
  discountType: z.enum(['percentage', 'flat', 'free_pass']).default('percentage'),
  discountValue: z.number().min(0, 'Discount value must be non-negative'),
  maxDiscountCap: z.number().min(0).optional().default(0),
  minOrderAmount: z.number().min(0).optional().default(0),
  applicablePlans: z.array(z.string()).optional().default(['all']),
  totalUsageLimit: z.number().int().min(1).default(100),
  perUserLimit: z.number().int().min(1).default(1),
  expiresAt: z.string().optional().nullable(),
  active: z.boolean().default(true),
})

export const updateCouponSchema = couponSchema.partial()

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Code is required').toUpperCase().trim(),
  amount: z.number().min(0, 'Amount must be non-negative'),
  planCode: z.string().optional(),
  userId: z.string().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ModelProfileInput = z.infer<typeof modelProfileSchema>
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>
export type PricingInput = z.infer<typeof pricingSchema>
export type AvailabilityInput = z.infer<typeof availabilitySchema>
export type OpportunityInput = z.infer<typeof opportunitySchema>
export type ApplicationInput = z.infer<typeof applicationSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type FcmTokenInput = z.infer<typeof fcmTokenSchema>
export type BannerInput = z.infer<typeof bannerSchema>
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>
export type FeaturedSlotInput = z.infer<typeof featuredSlotSchema>
export type PlanInput = z.infer<typeof planSchema>
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>
export type CouponInput = z.infer<typeof couponSchema>
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>
