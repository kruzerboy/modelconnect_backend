import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'

const DEFAULT_PLANS = [
  {
    name: 'Starter Casting',
    code: 'starter',
    price: 999,
    billingCycle: 'one_time',
    includedPosts: 1,
    maxTalentsPerPost: 2,
    features: [
      '1 Casting Opportunity Post (Live 30 days)',
      'Up to 2 Talent Requirements (e.g. 2 models)',
      'Unlimited applicant submissions',
      'Standard comp card review',
      'Direct in-app messaging with applicants',
    ],
    badge: 'Starter',
    highlight: false,
    active: true,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Production Pack',
    code: 'production_pack',
    price: 2499,
    billingCycle: 'one_time',
    includedPosts: 3,
    maxTalentsPerPost: 4,
    features: [
      '3 Casting Opportunity Posts (Save 17%)',
      'Up to 4 Talents per post (Models + Camera crew)',
      'Priority Talent Notification Alert',
      'High-resolution comp card inspector',
      'Direct WhatsApp / Phone contact unlock',
    ],
    badge: 'Most Popular',
    highlight: true,
    active: true,
    displayOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Agency Pro Desk',
    code: 'agency_pro',
    price: 6999,
    billingCycle: 'monthly',
    includedPosts: 10,
    maxTalentsPerPost: 10,
    features: [
      '10 Casting Opportunity Posts / month',
      'Up to 10 Talents per post (Full commercial crew)',
      'Featured Top placement on Mobile Home Feed',
      'Google AI automated comp card quality scoring',
      'Dedicated casting manager & WhatsApp support',
    ],
    badge: 'Best Value',
    highlight: false,
    active: true,
    displayOrder: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export async function GET(request: NextRequest) {
  try {
    const db = await connectDb()
    const plansCollection = db.collection('plans')

    let plans = await plansCollection
      .find({ active: true })
      .sort({ displayOrder: 1, createdAt: 1 })
      .toArray()

    if (plans.length === 0) {
      await plansCollection.insertMany(DEFAULT_PLANS)
      plans = await plansCollection
        .find({ active: true })
        .sort({ displayOrder: 1 })
        .toArray()
    }

    return NextResponse.json(
      successResponse(serialize(plans)),
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
