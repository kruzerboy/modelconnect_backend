import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { connectDb } from '@/lib/db'
import { hashPassword, verifyPasswordResetToken } from '@/lib/auth'
import { passwordResetSchema } from '@/lib/schemas'
import { parseBody } from '@/lib/route-utils'
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
    const input = await parseBody(request, passwordResetSchema)
    const db = await connectDb()
    const now = new Date()

    let resetRecord = null

    // 1. Verify via OTP + email
    if (input.email && input.otp) {
      const email = input.email.toLowerCase().trim()
      const otp = input.otp.trim()

      const activeReset = await db.collection('passwordResets').findOne({
        email,
        used: false,
        expiresAt: { $gt: now },
      })

      if (activeReset && (activeReset.attempts || 0) >= 5) {
        throw new ApiError(
          ERROR_CODES.FORBIDDEN,
          429,
          'Too many invalid attempts. Please request a new verification code.'
        )
      }

      if (activeReset && activeReset.otp === otp) {
        resetRecord = activeReset
      } else if (activeReset) {
        // Increment invalid attempt count
        await db.collection('passwordResets').updateOne(
          { _id: activeReset._id },
          { $inc: { attempts: 1 } }
        )
      }
    }

    // 2. Fallback: verify via JWT reset token
    if (!resetRecord && input.token) {
      const payload = await verifyPasswordResetToken(input.token)
      if (payload?.userId) {
        resetRecord = await db.collection('passwordResets').findOne({
          token: input.token,
          used: false,
          expiresAt: { $gt: now },
        })
      }
    }

    if (!resetRecord) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        'Invalid or expired verification code. Please check the code or request a new one.'
      )
    }

    const userId = resetRecord.userId
    const newPasswordHash = await hashPassword(input.newPassword)

    // Update password in users collection
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          passwordHash: newPasswordHash,
          updatedAt: now,
        },
      }
    )

    // Mark reset record as used
    await db.collection('passwordResets').updateOne(
      { _id: resetRecord._id },
      {
        $set: {
          used: true,
          usedAt: now,
        },
      }
    )

    return NextResponse.json(
      successResponse(
        null,
        'Password has been reset successfully. You can now log in with your new password.'
      )
    )
  } catch (error) {
    return handleApiError(error)
  }
}
