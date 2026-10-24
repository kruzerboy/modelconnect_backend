import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { couponSchema } from '@/lib/schemas'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { parseBody, serialize } from '@/lib/route-utils'

const DEFAULT_COUPONS = [
  {
    code: 'FOUNDER100',
    description: '100% Free Founder Pass for early studio owners',
    discountType: 'free_pass',
    discountValue: 100,
    maxDiscountCap: 0,
    minOrderAmount: 0,
    applicablePlans: ['all'],
    totalUsageLimit: 100,
    usedCount: 0,
    perUserLimit: 1,
    usedByUsers: [],
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    code: 'LAUNCH50',
    description: '50% off on Starter & Production Packs',
    discountType: 'percentage',
    discountValue: 50,
    maxDiscountCap: 1250,
    minOrderAmount: 999,
    applicablePlans: ['starter', 'production_pack'],
    totalUsageLimit: 500,
    usedCount: 0,
    perUserLimit: 1,
    usedByUsers: [],
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    code: 'SAVE500',
    description: 'Flat ₹500 discount on any commercial pack',
    discountType: 'flat',
    discountValue: 500,
    maxDiscountCap: 500,
    minOrderAmount: 1500,
    applicablePlans: ['all'],
    totalUsageLimit: 250,
    usedCount: 0,
    perUserLimit: 1,
    usedByUsers: [],
    expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export async function GET(request: NextRequest) {
  try {
    const db = await connectDb()
    const couponsCollection = db.collection('coupons')

    let coupons = await couponsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    if (coupons.length === 0) {
      await couponsCollection.insertMany(DEFAULT_COUPONS)
      coupons = await couponsCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray()
    }

    return NextResponse.json(successResponse(serialize(coupons)))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const validatedData = await parseBody(request, couponSchema)

    const db = await connectDb()
    const couponDoc = {
      ...validatedData,
      usedCount: 0,
      usedByUsers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection('coupons').insertOne(couponDoc)

    return NextResponse.json(
      successResponse(
        serialize({ _id: result.insertedId, ...couponDoc }),
        'Promo code created successfully'
      ),
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
