import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { businessProfileSchema, modelProfileSchema } from '@/lib/schemas'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { parseBody, serialize, objectId } from '@/lib/route-utils'

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const isBusiness = auth.role === 'business'
    const input = isBusiness
      ? await parseBody(request, businessProfileSchema)
      : await parseBody(request, modelProfileSchema)
    const db = await connectDb()
    const collection = isBusiness ? 'businessProfiles' : 'modelProfiles'
    const now = new Date()
    const profile = await db.collection(collection).findOneAndUpdate(
      { userId: auth.userId },
      { $set: { ...input, userId: auth.userId, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: 'after' }
    )

    const rawPhone = (input as any)?.phoneNumber || (input as any)?.phone
    if (rawPhone && typeof rawPhone === 'string' && rawPhone.trim()) {
      await db.collection('users').updateOne(
        { _id: objectId(auth.userId) },
        { $set: { phoneNumber: rawPhone.trim(), updatedAt: now } }
      )
    }

    const rawAvatar = (input as any)?.avatarUrl
    if (rawAvatar && typeof rawAvatar === 'string' && rawAvatar.trim()) {
      const trimmedAvatar = rawAvatar.trim()
      await db.collection('users').updateOne(
        { _id: objectId(auth.userId) },
        { $set: { avatarUrl: trimmedAvatar, profilePicture: trimmedAvatar, updatedAt: now } }
      )
      await db.collection('featuredProfiles').updateMany(
        { $or: [{ userId: auth.userId }, { userId: objectId(auth.userId) }] as any },
        { $set: { avatarUrl: trimmedAvatar, updatedAt: now } }
      )
    }

    return NextResponse.json(successResponse(serialize(profile)))

  } catch (error) { return handleApiError(error) }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const db = await connectDb()
    const isBusiness = auth.role === 'business'
    const collection = isBusiness ? 'businessProfiles' : 'modelProfiles'
    let profile = await db.collection(collection).findOne({ userId: auth.userId })
    const user = await db.collection('users').findOne({ _id: objectId(auth.userId) })

    if (!profile) {
      const now = new Date()
      const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''
      const defaultProfile = !isBusiness
        ? {
            userId: auth.userId,
            name: fullName || 'Creative Talent',
            email: user?.email || '',
            phoneNumber: user?.phoneNumber || '',
            socialHandle: user?.socialHandle || '',
            bio: '',
            specialties: [],
            roleTag: auth.role || 'talent',
            location: { city: '', country: '' },
            createdAt: now,
            updatedAt: now,
          }
        : {
            userId: auth.userId,
            companyName: fullName || 'Business Account',
            email: user?.email || '',
            phoneNumber: user?.phoneNumber || '',
            socialHandle: user?.socialHandle || '',
            industry: '',
            description: '',
            website: user?.socialHandle || '',
            location: { city: '', country: '' },
            createdAt: now,
            updatedAt: now,
          }
      await db.collection(collection).insertOne(defaultProfile)
      profile = await db.collection(collection).findOne({ userId: auth.userId })
    }

    if (profile && user) {
      if (!profile.socialHandle && user.socialHandle) profile.socialHandle = user.socialHandle
      if (!profile.roleTag && user.role) profile.roleTag = user.role
      if (!profile.phoneNumber && user.phoneNumber) profile.phoneNumber = user.phoneNumber
      if (!profile.avatarUrl && user.avatarUrl) profile.avatarUrl = user.avatarUrl
      if ((!profile.portfolio || profile.portfolio.length === 0) && user.avatarUrl) {
        profile.portfolio = [user.avatarUrl]
      }
    }

    // Check active spotlight status in featuredProfiles
    const userMatch = [
      { userId: auth.userId },
      { userId: objectId(auth.userId) },
      ...(user ? [{ userId: user._id?.toString() }, { userId: user._id }] : []),
    ]

    const activeSpotlight = await db.collection('featuredProfiles').findOne({
      $or: userMatch as any,
      active: { $ne: false },
      $and: [
        {
          $or: [
            { expiryDate: null },
            { expiryDate: { $exists: false } },
            { expiryDate: { $gt: new Date() } },
          ],
        },
      ],
    })

    const latestApp = await db.collection('featuredApplications').findOne(
      { $or: userMatch as any },
      { sort: { createdAt: -1 } }
    )

    const isFeatured = !!activeSpotlight || profile?.isFeatured === true || profile?.isSpotlight === true
    const isPending = !isFeatured && latestApp && latestApp.status === 'pending_review'
    const spotlightStatus = isFeatured ? 'active' : isPending ? 'pending_review' : 'none'

    const spotlightExpiresAt =
      activeSpotlight?.expiryDate || profile?.spotlightExpiresAt || latestApp?.expiryDate || null
    const spotlightSlot = activeSpotlight?.slotOrder || (profile as any)?.spotlightSlot || 1
    const spotlightBadge =
      activeSpotlight?.badge || latestApp?.badgeRequested || (profile as any)?.spotlightBadge || 'Spotlight Star'
    const spotlightDurationDays =
      activeSpotlight?.durationDays || latestApp?.durationDays || (profile as any)?.spotlightDurationDays || 14

    const responseData = {
      ...profile,
      phoneNumber: (profile as any)?.phoneNumber || user?.phoneNumber || '',
      isFeatured,
      isSpotlight: isFeatured,
      spotlightActive: isFeatured,
      spotlightStatus,
      isSpotlightPending: isPending,
      spotlightExpiresAt,
      spotlightSlot,
      spotlightBadge,
      spotlightDurationDays,
    }

    return NextResponse.json(successResponse(serialize(responseData)))
  } catch (error) { return handleApiError(error) }
}
