import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { planSchema } from '@/lib/schemas'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { parseBody, serialize } from '@/lib/route-utils'

const DEFAULT_ADMIN_PLANS = [
  {
    name: 'Model Pro Creator',
    code: 'model_pro',
    price: 499,
    monthlyPrice: 499,
    yearlyPrice: 4990,
    currency: 'INR',
    billingCycle: 'monthly',
    includedPosts: 50,
    postLimit: 50,
    maxTalentsPerPost: 0,
    targetAudience: 'model',
    tagline: 'Unlimited casting applications, verified model badge and priority reviews',
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
    monthlyPrice: 999,
    yearlyPrice: 9990,
    currency: 'INR',
    billingCycle: 'monthly',
    includedPosts: 100,
    postLimit: 100,
    maxTalentsPerPost: 0,
    targetAudience: 'model',
    tagline: 'Guaranteed top search placement and monthly homepage spotlight carousel',
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
    monthlyPrice: 1499,
    yearlyPrice: 14990,
    currency: 'INR',
    billingCycle: 'monthly',
    includedPosts: 100,
    postLimit: 100,
    maxTalentsPerPost: 0,
    targetAudience: 'camera',
    tagline: 'DGCA gear license verification & priority direct studio bookings',
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
  {
    name: 'Starter Casting',
    code: 'starter_casting',
    price: 999,
    monthlyPrice: 999,
    yearlyPrice: 9990,
    currency: 'INR',
    billingCycle: 'one_time',
    includedPosts: 1,
    postLimit: 1,
    maxTalentsPerPost: 2,
    targetAudience: 'business',
    tagline: 'Post 1 commercial casting call live for 30 days',
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
    monthlyPrice: 2499,
    yearlyPrice: 24990,
    currency: 'INR',
    billingCycle: 'one_time',
    includedPosts: 3,
    postLimit: 3,
    maxTalentsPerPost: 4,
    targetAudience: 'business',
    tagline: '3 casting calls with priority alerts & direct contact unlock',
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
    monthlyPrice: 4999,
    yearlyPrice: 49990,
    currency: 'INR',
    billingCycle: 'monthly',
    includedPosts: 15,
    postLimit: 15,
    maxTalentsPerPost: 10,
    targetAudience: 'business',
    tagline: 'Unlimited casting calls & direct creative crew talent sourcing',
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
    const db = await connectDb()
    let plans = await db
      .collection('plans')
      .find({})
      .sort({ displayOrder: 1, createdAt: 1 })
      .toArray()

    if (plans.length === 0) {
      await db.collection('plans').insertMany(DEFAULT_ADMIN_PLANS)
      plans = await db
        .collection('plans')
        .find({})
        .sort({ displayOrder: 1, createdAt: 1 })
        .toArray()
    }

    // Ensure all fields expected by admin panel & mobile app are normalized
    const normalized = plans.map((p) => ({
      ...p,
      monthlyPrice: Number(p.monthlyPrice ?? p.price ?? 0),
      yearlyPrice: Number(p.yearlyPrice ?? (p.monthlyPrice ? p.monthlyPrice * 10 : (p.price ? p.price * 10 : 0))),
      price: Number(p.price ?? p.monthlyPrice ?? 0),
      postLimit: Number(p.postLimit ?? p.includedPosts ?? 10),
      includedPosts: Number(p.includedPosts ?? p.postLimit ?? 10),
      targetAudience: p.targetAudience || 'all',
      tagline: p.tagline || '',
    }))

    return NextResponse.json(successResponse(serialize(normalized)))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const validatedData = await parseBody(request, planSchema)

    const db = await connectDb()
    const finalPrice = Number(validatedData.monthlyPrice || validatedData.price || 0)
    const finalPosts = Number(validatedData.postLimit || validatedData.includedPosts || 10)

    const planDoc = {
      ...validatedData,
      price: finalPrice,
      monthlyPrice: finalPrice,
      yearlyPrice: Number(validatedData.yearlyPrice || (finalPrice * 10)),
      includedPosts: finalPosts,
      postLimit: finalPosts,
      billingCycle: validatedData.billingCycle || 'monthly',
      targetAudience: validatedData.targetAudience || 'model',
      tagline: validatedData.tagline || '',
      currency: validatedData.currency || 'INR',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection('plans').insertOne(planDoc)

    return NextResponse.json(
      successResponse(
        serialize({ _id: result.insertedId, ...planDoc }),
        'Pricing plan created successfully'
      ),
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
