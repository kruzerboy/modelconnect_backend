import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { businessProfileSchema, modelProfileSchema } from '@/lib/schemas'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { parseBody, serialize } from '@/lib/route-utils'

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const schema = auth.role === 'model' ? modelProfileSchema : businessProfileSchema
    const input = await parseBody(request, schema)
    const db = await connectDb(); const collection = auth.role === 'model' ? 'modelProfiles' : 'businessProfiles'; const now = new Date()
    const profile = await db.collection(collection).findOneAndUpdate({ userId: auth.userId }, { $set: { ...input, userId: auth.userId, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true, returnDocument: 'after' })
    return NextResponse.json(successResponse(serialize(profile)))
  } catch (error) { return handleApiError(error) }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request); const db = await connectDb(); const collection = auth.role === 'model' ? 'modelProfiles' : 'businessProfiles'
    const profile = await db.collection(collection).findOne({ userId: auth.userId })
    if (!profile) throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Profile not found')
    return NextResponse.json(successResponse(serialize(profile)))
  } catch (error) { return handleApiError(error) }
}
