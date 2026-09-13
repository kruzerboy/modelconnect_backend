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
