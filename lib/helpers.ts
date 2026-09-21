import { ObjectId } from 'mongodb'

export function generateId(): string {
  return new ObjectId().toString()
}

export function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id)
}

export function calculateDurationDays(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

export function getPaginationParams(page: number = 1, limit: number = 20) {
  const normalizedPage = Math.max(1, page)
  const normalizedLimit = Math.min(100, Math.max(1, limit))
  const skip = (normalizedPage - 1) * normalizedLimit

  return {
    skip,
    limit: normalizedLimit,
    page: normalizedPage,
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateBudget(min: number, max: number): boolean {
  return min > 0 && max > 0 && max >= min
}

export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  return start < end
}

// Notification helpers
export async function createNotification(
  db: any,
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, any>
) {
  const result = await db.collection('notifications').insertOne({
    _id: new ObjectId(),
    userId,
    type,
    title,
    message,
    metadata: metadata || {},
    read: false,
    createdAt: new Date(),
  })

  // Also trigger instant FCM push notification to the user's mobile device
  try {
    const { sendUserPushNotification } = await import('@/lib/push-notifications')
    sendUserPushNotification({
      userId,
      title,
      body: message,
      data: {
        type,
        ...(metadata || {}),
      },
    }).catch((pushErr) => console.warn('[FCM] User push delivery error:', pushErr))
  } catch (importErr) {
    // Graceful fallback
  }

  return result
}

// Discovery score calculation
export function calculateDiscoveryScore(profile: any): number {
  let score = 0

  if (profile.bio && profile.bio.length > 100) score += 10
  if (profile.specialties && profile.specialties.length >= 2) score += 10
  if (profile.portfolio && profile.portfolio.length > 0) score += 15
  if (profile.profilePicture) score += 10
  if (profile.ratings && profile.ratings.average > 4) score += 20
  if (profile.applicationCount > 5) score += 15

  return Math.min(100, score)
}

// Application Enrichment for candidates and opportunities
export async function enrichApplication(db: any, app: any) {
  const safeId = (id: any) => (id && typeof id === 'string' && ObjectId.isValid(id) && id.length === 24 ? new ObjectId(id) : null)

  let oppDoc = null
  const oppObjectId = safeId(app.opportunityId)
  if (oppObjectId) {
    oppDoc = await db.collection('opportunities').findOne({ _id: oppObjectId })
  }
  if (!oppDoc) {
    oppDoc = await db.collection('opportunities').findOne({ $or: [{ _id: app.opportunityId }, { id: app.opportunityId }] })
  }

  let modelUser = null
  const userObjectId = safeId(app.userId)
  if (userObjectId) {
    modelUser = await db.collection('users').findOne({ _id: userObjectId })
  }
  if (!modelUser) {
    modelUser = await db.collection('users').findOne({ $or: [{ _id: app.userId }, { id: app.userId }] })
  }

  let modelProfile = null
  if (userObjectId) {
    modelProfile = await db.collection('modelProfiles').findOne({
      $or: [{ userId: app.userId }, { _id: userObjectId }]
    })
  } else {
    modelProfile = await db.collection('modelProfiles').findOne({ userId: app.userId })
  }

  let businessUser = null
  if (oppDoc?.createdBy) {
    const bizObjectId = safeId(oppDoc.createdBy)
    if (bizObjectId) {
      businessUser = await db.collection('users').findOne({ _id: bizObjectId })
    }
    if (!businessUser) {
      businessUser = await db.collection('users').findOne({ $or: [{ _id: oppDoc.createdBy }, { id: oppDoc.createdBy }] })
    }
  }

  const modelFullName = modelProfile?.name ||
    (modelUser ? `${modelUser.firstName || ''} ${modelUser.lastName || ''}`.trim() : '') ||
    app.modelName ||
    'Model Talent'

  return {
    ...app,
    // Candidate details for Owner
    modelName: modelFullName,
    modelAvatar: modelProfile?.portfolio?.[0] || modelProfile?.avatar || app.modelAvatar || null,
    modelBio: modelProfile?.bio || '',
    modelCity: modelProfile?.location?.city || modelProfile?.city || '',
    modelGender: modelProfile?.gender || '',
    modelHeight: modelProfile?.height || '',
    modelSpecialties: modelProfile?.specialties || app.modelSpecialties || [],
    modelPortfolio: modelProfile?.portfolio || [],
    modelRating: modelProfile?.rating || 4.9,
    modelInstagram: modelProfile?.instagram || modelProfile?.socialHandles?.instagram || '',
    modelPhone: modelUser?.phone || modelProfile?.phone || '',
    modelEmail: modelUser?.email || modelProfile?.email || '',

    // Company & Opportunity details for Model
    opportunityTitle: oppDoc?.title || 'Photoshoot',
    opportunityCategory: oppDoc?.category || oppDoc?.type || 'Fashion',
    businessName: oppDoc?.businessName || (businessUser ? `${businessUser.firstName || ''} ${businessUser.lastName || ''}`.trim() : 'Production Studio'),
    businessOwnerId: oppDoc?.createdBy || '',
    contactPersonName: oppDoc?.contactPersonName || '',
    contactPersonDesignation: oppDoc?.contactPersonDesignation || '',
    verificationUrl: oppDoc?.verificationUrl || '',
    opportunityBudgetMin: oppDoc?.budget?.min ?? oppDoc?.budgetMin ?? 2000,
    opportunityBudgetMax: oppDoc?.budget?.max ?? oppDoc?.budgetMax ?? 4000,
    currency: oppDoc?.budget?.currency ?? oppDoc?.currency ?? 'INR',
    engagementType: oppDoc?.engagement_type ?? oppDoc?.engagementType ?? 'hourly',
    date: oppDoc?.date || '',
    startTime: oppDoc?.start_time || oppDoc?.startTime || '',
    endTime: oppDoc?.end_time || oppDoc?.endTime || '',
    city: oppDoc?.location?.city ?? oppDoc?.city ?? '',
    address: oppDoc?.location?.address ?? oppDoc?.address ?? '',
    clothType: oppDoc?.clothType || '',
    clothesProvidedByOwner: oppDoc?.clothesProvidedByOwner ?? true,
    wardrobeNote: oppDoc?.wardrobeNote || '',
  }
}

