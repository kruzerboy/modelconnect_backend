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
  return db.collection('notifications').insertOne({
    _id: new (require('mongodb').ObjectId)(),
    userId,
    type,
    title,
    message,
    metadata: metadata || {},
    read: false,
    createdAt: new Date(),
  })
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
