import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { businessProfileSchema, modelProfileSchema } from '@/lib/schemas'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { parseBody, serialize, objectId } from '@/lib/route-utils'

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const input = auth.role === 'model'
      ? await parseBody(request, modelProfileSchema)
      : await parseBody(request, businessProfileSchema)
    const db = await connectDb()
    const collection = auth.role === 'model' ? 'modelProfiles' : 'businessProfiles'
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
    const collection = auth.role === 'model' ? 'modelProfiles' : 'businessProfiles'
    let profile = await db.collection(collection).findOne({ userId: auth.userId })
    if (!profile) {
      const user = await db.collection('users').findOne({ _id: objectId(auth.userId) })
      const now = new Date()
      const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''
      const defaultProfile = auth.role === 'model'
        ? {
            userId: auth.userId,
            name: fullName || 'Model Talent',
            email: user?.email || '',
            bio: '',
            specialties: [],
            location: { city: '', country: '' },
            createdAt: now,
            updatedAt: now,
          }
        : {
            userId: auth.userId,
            companyName: fullName || 'Business Account',
            email: user?.email || '',
            industry: '',
            description: '',
            website: '',
            location: { city: '', country: '' },
            createdAt: now,
            updatedAt: now,
          }
      await db.collection(collection).insertOne(defaultProfile)
      profile = await db.collection(collection).findOne({ userId: auth.userId })
    }
    return NextResponse.json(successResponse(serialize(profile)))
  } catch (error) { return handleApiError(error) }
}
