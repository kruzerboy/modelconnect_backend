import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { objectId, serialize } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request); const data = await (await connectDb()).collection('shortlists').find({ userId: auth.userId }).sort({ createdAt: -1 }).toArray()
    return NextResponse.json(successResponse(serialize(data)))
  } catch (error) { return handleApiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request); const body = await request.json(); const targetId = String(body.profileId || '')
    if (!objectId(targetId, 'profile id')) throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'profileId is required')
    const db = await connectDb(); const existing = await db.collection('shortlists').findOne({ userId: auth.userId, profileId: targetId })
    if (existing) return NextResponse.json(successResponse(serialize(existing)))
    const doc = { userId: auth.userId, profileId: targetId, notes: typeof body.notes === 'string' ? body.notes.slice(0, 1000) : '', createdAt: new Date() }
    const result = await db.collection('shortlists').insertOne(doc)
    return NextResponse.json(successResponse(serialize({ _id: result.insertedId, ...doc })), { status: 201 })
  } catch (error) { return handleApiError(error) }
}
