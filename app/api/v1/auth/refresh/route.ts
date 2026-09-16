import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '@/lib/auth'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/middleware'
import { objectId, serialize } from '@/lib/route-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const refreshToken = body.refreshToken || body.token
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new ApiError(ERROR_CODES.UNAUTHORIZED, 401, 'Refresh token is required')
    }

    const payload = await verifyRefreshToken(refreshToken)
    if (!payload || !payload.userId) {
      throw new ApiError(ERROR_CODES.INVALID_TOKEN, 401, 'Invalid or expired refresh token')
    }

    const db = await connectDb()
    const user = await db.collection('users').findOne(
      { _id: objectId(payload.userId) },
      { projection: { passwordHash: 0 } }
    )

    if (!user) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'User not found')
    }

    if (user.status === 'suspended') {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'Account is suspended')
    }

    const newAccessToken = await createAccessToken(user._id.toString(), user.role)
    const newRefreshToken = await createRefreshToken(user._id.toString())

    return NextResponse.json(
      successResponse({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: serialize(user),
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
