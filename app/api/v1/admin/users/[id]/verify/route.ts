import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError, requireAdmin } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { objectId } from '@/lib/route-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { verified } = body

    if (typeof verified !== 'boolean') {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'verified (boolean) is required')
    }

    const db = await connectDb()
    const userObjectId = objectId(id)

    // Update user record
    const userResult = await db.collection('users').findOneAndUpdate(
      { _id: userObjectId },
      {
        $set: {
          isVerified: verified,
          verified: verified,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    if (!userResult) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'User not found')
    }

    // Also sync verification state to modelProfiles or businessProfiles
    await Promise.all([
      db.collection('modelProfiles').updateMany(
        { userId: id },
        { $set: { isVerified: verified, verified: verified, updatedAt: new Date() } }
      ),
      db.collection('businessProfiles').updateMany(
        { userId: id },
        { $set: { isVerified: verified, verified: verified, updatedAt: new Date() } }
      ),
    ])

    return NextResponse.json(
      successResponse(
        { id, verified },
        verified ? 'User verified successfully' : 'User verification revoked'
      )
    )
  } catch (error) {
    return handleApiError(error)
  }
}
