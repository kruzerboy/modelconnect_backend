import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { createAccessToken, createRefreshToken, hashPassword, verifyPassword } from '@/lib/auth'
import { loginSchema } from '@/lib/schemas'
import { parseBody, serialize } from '@/lib/route-utils'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/middleware'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const input = await parseBody(request, loginSchema)
    const email = input.email.toLowerCase().trim()
    const db = await connectDb()
    const user = await db.collection('users').findOne({ email })
    if (!user) {
      throw new ApiError(ERROR_CODES.INVALID_CREDENTIALS, 401, 'Email or password is incorrect')
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash)
    const isFirebaseValid = Boolean(input.firebaseUid && (user.firebaseUid === input.firebaseUid || !user.firebaseUid))

    if (!isPasswordValid && !isFirebaseValid) {
      throw new ApiError(ERROR_CODES.INVALID_CREDENTIALS, 401, 'Email or password is incorrect')
    }

    // If verified by Firebase (e.g. user just reset their password via Google email link),
    // automatically sync the new password hash into MongoDB
    if (!isPasswordValid && isFirebaseValid) {
      const newHash = await hashPassword(input.password)
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { passwordHash: newHash, firebaseUid: input.firebaseUid, updatedAt: new Date() } }
      )
    } else if (input.firebaseUid && !user.firebaseUid) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { firebaseUid: input.firebaseUid, updatedAt: new Date() } }
      )
    }

    const userId = user._id.toString()
    const { passwordHash, ...safeUser } = user
    return NextResponse.json(successResponse({
      user: serialize(safeUser),
      accessToken: await createAccessToken(userId, user.role),
      refreshToken: await createRefreshToken(userId),
    }))
  } catch (error) { return handleApiError(error) }
}
