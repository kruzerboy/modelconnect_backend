import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { checkoutPlanSchema } from '@/lib/schemas'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { parseBody, objectId } from '@/lib/route-utils'

const DEFAULT_PLANS = [
  {
    name: 'Starter Casting',
    code: 'starter',
    price: 999,
    includedPosts: 1,
    maxTalentsPerPost: 2,
    validityDays: 30,
  },
  {
    name: 'Production Pack',
    code: 'production_pack',
    price: 2499,
    includedPosts: 3,
    maxTalentsPerPost: 4,
    validityDays: 60,
  },
  {
    name: 'Agency Pro Desk',
    code: 'agency_pro',
    price: 6999,
    includedPosts: 10,
    maxTalentsPerPost: 10,
    validityDays: 90,
  },
]

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const { planCode, couponCode, paymentMethod, paymentTransactionId } =
      await parseBody(request, checkoutPlanSchema)

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
        throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Selected plan not found or inactive')
      }
    }

    const basePrice = plan.price
    let discountAmount = 0
    let validatedCoupon = null

    // 2. Validate Coupon if provided
    if (couponCode && couponCode.trim().length > 0) {
      const cleanCoupon = couponCode.trim().toUpperCase()
      const coupon = await db.collection('coupons').findOne({
        code: cleanCoupon,
        active: true,
      })

      if (!coupon) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Invalid or expired promo code')
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'This promo code has expired')
      }

      const usedCount = coupon.usedCount || 0
      if (coupon.totalUsageLimit && usedCount >= coupon.totalUsageLimit) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          400,
          'This promo code has reached its maximum redemption limit'
        )
      }

      if (
        Array.isArray(coupon.usedByUsers) &&
        coupon.usedByUsers.includes(auth.userId)
      ) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          400,
          'You have already redeemed this promotional offer'
        )
      }

      if (coupon.minOrderAmount && basePrice < coupon.minOrderAmount) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          400,
          `This promo code requires a minimum order amount of ₹${coupon.minOrderAmount}`
        )
      }

      if (
        Array.isArray(coupon.applicablePlans) &&
        !coupon.applicablePlans.includes('all') &&
        !coupon.applicablePlans.includes(plan.code)
      ) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          400,
          'This promo code is not applicable to the selected plan'
        )
      }

      // Calculate discount
      if (coupon.discountType === 'free_pass') {
        discountAmount = basePrice
      } else if (coupon.discountType === 'percentage') {
        discountAmount = (basePrice * coupon.discountValue) / 100
        if (coupon.maxDiscountCap && coupon.maxDiscountCap > 0) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscountCap)
        }
      } else if (coupon.discountType === 'flat') {
        discountAmount = Math.min(coupon.discountValue, basePrice)
      }

      discountAmount = Math.round(discountAmount)
      validatedCoupon = coupon
    }

    const finalPayable = Math.max(0, basePrice - discountAmount)
    const validityDays = plan.validityDays || 30
    const now = new Date()
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000)

    // 3. Record Subscription
    const subscription = {
      userId: auth.userId,
      userRole: auth.role,
      planCode: plan.code,
      planName: plan.name,
      basePrice,
      discountAmount,
      finalPayable,
      couponCode: validatedCoupon ? validatedCoupon.code : null,
      includedPosts: plan.includedPosts || 1,
      maxTalentsPerPost: plan.maxTalentsPerPost || 2,
      paymentMethod: paymentMethod || (finalPayable === 0 ? 'free_offer' : 'upi'),
      paymentTransactionId:
        paymentTransactionId ||
        (finalPayable === 0
          ? `FREE_${Date.now()}`
          : `TXN_${Date.now()}_${Math.floor(Math.random() * 10000)}`),
      status: 'active',
      activatedAt: now,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    }

    const subResult = await db.collection('subscriptions').insertOne(subscription)

    // 4. Update coupon usage
    if (validatedCoupon) {
      await db.collection('coupons').updateOne(
        { _id: validatedCoupon._id },
        {
          $inc: { usedCount: 1 },
          $push: { usedByUsers: auth.userId as any },
          $set: { updatedAt: now },
        }
      )
    }

    // 5. Update user profile with post quota & plan status
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
        discountApplied: discountAmount,
        expiresAt: expiresAt.toISOString(),
        message:
          finalPayable === 0
            ? 'VIP Free Pass activated! Your post quota is ready.'
            : 'Plan activated successfully! You can now publish casting opportunities.',
      }),
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
