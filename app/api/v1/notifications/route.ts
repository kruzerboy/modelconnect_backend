import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request); const db = await connectDb(); const data = await db.collection('notifications').find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(50).toArray()
    return NextResponse.json(successResponse(serialize(data)))
  } catch (error) { return handleApiError(error) }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request); const body = await request.json(); const filter = body.id ? { _id: new (require('mongodb').ObjectId)(body.id), userId: auth.userId } : { userId: auth.userId }
    await (await connectDb()).collection('notifications').updateMany(filter, { $set: { read: true, readAt: new Date() } })
    return NextResponse.json(successResponse({ updated: true }))
  } catch (error) { return handleApiError(error) }
}
