import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { serialize, queryParam } from '@/lib/route-utils'

const DEFAULT_BANNERS = [
  // ── Talent-Targeted Banners (Models, Videographers, Drone Pilots) ──
  {
    title: 'Commercial Brand Shoots',
    subtitle: 'Earn up to ₹45,000 / day on top fashion & lifestyle campaigns',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Explore Shoots',
    targetType: 'casting',
    targetPayload: 'model',
    targetAudience: 'talent',
    gradientColors: ['#00204B', '#0877E8'],
    badge: '🔥 NOW CASTING',
    displayOrder: 1,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Hire Camera Crew & Cine Gear',
    subtitle: '4K Cinema rigs, Sony FX3 / RED operators & gaffers on call',
    imageUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Find Crew',
    targetType: 'category',
    targetPayload: 'camera',
    targetAudience: 'talent',
    gradientColors: ['#00204B', '#0877E8'],
    badge: '🎬 CINE & GEAR',
    displayOrder: 2,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'DGCA Certified Aerial Shoots',
    subtitle: 'Cinematic FPV & commercial aerial shoots across major cities',
    imageUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Hire Pilots',
    targetType: 'category',
    targetPayload: 'drone',
    targetAudience: 'talent',
    gradientColors: ['#00204B', '#0877E8'],
    badge: '🛸 AERIAL CINEMA',
    displayOrder: 3,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Stand Out To Top Agencies',
    subtitle: 'Update your composite card & portfolio to get hired 3x faster',
    imageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'View Talent',
    targetType: 'creator',
    targetPayload: 'creators',
    targetAudience: 'talent',
    gradientColors: ['#00204B', '#0877E8'],
    badge: '✨ COMP CARD PRO',
    displayOrder: 4,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // ── Business Owner-Targeted Banners (Studios, Brands, Agencies) ──
  {
    title: 'Founder Launch Offer: 3 Free Castings',
    subtitle: 'Post your commercial casting calls with zero platform fees',
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Post Casting Call',
    targetType: 'casting',
    targetPayload: 'post_opportunity',
    targetAudience: 'business',
    gradientColors: ['#00204B', '#0877E8'],
    badge: '🚀 FOUNDER LAUNCH',
    displayOrder: 1,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Top Rated Creator Portfolios',
    subtitle: 'Browse 5-star models, DP directors & licensed drone teams',
    imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Discover Talent',
    targetType: 'creator',
    targetPayload: 'creators',
    targetAudience: 'business',
    gradientColors: ['#00204B', '#0877E8'],
    badge: '⭐ VERIFIED PORTFOLIOS',
    displayOrder: 2,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Commercial Aerial Drone Crew',
    subtitle: 'Insured pilots with 4K HDR drones ready for location shoots',
    imageUrl: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Find Drone Crew',
    targetType: 'category',
    targetPayload: 'drone',
    targetAudience: 'business',
    gradientColors: ['#00204B', '#0877E8'],
    badge: '🛸 AERIAL FOOTAGE',
    displayOrder: 3,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export async function GET(request: NextRequest) {
  try {
    const db = await connectDb()
    const bannersCollection = db.collection('banners')

    // Check count and seed defaults if empty
    const count = await bannersCollection.countDocuments()
    if (count === 0) {
      await bannersCollection.insertMany(DEFAULT_BANNERS)
    }

    const rawAudience =
      queryParam(request, 'targetAudience') ||
      queryParam(request, 'role') ||
      queryParam(request, 'audience')

    const filter: Record<string, any> = { active: true }

    if (rawAudience && rawAudience !== 'all') {
      const audience = rawAudience.toLowerCase()
      // Normalize 'model', 'camera', 'drone' to 'talent'
      const normalized =
        audience === 'business' || audience === 'owner' ? 'business' : 'talent'

      filter.$or = [
        { targetAudience: normalized },
        { targetAudience: 'all' },
        { targetAudience: { $exists: false } },
      ]
    }

    const banners = await bannersCollection
      .find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .toArray()

    return NextResponse.json(
      successResponse(serialize(banners)),
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
