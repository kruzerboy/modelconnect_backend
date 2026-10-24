import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { validateCouponSchema } from '@/lib/schemas'
import { handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { parseBody } from '@/lib/route-utils'

export async function POST(request: NextRequest) {
  try {
    const { code, amount, planCode, userId } = await parseBody(
      request,
      validateCouponSchema
    )

    const db = await connectDb()
    const coupon = await db.collection('coupons').findOne({
      code: code.toUpperCase(),
      active: true,
    })

    if (!coupon) {
      throw new ApiError(
        ERROR_CODES.NOT_FOUND,
        404,
        'Invalid or expired promo code'
      )
    }

    // Expiry check
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        'This promo code has expired'
      )
    }

    // Total usage limit check
    const usedCount = coupon.usedCount || 0
    if (coupon.totalUsageLimit && usedCount >= coupon.totalUsageLimit) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        'This promo code has reached its maximum redemption limit'
      )
    }

    // Per user usage check
    if (userId && Array.isArray(coupon.usedByUsers) && coupon.usedByUsers.includes(userId)) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        'You have already redeemed this promotional offer'
      )
    }

    // Minimum order amount check
    if (coupon.minOrderAmount && amount < coupon.minOrderAmount) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        `This promo code requires a minimum order amount of ₹${coupon.minOrderAmount}`
      )
    }

    // Plan applicability check
    if (
      planCode &&
      Array.isArray(coupon.applicablePlans) &&
      !coupon.applicablePlans.includes('all') &&
      !coupon.applicablePlans.includes(planCode)
    ) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        400,
        'This promo code is not applicable to the selected plan'
      )
    }

    // Discount Calculation
    let discountAmount = 0
    if (coupon.discountType === 'free_pass') {
      discountAmount = amount
    } else if (coupon.discountType === 'percentage') {
      discountAmount = (amount * coupon.discountValue) / 100
      if (coupon.maxDiscountCap && coupon.maxDiscountCap > 0) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountCap)
      }
    } else if (coupon.discountType === 'flat') {
      discountAmount = Math.min(coupon.discountValue, amount)
    }

    discountAmount = Math.round(discountAmount)
    const finalPayable = Math.max(0, amount - discountAmount)

    return NextResponse.json(
      successResponse({
        valid: true,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        originalAmount: amount,
        finalPayable,
        isFreePass: finalPayable === 0,
        message:
          finalPayable === 0
            ? '100% Free Special Offer Applied!'
            : `Promo code applied! You saved ₹${discountAmount}`,
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
