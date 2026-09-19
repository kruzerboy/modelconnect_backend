import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { createPasswordResetToken } from '@/lib/auth'
import { passwordResetRequestSchema } from '@/lib/schemas'
import { parseBody } from '@/lib/route-utils'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { handleApiError } from '@/lib/middleware'
import { sendPasswordResetEmail } from '@/lib/email'

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
    const input = await parseBody(request, passwordResetRequestSchema)
    const email = input.email.toLowerCase().trim()
    const db = await connectDb()

    const user = await db.collection('users').findOne({ email })
    if (!user) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'No account found with this email address')
    }

    const userId = user._id.toString()
    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const token = await createPasswordResetToken(userId)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes validity

    // Invalidate any previous unused reset requests for this email
    await db.collection('passwordResets').deleteMany({ email })

    // Insert new reset record
    await db.collection('passwordResets').insertOne({
      email,
      userId,
      otp,
      token,
      expiresAt,
      used: false,
      createdAt: new Date(),
    })

    // Send email notification with OTP
    const name = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'
    const mailResult = await sendPasswordResetEmail({
      to: email,
      name,
      otp,
      resetToken: token,
    })

    const message = mailResult.devOtp
      ? 'Verification code generated (Test mode).'
      : 'A 6-digit password reset code has been sent to your email.'

    return NextResponse.json(
      successResponse(
        {
          email,
          token,
          devOtp: mailResult.devOtp, // Returned in dev/testing mode when email service is unverified
        },
        message
      )
    )
  } catch (error) {
    return handleApiError(error)
  }
}
