import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { connectDb } from '@/lib/db'
import { applicationSchema } from '@/lib/schemas'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { createNotification, enrichApplication } from '@/lib/helpers'
import { objectId, parseBody, serialize } from '@/lib/route-utils'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)
    if (auth.role === 'business') {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'Business accounts cannot apply to opportunities')
    }

    const { id } = await params
    const input = await parseBody(request, applicationSchema)
    const db = await connectDb()

    // Find opportunity by ObjectId or string ID
    const oppQuery: Record<string, unknown> = {
      $or: [
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : []),
        { id },
      ]
    }
    const opportunity = await db.collection('opportunities').findOne(oppQuery)
    if (!opportunity) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Opportunity not found')
    }

    if (opportunity.status === 'closed' || opportunity.isOpen === false) {
      throw new ApiError(ERROR_CODES.CONFLICT, 409, 'This opportunity is closed for applications')
    }

    // Check duplicate application
    const existing = await db.collection('applications').findOne({
      $or: [
        { opportunityId: id, userId: auth.userId },
        ...(ObjectId.isValid(id) ? [{ opportunityId: new ObjectId(id), userId: auth.userId }] : []),
      ]
    })
    if (existing) {
      throw new ApiError(ERROR_CODES.CONFLICT, 409, 'You have already applied to this opportunity')
    }

    const now = new Date()
    const application = {
      opportunityId: id,
      userId: auth.userId,
      proposedPrice: input.proposedPrice,
      message: input.message,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    const result = await db.collection('applications').insertOne(application)

    // Increment applicationsCount in the opportunities collection
    await db.collection('opportunities').updateOne(
      { _id: opportunity._id },
      {
        $inc: { applicationsCount: 1, applications_count: 1 },
        $set: { updatedAt: now }
      }
    )

    // Notify owner
    const ownerId = opportunity.createdBy?.toString() || opportunity.businessOwnerId?.toString()
    if (ownerId) {
      await createNotification(
        db,
        ownerId,
        'new_application',
        'New application received',
        `A candidate applied to "${opportunity.title || 'your shoot'}".`,
        { opportunityId: id, applicationId: result.insertedId.toString() }
      )
    }

    const enriched = await enrichApplication(db, { _id: result.insertedId, ...application })
    return NextResponse.json(successResponse(serialize(enriched)), { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)
    const { id } = await params
    const db = await connectDb()

    const oppQuery: Record<string, unknown> = {
      $or: [
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : []),
        { id },
      ]
    }
    const opportunity = await db.collection('opportunities').findOne(oppQuery)
    if (!opportunity) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Opportunity not found')
    }

    const createdByStr = opportunity.createdBy ? opportunity.createdBy.toString() : ''
    const businessOwnerStr = opportunity.businessOwnerId ? opportunity.businessOwnerId.toString() : ''
    const authUserId = auth.userId.toString()

    if (createdByStr && createdByStr !== authUserId && businessOwnerStr !== authUserId && auth.role !== 'admin') {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'You cannot view these applications')
    }

    const data = await db.collection('applications').find({
      $or: [
        { opportunityId: id },
        ...(ObjectId.isValid(id) ? [{ opportunityId: new ObjectId(id) }] : []),
        { 'opportunity._id': id },
        ...(ObjectId.isValid(id) ? [{ 'opportunity._id': new ObjectId(id) }] : []),
      ]
    }).sort({ createdAt: -1 }).toArray()

    const enriched = await Promise.all(data.map((app) => enrichApplication(db, app)))
    return NextResponse.json(successResponse(serialize(enriched)))
  } catch (error) {
    return handleApiError(error)
  }
}
