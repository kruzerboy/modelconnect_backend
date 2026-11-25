import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { parseBody, serialize, objectId } from '@/lib/route-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = await connectDb()
    const appsCollection = db.collection('featuredApplications')

    const duration = Number(body.durationDays) || 14
    const expiryDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
    const isAutoActivate =
      body.autoActivate === true ||
      body.status === 'active' ||
      body.transactionId?.startsWith('apple_iap_')

    const appDoc = {
      userId: body.userId || 'guest_applicant',
      discipline: body.discipline || 'model',
      durationDays: duration,
      amountPaid: Number(body.amountPaid) || 1799,
      paymentMethod: body.paymentMethod || 'upi_direct',
      transactionId: body.transactionId || `TXN_${Date.now()}`,
      pitchNotes: body.pitchNotes || '',
      badgeRequested: body.badgeRequested || 'VERIFIED PRO',
      status: isAutoActivate ? 'approved' : 'pending_review',
      expiryDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await appsCollection.insertOne(appDoc)

    if (body.userId && body.userId !== 'guest_applicant') {
      const userMatch = [
        { userId: body.userId },
        { userId: objectId(body.userId) },
      ]

      if (isAutoActivate) {
        const featuredCollection = db.collection('featuredProfiles')
        await featuredCollection.findOneAndUpdate(
          { userId: body.userId },
          {
            $set: {
              userId: body.userId,
              slotOrder: 1,
              role: body.discipline || 'model',
              durationDays: duration,
              expiryDate,
              badge: body.badgeRequested || 'VERIFIED PRO',
              active: true,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        )

        const activeUpdate = {
          isFeatured: true,
          isSpotlight: true,
          spotlightActive: true,
          spotlightStatus: 'active',
          isSpotlightPending: false,
          spotlightExpiresAt: expiryDate,
          spotlightDurationDays: duration,
          spotlightBadge: body.badgeRequested || 'VERIFIED PRO',
          spotlightSlot: 1,
          updatedAt: new Date(),
        }
        await Promise.all([
          db.collection('modelProfiles').updateMany({ $or: userMatch as any }, { $set: activeUpdate }),
          db.collection('businessProfiles').updateMany({ $or: userMatch as any }, { $set: activeUpdate }),
        ])
      } else {
        const pendingUpdate = {
          isSpotlightPending: true,
          spotlightStatus: 'pending_review',
          spotlightDurationDays: duration,
          spotlightBadge: body.badgeRequested || 'VERIFIED PRO',
          updatedAt: new Date(),
        }
        await Promise.all([
          db.collection('modelProfiles').updateMany({ $or: userMatch as any }, { $set: pendingUpdate }),
          db.collection('businessProfiles').updateMany({ $or: userMatch as any }, { $set: pendingUpdate }),
        ])
      }
    }

    return NextResponse.json(
      successResponse(
        serialize({ _id: result.insertedId, ...appDoc }),
        isAutoActivate
          ? 'Spotlight activated successfully'
          : 'Spotlight application submitted successfully for curation'
      ),
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
