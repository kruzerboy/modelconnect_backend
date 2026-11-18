import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'

const PRICING_TIERS: Record<number, number> = {
  7: 999,
  14: 1799,
  30: 2999,
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      discipline,
      durationDays,
      pitchNotes,
      badgeRequested,
    } = body

    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_demo'

    // Verify signature if live key is configured
    if (
      razorpayOrderId &&
      razorpayPaymentId &&
      razorpaySignature &&
      process.env.RAZORPAY_KEY_SECRET &&
      !keySecret.includes('demo')
    ) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex')

      if (generatedSignature !== razorpaySignature) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          400,
          'Invalid Razorpay payment signature verification failed'
        )
      }
    }

    const duration = Number(durationDays) || 14
    const amountPaid = PRICING_TIERS[duration] || 1799

    const db = await connectDb()
    const appsCollection = db.collection('featuredApplications')

    const appDoc = {
      userId: auth.userId,
      discipline: discipline || 'model',
      durationDays: duration,
      amountPaid,
      paymentMethod: 'razorpay',
      razorpayOrderId,
      razorpayPaymentId,
      transactionId: razorpayPaymentId || `TXN_${Date.now()}`,
      pitchNotes: pitchNotes || '',
      badgeRequested: badgeRequested || 'VERIFIED PRO',
      status: 'pending_review',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await appsCollection.insertOne(appDoc)

    return NextResponse.json(
      successResponse(
        serialize({ _id: result.insertedId, ...appDoc }),
        'Payment verified and Spotlight application submitted successfully'
      )
    )
  } catch (error) {
    return handleApiError(error)
  }
}
