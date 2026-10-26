import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { serialize } from '@/lib/route-utils'
import { ObjectId } from 'mongodb'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const db = await connectDb()
    const appsCollection = db.collection('featuredApplications')
    const featuredCollection = db.collection('featuredProfiles')

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id }
    const appDoc = await appsCollection.findOne(query as any)

    if (!appDoc) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Application not found')
    }

    const durationDays = body.durationDays || appDoc.durationDays || 14
    const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)

    const slotOrder = Number(body.slotOrder) || 1

    // Upsert into featuredProfiles
    await featuredCollection.findOneAndUpdate(
      { userId: appDoc.userId },
      {
        $set: {
          userId: appDoc.userId,
          slotOrder,
          role: appDoc.discipline || 'model',
          durationDays,
          expiryDate,
          badge: body.badge || appDoc.badgeRequested || 'FEATURED',
          active: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    // Mark application as approved
    await appsCollection.updateOne(query as any, {
      $set: {
        status: 'approved',
        slotOrder,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(
      successResponse(null, 'Application approved and profile featured in spotlight successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
