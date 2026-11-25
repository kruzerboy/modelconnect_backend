import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { featuredSlotSchema } from '@/lib/schemas'
import { handleApiError, requireAdmin } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { parseBody, serialize } from '@/lib/route-utils'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const db = await connectDb()
    const featuredCollection = db.collection('featuredProfiles')
    const usersCollection = db.collection('users')
    const modelProfilesCollection = db.collection('modelProfiles')

    // Find all active featured slots sorted by slotOrder
    const featuredDocs = await featuredCollection
      .find({})
      .sort({ slotOrder: 1, createdAt: -1 })
      .toArray()

    // Enrich with user and profile data
    const enriched = await Promise.all(
      featuredDocs.map(async (slot) => {
        let user = null
        if (ObjectId.isValid(slot.userId)) {
          user = await usersCollection.findOne({ _id: new ObjectId(slot.userId) })
        }
        if (!user) {
          user = await usersCollection.findOne({ id: slot.userId })
        }

        const profile = await modelProfilesCollection.findOne({ userId: slot.userId })

        return {
          ...slot,
          user: user
            ? {
                id: user._id?.toString() || user.id,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
                role: user.role || 'model',
                avatarUrl: user.avatarUrl || user.profilePicture || null,
              }
            : null,
          profile: profile
            ? {
                experience: profile.experience,
                specialties: profile.specialties,
                height: profile.height,
                city: profile.location?.city,
                portfolio: profile.portfolio,
                dailyRate: profile.dailyRate,
              }
            : null,
        }
      })
    )

    return NextResponse.json(successResponse(serialize(enriched)))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const validatedData = await parseBody(request, featuredSlotSchema)

    const db = await connectDb()
    const featuredCollection = db.collection('featuredProfiles')

    const updateDoc = {
      ...validatedData,
      updatedAt: new Date(),
    }

    const result = await featuredCollection.findOneAndUpdate(
      { userId: validatedData.userId },
      {
        $set: updateDoc,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' }
    )

    // Sync to modelProfiles / businessProfiles
    const syncDoc = {
      isFeatured: true,
      isSpotlight: true,
      spotlightActive: true,
      spotlightSlot: validatedData.slotOrder,
      spotlightBadge: validatedData.badge || 'Spotlight Star',
      updatedAt: new Date(),
    }
    await db.collection('modelProfiles').updateOne(
      { $or: [{ userId: validatedData.userId }, { userId: (ObjectId.isValid(validatedData.userId) ? new ObjectId(validatedData.userId) : validatedData.userId) }] as any },
      { $set: syncDoc }
    )
    await db.collection('businessProfiles').updateOne(
      { $or: [{ userId: validatedData.userId }, { userId: (ObjectId.isValid(validatedData.userId) ? new ObjectId(validatedData.userId) : validatedData.userId) }] as any },
      { $set: syncDoc }
    )

    return NextResponse.json(
      successResponse(serialize(result), 'Featured slot saved successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'userId parameter is required')
    }

    const db = await connectDb()
    const result = await db.collection('featuredProfiles').deleteOne({ userId })

    // Un-feature profile
    await db.collection('modelProfiles').updateOne(
      { $or: [{ userId }, { userId: (ObjectId.isValid(userId) ? new ObjectId(userId) : userId) }] as any },
      { $set: { isFeatured: false, isSpotlight: false, spotlightActive: false, updatedAt: new Date() } }
    )
    await db.collection('businessProfiles').updateOne(
      { $or: [{ userId }, { userId: (ObjectId.isValid(userId) ? new ObjectId(userId) : userId) }] as any },
      { $set: { isFeatured: false, isSpotlight: false, spotlightActive: false, updatedAt: new Date() } }
    )

    return NextResponse.json(
      successResponse({ deletedCount: result.deletedCount }, 'Featured slot removed')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
