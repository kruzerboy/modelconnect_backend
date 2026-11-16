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
  },

  // ── Influencer & Content Creator Membership Plans ──
  {
    name: 'Influencer Pro Creator',
    code: 'influencer_pro',
    price: 999,
    billingCycle: 'monthly',
    includedPosts: 50,
    maxTalentsPerPost: 0,
    targetAudience: 'influencer',
    features: [
      'Brand Collaboration & Campaign Applications',
      'Verified Influencer Badge on Profile',
      'Live Media Kit & Social Metrics Integration',
      'Direct WhatsApp & Agency Collab Requests',
      'Priority Shortlist in Brand Discovery Feed',
    ],
    badge: 'CREATOR PRO',
    highlight: true,
    active: true,
    displayOrder: 3,
  },
  {
    name: 'Influencer Elite VIP',
    code: 'influencer_elite',
    price: 1999,
    billingCycle: 'monthly',
    includedPosts: 100,
    maxTalentsPerPost: 0,
    targetAudience: 'influencer',
    features: [
      'All Influencer Pro Features Included',
      'Home Spotlight Banner Promotion for 30 Days',
      'Direct Invitations to Sponsored Brand Shoots',
      'Dedicated Talent Manager for Brand Deals',
      'Zero Commission on Sponsorship Contracts',
    ],
    badge: 'VIP CREATOR',
    highlight: false,
    active: true,
    displayOrder: 4,
  },

  // ── Camera & Cine Crew Plans ──
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
    displayOrder: 5,
  },
  {
    name: 'Camera Elite VIP',
    code: 'camera_elite',
    price: 2499,
    billingCycle: 'monthly',
    includedPosts: 200,
    maxTalentsPerPost: 0,
    targetAudience: 'camera',
    features: [
      'All Camera Pro Features Included',
      'Priority Hire on Feature Film & OTT Productions',
      'Equipment Rental Showcase on Home Feed',
      'Direct Production House Concierge',
    ],
    badge: 'CINE ELITE',
    highlight: false,
    active: true,
    displayOrder: 6,
  },

  // ── Drone & Video Editor Plans ──
  {
    name: 'Drone Master Pro',
    code: 'drone_pro',
    price: 1999,
    billingCycle: 'monthly',
    includedPosts: 100,
    maxTalentsPerPost: 0,
    targetAudience: 'drone',
    features: [
      'Unlimited Aerial / Drone Shoot Applications',
      'DGCA Verified Pilot Badge',
      'Featured in Drone Specialist Directory',
      'Direct Inquiries from Real Estate & Film Clients',
    ],
    badge: 'DRONE PRO',
    highlight: false,
    active: true,
    displayOrder: 7,
  },
  {
    name: 'Video Editor Pro',
    code: 'editor_pro',
    price: 999,
    billingCycle: 'monthly',
    includedPosts: 100,
    maxTalentsPerPost: 0,
    targetAudience: 'editor',
    features: [
      'Unlimited Post-Production & Reel Editing Gigs',
      'Verified Post-Production Specialist Badge',
      'Showreel / Video Portfolio Showcase',
      'Direct Client Messaging & File Delivery Unlock',
    ],
    badge: 'EDITOR PRO',
    highlight: false,
    active: true,
    displayOrder: 8,
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
    displayOrder: 9,
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
    displayOrder: 10,
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
    displayOrder: 11,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetAudience = searchParams.get('targetAudience')

    const db = await connectDb()
    const plansCollection = db.collection('plans')

    // Upsert default plans into MongoDB if not present by code
    for (const plan of DEFAULT_PLANS) {
      await plansCollection.updateOne(
        { code: plan.code },
        {
          $setOnInsert: {
            ...plan,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      )
    }

    const query: Record<string, unknown> = { active: { $ne: false } }
    if (targetAudience && targetAudience !== 'all') {
      const normalized = targetAudience.toLowerCase().trim()
      if (['model', 'talent', 'camera', 'drone', 'editor', 'developer', 'influencer'].includes(normalized)) {
        // Return plans for the specific role OR general talent/all plans
        query.targetAudience = { $in: [normalized, 'talent', 'all'] }
      } else {
        query.targetAudience = { $in: [normalized, 'all'] }
      }
    }

    const plans = await plansCollection
      .find(query)
      .sort({ displayOrder: 1, createdAt: 1 })
      .toArray()

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
