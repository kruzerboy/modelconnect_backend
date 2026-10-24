import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'

const DEFAULT_BANNERS = [
  {
    title: 'Summer High Fashion Campaign 2025',
    subtitle: 'Now casting runway models for Mumbai & Delhi shoots',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'View Castings',
    targetType: 'casting',
    targetPayload: 'model',
    gradientColors: ['#00204B', '#0877E8'],
    badge: 'Trending Now',
    displayOrder: 1,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'Top Tier Cinematography Crews',
    subtitle: 'Equipped with RED V-Raptor & Sony FX6 camera packages',
    imageUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Hire Crew',
    targetType: 'category',
    targetPayload: 'camera',
    gradientColors: ['#00204B', '#0877E8'],
    badge: 'Equipment Ready',
    displayOrder: 2,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: 'DGCA Certified Aerial Shoots',
    subtitle: 'Licensed drone pilots for high-end cinematic commercials',
    imageUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Book Pilot',
    targetType: 'category',
    targetPayload: 'drone',
    gradientColors: ['#00204B', '#0877E8'],
    badge: 'DGCA Verified',
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

    let banners = await bannersCollection
      .find({ active: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .toArray()

    // Auto-seed if empty for immediate production availability
    if (banners.length === 0) {
      await bannersCollection.insertMany(DEFAULT_BANNERS)
      banners = await bannersCollection
        .find({ active: true })
        .sort({ displayOrder: 1 })
        .toArray()
    }

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
