import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const db = await connectDb()
    const featuredCollection = db.collection('featuredProfiles')
    const usersCollection = db.collection('users')
    const modelProfilesCollection = db.collection('modelProfiles')
    const businessProfilesCollection = db.collection('businessProfiles')

    const now = new Date()
    const featuredDocs = await featuredCollection
      .find({
        active: { $ne: false },
        $or: [
          { expiryDate: null },
          { expiryDate: { $exists: false } },
          { expiryDate: { $gt: now } },
        ],
      })
      .sort({ slotOrder: 1, createdAt: -1 })
      .toArray()

    let creators = []

    if (featuredDocs.length > 0) {
      creators = await Promise.all(
        featuredDocs.map(async (slot) => {
          let user = null
          if (ObjectId.isValid(slot.userId)) {
            user = await usersCollection.findOne({ _id: new ObjectId(slot.userId) })
          }
          if (!user) {
            user = await usersCollection.findOne({ id: slot.userId })
          }

          const modelProf = await modelProfilesCollection.findOne({ userId: slot.userId })
          const bizProf = await businessProfilesCollection.findOne({ userId: slot.userId })

          const isBiz =
            user?.role === 'business' ||
            slot.role === 'business' ||
            slot.role === 'production_house' ||
            !!bizProf

          const name = isBiz
            ? bizProf?.companyName || user?.fullName || 'Verified Studio'
            : user?.fullName ||
              `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
              'Featured Talent'

          const avatar = isBiz
            ? bizProf?.logoUrl || user?.profilePicture || user?.avatarUrl
            : user?.profilePicture ||
              user?.avatarUrl ||
              (modelProf?.portfolio && modelProf.portfolio.length > 0
                ? modelProf.portfolio[0]
                : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80')

          const photos = isBiz
            ? bizProf?.portfolio || [avatar]
            : modelProf?.portfolio && modelProf.portfolio.length > 0
            ? modelProf.portfolio
            : [avatar]

          return {
            id: slot.userId || slot._id?.toString(),
            name,
            role: slot.role || user?.role || (isBiz ? 'business' : 'model'),
            avatarUrl: avatar,
            city: isBiz
              ? bizProf?.location?.city || 'Mumbai'
              : modelProf?.location?.city || 'Mumbai',
            country: 'India',
            rating: slot.rating || 4.9,
            reviewCount: slot.reviewCount || 32,
            startingPrice:
              slot.startingPrice ||
              (isBiz ? bizProf?.dailyRate || 15000 : modelProf?.dailyRate || 8500),
            priceUnit: '/ day',
            experience: isBiz
              ? `${bizProf?.yearsInBusiness || 5}+ years in production`
              : modelProf?.experience || '4+ years professional',
            specialties: isBiz
              ? bizProf?.services || ['Commercial Studio', 'Arri/Sony Cine Gear', 'Casting']
              : modelProf?.specialties || ['Editorial & High Fashion', 'Runway', 'Brand Commercials'],
            bio: isBiz
              ? bizProf?.tagline || 'Full-service production studio for brand campaigns.'
              : modelProf?.bio || 'Verified talent represented on BookShoot Platform.',
            compCardPhotos: photos,
            isVerified: true,
            badge: slot.badge || (isBiz ? 'STUDIO' : 'VERIFIED'),
          }
        })
      )
    } else {
      // Fallback: Populate top models & businesses
      const topModels = await modelProfilesCollection
        .find({ 'verification.status': 'verified' })
        .limit(6)
        .toArray()

      const modelList = await Promise.all(
        topModels.map(async (p) => {
          let u = null
          if (ObjectId.isValid(p.userId)) {
            u = await usersCollection.findOne({ _id: new ObjectId(p.userId) })
          }
          if (!u) {
            u = await usersCollection.findOne({ id: p.userId })
          }

          const avatar =
            u?.profilePicture ||
            u?.avatarUrl ||
            (p.portfolio && p.portfolio.length > 0
              ? p.portfolio[0]
              : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80')

          return {
            id: p.userId,
            name:
              u?.fullName ||
              `${u?.firstName || ''} ${u?.lastName || ''}`.trim() ||
              'Top Model',
            role: u?.role || 'model',
            avatarUrl: avatar,
            city: p.location?.city || 'Mumbai',
            country: 'India',
            rating: 4.9,
            reviewCount: 28,
            startingPrice: p.dailyRate || 8000,
            priceUnit: '/ day',
            experience: p.experience || 'Professional',
            specialties: p.specialties || ['Editorial', 'Runway'],
            bio: p.bio || 'Verified professional talent.',
            compCardPhotos: p.portfolio || [avatar],
            isVerified: true,
          }
        })
      )

      const topBiz = await businessProfilesCollection.find({}).limit(3).toArray()
      const bizList = await Promise.all(
        topBiz.map(async (b) => {
          const avatar =
            b.logoUrl ||
            'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80'
          return {
            id: b.userId,
            name: b.companyName || 'Studio & Production',
            role: 'business',
            avatarUrl: avatar,
            city: b.location?.city || 'Mumbai',
            country: 'India',
            rating: 4.95,
            reviewCount: 45,
            startingPrice: b.dailyRate || 18000,
            priceUnit: '/ day',
            experience: 'Studio Production Hire',
            specialties: b.services || ['Studio Hire', 'Cinema Cameras', 'Lighting Gear'],
            bio: b.tagline || 'Professional production studio.',
            compCardPhotos: b.portfolio || [avatar],
            isVerified: true,
            badge: 'STUDIO',
          }
        })
      )

      creators = [...modelList, ...bizList]
    }

    return NextResponse.json(
      successResponse(serialize(creators)),
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
