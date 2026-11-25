import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'
import { DEFAULT_SPOTLIGHT_PLANS } from '@/lib/spotlight-defaults'

export async function GET(request: NextRequest) {
  try {
    const db = await connectDb()
    const collection = db.collection('spotlightPlans')

    // Seed defaults if empty
    const count = await collection.countDocuments()
    if (count === 0) {
      const now = new Date()
      for (const plan of DEFAULT_SPOTLIGHT_PLANS) {
        await collection.updateOne(
          { durationDays: plan.durationDays },
          { $setOnInsert: { ...plan, createdAt: now, updatedAt: now } },
          { upsert: true }
        )
      }
    } else {
      // Fix any legacy test prices (e.g. 29, 49, 99) to official production pricing
      await collection.updateOne({ durationDays: 7, price: 29 }, { $set: { price: 999 } })
      await collection.updateOne({ durationDays: 14, price: { $in: [29, 49] } }, { $set: { price: 1799 } })
      await collection.updateOne({ durationDays: 30, price: 99 }, { $set: { price: 2999 } })
    }

    const plans = await collection
      .find({ active: { $ne: false } })
      .sort({ displayOrder: 1, durationDays: 1 })
      .toArray()

    return NextResponse.json(
      successResponse(serialize(plans.length > 0 ? plans : DEFAULT_SPOTLIGHT_PLANS)),
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
