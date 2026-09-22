import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { objectId, serialize } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const db = await connectDb()
    const user = await db.collection('users').findOne({ _id: objectId(auth.userId) }, { projection: { passwordHash: 0 } })
    if (!user) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' }, timestamp: new Date().toISOString() }, { status: 404 })
    const profileCollection = auth.role === 'model' ? 'modelProfiles' : 'businessProfiles'
    const profile = await db.collection(profileCollection).findOne({ userId: auth.userId })
    return NextResponse.json(successResponse({ user: serialize(user), profile: serialize(profile) }))
  } catch (error) { return handleApiError(error) }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const db = await connectDb()
    const userObjId = objectId(auth.userId)

    const userQueries: any[] = []
    if (userObjId) userQueries.push({ _id: userObjId })
    userQueries.push({ _id: auth.userId }, { id: auth.userId })

    // 1. Delete user record
    await db.collection('users').deleteMany({ $or: userQueries })

    // 2. Delete role profiles
    await db.collection('modelProfiles').deleteMany({ userId: auth.userId })
    await db.collection('businessProfiles').deleteMany({ userId: auth.userId })

    // 3. Delete user applications
    await db.collection('applications').deleteMany({ userId: auth.userId })

    // 4. Delete user shortlists
    await db.collection('shortlists').deleteMany({
      $or: [{ ownerId: auth.userId }, { modelId: auth.userId }],
    })

    // 5. Delete notifications & device tokens
    await db.collection('notifications').deleteMany({ userId: auth.userId })
    await db.collection('fcmTokens').deleteMany({ userId: auth.userId })

    // 6. Delete opportunities created by user if business
    await db.collection('opportunities').deleteMany({
      $or: [{ createdBy: auth.userId }, { businessOwnerId: auth.userId }],
    })

    return NextResponse.json(
      successResponse({ deleted: true, message: 'Account and associated data deleted successfully' })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
