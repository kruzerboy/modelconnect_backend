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
  const safeId = (id: any) => {
    if (!id) return null
    if (typeof id === 'object' && id instanceof ObjectId) return id
    const str = String(id)
    if (ObjectId.isValid(str) && str.length === 24) return new ObjectId(str)
    return null
  }
  const toStr = (id: any) => (id ? String(id) : '')

  // 1. Resolve Opportunity
  const oppObjId = safeId(app.opportunityId)
  const oppStr = toStr(app.opportunityId)
  const oppQueries: any[] = []
  if (oppObjId) oppQueries.push({ _id: oppObjId }, { id: oppObjId })
  if (oppStr) oppQueries.push({ _id: oppStr }, { id: oppStr })
  const oppDoc = oppQueries.length ? await db.collection('opportunities').findOne({ $or: oppQueries }) : null

  // 2. Resolve Candidate User
  const userObjId = safeId(app.userId)
  const userStr = toStr(app.userId)
  const userQueries: any[] = []
  if (userObjId) userQueries.push({ _id: userObjId }, { userId: userObjId }, { id: userObjId })
  if (userStr) userQueries.push({ _id: userStr }, { userId: userStr }, { id: userStr })

  const modelUser = userQueries.length ? await db.collection('users').findOne({ $or: userQueries }) : null

  // 3. Resolve Candidate Profile
  let modelProfile = userQueries.length ? await db.collection('modelProfiles').findOne({ $or: userQueries }) : null
  if (!modelProfile && userQueries.length) {
    modelProfile = await db.collection('businessProfiles').findOne({ $or: userQueries })
  }

  // 4. Resolve Candidate Portfolio & Avatar
  let portfolioList: string[] = []
  if (Array.isArray(modelProfile?.portfolio)) {
    portfolioList = modelProfile.portfolio.map((x: any) => String(x)).filter((s: string) => s.trim().length > 0)
  } else if (Array.isArray(modelUser?.portfolio)) {
    portfolioList = modelUser.portfolio.map((x: any) => String(x)).filter((s: string) => s.trim().length > 0)
  }

  const resolvedAvatar =
    modelProfile?.portfolio?.[0] ||
    modelProfile?.avatar ||
    modelProfile?.profilePicture ||
    modelProfile?.avatarUrl ||
    modelProfile?.image ||
    modelUser?.avatarUrl ||
    modelUser?.avatar ||
    modelUser?.profilePicture ||
    app.modelAvatar ||
    null

  if (portfolioList.length === 0 && resolvedAvatar) {
    portfolioList = [resolvedAvatar]
  }

  // 5. Resolve Business User
  let businessUser = null
  if (oppDoc?.createdBy || oppDoc?.businessOwnerId) {
    const bizId = oppDoc.createdBy || oppDoc.businessOwnerId
    const bizObjId = safeId(bizId)
    const bizStr = toStr(bizId)
    const bizQueries: any[] = []
    if (bizObjId) bizQueries.push({ _id: bizObjId })
    if (bizStr) bizQueries.push({ _id: bizStr }, { id: bizStr })
    businessUser = bizQueries.length ? await db.collection('users').findOne({ $or: bizQueries }) : null
  }

  const modelFullName = modelProfile?.name ||
    (modelUser ? `${modelUser.firstName || ''} ${modelUser.lastName || ''}`.trim() : '') ||
    app.modelName ||
    'Model Talent'

  return {
    ...app,
    // Candidate details for Owner
    modelName: modelFullName,
    modelAvatar: resolvedAvatar,
    modelBio: modelProfile?.bio || '',
    modelCity: modelProfile?.location?.city || modelProfile?.city || '',
    modelGender: modelProfile?.gender || '',
    modelHeight: modelProfile?.height || '',
    modelSpecialties: modelProfile?.specialties || app.modelSpecialties || [],
    modelPortfolio: portfolioList,
    modelRating: modelProfile?.rating || 4.9,
    modelInstagram: modelProfile?.instagram || modelProfile?.socialHandles?.instagram || modelProfile?.socialHandle || '',
    modelPhone: app.phone || app.contactNumber || modelUser?.phone || modelProfile?.phone || '',
    modelEmail: modelUser?.email || modelProfile?.email || '',

    // Company & Opportunity details for Model
    opportunityTitle: oppDoc?.title || 'Photoshoot',
    opportunityCategory: oppDoc?.category || oppDoc?.type || 'Fashion',
    businessName: oppDoc?.businessName || (businessUser ? `${businessUser.firstName || ''} ${businessUser.lastName || ''}`.trim() : 'Production Studio'),
    businessOwnerId: oppDoc?.createdBy || '',
    businessPhone: oppDoc?.phone || oppDoc?.contactNumber || businessUser?.phone || '',
    contactPersonName: oppDoc?.contactPersonName || '',
    contactPersonDesignation: oppDoc?.contactPersonDesignation || '',
    opportunityBudgetMin: oppDoc?.budget?.min ?? oppDoc?.budgetMin ?? 0,
    opportunityBudgetMax: oppDoc?.budget?.max ?? oppDoc?.budgetMax ?? 0,
    isPriceOnCall: oppDoc?.isPriceOnCall ?? ((oppDoc?.budget?.max ?? 0) <= 0),
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

