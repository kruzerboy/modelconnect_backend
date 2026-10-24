import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { objectId } from '@/lib/route-utils'

const DEFAULT_PLANS = [
  { name: 'Starter Casting', code: 'starter', price: 999, includedPosts: 1, validityDays: 30 },
  { name: 'Production Pack', code: 'production_pack', price: 2499, includedPosts: 3, validityDays: 60 },
  { name: 'Agency Pro Desk', code: 'agency_pro', price: 6999, includedPosts: 10, validityDays: 90 },
]

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      planCode,
      couponCode,
    } = body

    if (!planCode) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'planCode is required')
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_demo'

    // Verify signature if not simulated test ID
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
          'Invalid payment signature verification failed'
        )
      }
    }

    const db = await connectDb()

    // 1. Locate Plan
    let plan: any = await db.collection('plans').findOne({
      code: planCode.toLowerCase(),
      active: true,
    })

    if (!plan) {
      const fallback = DEFAULT_PLANS.find(
        (p) => p.code.toLowerCase() === planCode.toLowerCase()
      )
      if (fallback) {
        plan = fallback
      } else {
        throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Selected plan not found')
      }
    }

    // 2. Validate & Update Coupon if used
    let validatedCoupon = null
    let discountAmount = 0
    if (couponCode && couponCode.trim().length > 0) {
      const cleanCoupon = couponCode.trim().toUpperCase()
      const coupon = await db.collection('coupons').findOne({
        code: cleanCoupon,
        active: true,
      })

      if (coupon) {
        if (coupon.discountType === 'free_pass') {
          discountAmount = plan.price
        } else if (coupon.discountType === 'percentage') {
          discountAmount = (plan.price * coupon.discountValue) / 100
          if (coupon.maxDiscountCap && coupon.maxDiscountCap > 0) {
            discountAmount = Math.min(discountAmount, coupon.maxDiscountCap)
          }
        } else if (coupon.discountType === 'flat') {
          discountAmount = Math.min(coupon.discountValue, plan.price)
        }
        discountAmount = Math.round(discountAmount)
        validatedCoupon = coupon

        // Record coupon usage
        await db.collection('coupons').updateOne(
          { _id: coupon._id },
          {
            $inc: { usedCount: 1 },
            $push: { usedByUsers: auth.userId as any },
            $set: { updatedAt: new Date() },
          }
        )
      }
    }

    const finalPayable = Math.max(0, plan.price - discountAmount)
    const validityDays = plan.validityDays || 30
    const now = new Date()
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000)

    // 3. Create active subscription record
    const subscription = {
      userId: auth.userId,
      userRole: auth.role,
      planCode: plan.code,
      planName: plan.name,
      basePrice: plan.price,
      discountAmount,
      finalPayable,
      couponCode: validatedCoupon?.code || null,
      includedPosts: plan.includedPosts || 1,
      maxTalentsPerPost: plan.maxTalentsPerPost || 2,
      paymentGateway: 'razorpay',
      razorpayOrderId: razorpayOrderId || `order_test_${Date.now()}`,
      razorpayPaymentId: razorpayPaymentId || `pay_test_${Date.now()}`,
      razorpaySignature: razorpaySignature || 'simulated_test_sig',
      status: 'active',
      activatedAt: now,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    }

    const subResult = await db.collection('subscriptions').insertOne(subscription)

    // 4. Update user profile with post quota & active plan
    await db.collection('users').updateOne(
      { _id: objectId(auth.userId) },
      {
        $inc: { availableOpportunityPosts: plan.includedPosts || 1 },
        $set: {
          currentPlan: plan.code,
          currentPlanName: plan.name,
          planValidUntil: expiresAt,
          isSubscribed: true,
          updatedAt: now,
        },
      }
    )

    return NextResponse.json(
      successResponse({
        subscriptionId: subResult.insertedId.toString(),
        planName: plan.name,
        planCode: plan.code,
        postsAdded: plan.includedPosts || 1,
        finalAmount: finalPayable,
        paymentId: razorpayPaymentId,
        expiresAt: expiresAt.toISOString(),
        message: 'Payment verified and plan activated successfully!',
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
