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
    }

    return NextResponse.json(successResponse(serialize(profile)))
  } catch (error) { return handleApiError(error) }
}
