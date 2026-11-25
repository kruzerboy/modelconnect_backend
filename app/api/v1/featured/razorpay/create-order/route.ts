import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'

const PRICING_TIERS: Record<number, number> = {
  7: 999,
  14: 1799,
  30: 2999,
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const durationDays = Number(body.durationDays) || 14
    const discipline = body.discipline || 'model'

    // Look up dynamic price from spotlightPlans collection (or fallback to PRICING_TIERS)
    const db = await connectDb()
    const dynamicPlan = await db.collection('spotlightPlans').findOne({
      durationDays,
      active: { $ne: false },
    })

    const amountInRupees = dynamicPlan?.price ?? (PRICING_TIERS[durationDays] || 1799)
    const amountInPaise = amountInRupees * 100

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_bookshoot_demo'
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_demo'

    let razorpayOrderId = `order_spotlight_${Date.now()}`

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
            receipt: `spotlight_${Date.now().toString().slice(-10)}`,
            notes: {
              userId: auth.userId,
              discipline,
              durationDays,
              type: 'featured_spotlight',
            },
          }),
        })

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json()
          razorpayOrderId = rzpData.id
        } else {
          const errData = await rzpRes.text()
          console.warn('[Razorpay Spotlight Order Error]', errData)
        }
      } catch (err) {
        console.warn('[Razorpay Spotlight Network Error]', err)
      }
    }

    return NextResponse.json(
      successResponse({
        keyId,
        orderId: razorpayOrderId,
        amountInPaise,
        currency: 'INR',
        amountInRupees,
        discipline,
        durationDays,
      })
    )
  } catch (error) {
    return handleApiError(error)
  }
}
