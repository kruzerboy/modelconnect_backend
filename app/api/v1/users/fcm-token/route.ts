import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { parseBody, serialize } from '@/lib/route-utils'
import { fcmTokenSchema } from '@/lib/schemas'
import { successResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const input = await parseBody(request, fcmTokenSchema)
    const db = await connectDb()
    const now = new Date()

    // Upsert token in userDevices collection
    await db.collection('userDevices').updateOne(
      { userId: auth.userId, fcmToken: input.fcmToken },
      {
        $set: {
          userId: auth.userId,
          role: auth.role,
          fcmToken: input.fcmToken,
          platform: input.platform || 'unknown',
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    )

    return NextResponse.json(successResponse({ registered: true, message: 'FCM device token registered' }))
  } catch (error) {
    return handleApiError(error)
  }
}
