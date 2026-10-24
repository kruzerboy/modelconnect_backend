import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'

const DEFAULT_PLANS = [
  { name: 'Starter Casting', code: 'starter', price: 999, includedPosts: 1 },
  { name: 'Production Pack', code: 'production_pack', price: 2499, includedPosts: 3 },
  { name: 'Agency Pro Desk', code: 'agency_pro', price: 6999, includedPosts: 10 },
]

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const { planCode, couponCode } = body

    if (!planCode) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'planCode is required')
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

      if (coupon && (!coupon.expiresAt || new Date(coupon.expiresAt) >= new Date())) {
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
    }

    const finalPayable = Math.max(0, basePrice - discountAmount)

    // 3. Handle Free Pass (No Razorpay order needed)
    if (finalPayable === 0) {
      return NextResponse.json(
        successResponse({
          isFreePass: true,
          planName: plan.name,
          planCode: plan.code,
          finalPayable: 0,
          keyId: '',
          orderId: `FREE_${Date.now()}`,
          amountInPaise: 0,
        })
      )
    }

    // 4. Razorpay Credentials (Test keys from ENV or fallback test sandbox)
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_bookshoot_demo'
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_demo'
    const amountInPaise = finalPayable * 100

    let razorpayOrderId = `order_test_${Date.now()}`

    // Attempt live Razorpay API order creation if configured
    if (
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      !process.env.RAZORPAY_KEY_ID.includes('demo')
    ) {
      try {
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${Date.now().toString().slice(-10)}`,
            notes: {
              userId: auth.userId,
              planCode: plan.code,
              couponCode: validatedCoupon?.code || '',
            },
          }),
        })

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json()
          razorpayOrderId = rzpData.id
        } else {
          const errData = await rzpRes.text()
          console.warn('[Razorpay Order Fallback]', errData)
        }
      } catch (err) {
        console.warn('[Razorpay API Network]', err)
      }
    }

    return NextResponse.json(
      successResponse({
        isFreePass: false,
        keyId,
        orderId: razorpayOrderId,
        amountInPaise,
        currency: 'INR',
        planName: plan.name,
        planCode: plan.code,
        basePrice,
        discountAmount,
        finalPayable,
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
