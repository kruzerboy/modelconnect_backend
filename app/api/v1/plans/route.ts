import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'

const DEFAULT_PLANS = [
  // ── Talent & Model Membership Plans ──
  {
    name: 'Model Pro Creator',
    code: 'model_pro',
    price: 499,
    billingCycle: 'monthly',
    includedPosts: 50,
    maxTalentsPerPost: 0,
    targetAudience: 'model',
    features: [
      'Unlimited High-Budget Casting Applications',
      'Verified Model Badge on Feed & Comp Card',
      'Priority Review by Top Casting Directors',
      'Direct WhatsApp Inquiry Unlock from Agencies',
      'Zero Platform Commission on Bookings',
      'High-Resolution Lookbook Gallery (Up to 15 Photos)',
    ],
    badge: 'POPULAR',
    highlight: true,
    active: true,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Model Elite VIP',
    code: 'model_elite',
    price: 999,
    billingCycle: 'monthly',
    includedPosts: 100,
    maxTalentsPerPost: 0,
    targetAudience: 'model',
    features: [
      'All Pro Creator Features Included',
      'Guaranteed Top 3 Placement in Model Search',
      'Monthly Featured Spotlight Carousel Inclusion',
      'Free Video Showreel / Portfolio Hosting',
      'Direct Agent Representation Inquiries',
      'Personal Booking Concierge & Contract Support',
    ],
    badge: 'VIP ELITE',
    highlight: false,
    active: true,
    displayOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Camera & Cine Pro',
    code: 'camera_pro',
    price: 1499,
    billingCycle: 'monthly',
    includedPosts: 100,
    maxTalentsPerPost: 0,
    targetAudience: 'camera',
    features: [
      'Unlimited Commercial Crew Applications',
      'DGCA License & Cine Rig Badge Verification',
      'Direct Hiring by Production Houses',
      'Spotlight Placement in Crew Directory',
      'Zero Commission on Equipment / Shoot Bookings',
    ],
    badge: 'CREW PRO',
    highlight: false,
    active: true,
    displayOrder: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // ── Business, Casting & Studio Plans ──
  {
    name: 'Starter Casting',
    code: 'starter_casting',
    price: 999,
    billingCycle: 'one_time',
    includedPosts: 1,
    maxTalentsPerPost: 2,
    targetAudience: 'business',
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
    displayOrder: 4,
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
    targetAudience: 'business',
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
    displayOrder: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Studio Enterprise',
    code: 'business_enterprise',
    price: 4999,
    billingCycle: 'monthly',
    includedPosts: 15,
    maxTalentsPerPost: 10,
    targetAudience: 'business',
    features: [
      'Unlimited Casting Calls / month',
      'Access to Entire Verified Talent Roster',
      'Featured Studio Profile on Home Feed',
      'Automated Comp Card Shortlisting',
      'Dedicated Account Manager (SLA < 1 Hr)',
    ],
    badge: 'Best Value',
    highlight: false,
    active: true,
    displayOrder: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetAudience = searchParams.get('targetAudience')

    const db = await connectDb()
    const plansCollection = db.collection('plans')

    let query: any = { active: { $ne: false } }
    if (targetAudience && targetAudience !== 'all') {
      if (targetAudience === 'model' || targetAudience === 'talent') {
        query.targetAudience = { $in: ['model', 'talent', 'camera', 'drone', 'all'] }
      } else {
        query.targetAudience = { $in: [targetAudience, 'all'] }
      }
    }

    let plans = await plansCollection
      .find(query)
      .sort({ displayOrder: 1, createdAt: 1 })
      .toArray()

    // If database has no plans at all, seed with full roster
    const totalCount = await plansCollection.countDocuments({})
    if (totalCount === 0) {
      await plansCollection.insertMany(DEFAULT_PLANS)
      plans = await plansCollection
        .find(query)
        .sort({ displayOrder: 1 })
        .toArray()
    }

    // Fallback if query returned 0 from database
    if (plans.length === 0) {
      plans = DEFAULT_PLANS.filter((p) => {
        if (!targetAudience || targetAudience === 'all') return true
        if (targetAudience === 'model' || targetAudience === 'talent') {
          return (
            p.targetAudience === 'model' ||
            p.targetAudience === 'camera' ||
            p.targetAudience === 'all'
          )
        }
        return p.targetAudience === targetAudience || p.targetAudience === 'all'
      })
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
