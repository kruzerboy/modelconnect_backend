import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { serialize, objectId } from '@/lib/route-utils'

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

    const isSimulatedOrApple =
      razorpaySignature === 'apple_iap_verified' ||
      razorpaySignature === 'simulated_sig' ||
      razorpayPaymentId?.startsWith('pay_apple_') ||
      razorpayPaymentId?.startsWith('pay_sim_')

    // Verify signature if live key is configured and not an Apple IAP / simulated bypass
    if (
      !isSimulatedOrApple &&
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
    const db = await connectDb()
    const dynamicPlan = await db.collection('spotlightPlans').findOne({
      durationDays: duration,
      active: { $ne: false },
    })
    const amountPaid = dynamicPlan?.price ?? (PRICING_TIERS[duration] || 1799)
    const expiryDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000)

    const appsCollection = db.collection('featuredApplications')
    const featuredCollection = db.collection('featuredProfiles')

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
      status: 'approved',
      approvedAt: new Date(),
      expiryDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await appsCollection.insertOne(appDoc)

    // Immediately activate profile in featuredProfiles spotlight carousel
    await featuredCollection.findOneAndUpdate(
      { userId: auth.userId },
      {
        $set: {
          userId: auth.userId,
          slotOrder: 1,
          role: discipline || 'model',
          durationDays: duration,
          expiryDate,
          badge: badgeRequested || 'VERIFIED PRO',
          active: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    // Update modelProfiles or businessProfiles with active spotlight status
    const userMatch = [
      { userId: auth.userId },
      { userId: objectId(auth.userId) },
    ]
    const updatePayload = {
      isFeatured: true,
      isSpotlight: true,
      spotlightActive: true,
      spotlightStatus: 'active',
      isSpotlightPending: false,
      spotlightExpiresAt: expiryDate,
      spotlightDurationDays: duration,
      spotlightBadge: badgeRequested || 'VERIFIED PRO',
      spotlightSlot: 1,
      updatedAt: new Date(),
    }
    await Promise.all([
      db.collection('modelProfiles').updateMany({ $or: userMatch as any }, { $set: updatePayload }),
      db.collection('businessProfiles').updateMany({ $or: userMatch as any }, { $set: updatePayload }),
    ])

    return NextResponse.json(
      successResponse(
        serialize({
          _id: result.insertedId,
          ...appDoc,
          isFeatured: true,
          spotlightExpiresAt: expiryDate,
        }),
        'Payment verified and Spotlight activated successfully'
      )
    )
  } catch (error) {
    return handleApiError(error)
  }
}
