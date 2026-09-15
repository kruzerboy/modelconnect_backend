import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { createNotification } from '@/lib/helpers'
import { objectId, serialize } from '@/lib/route-utils'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)
    const { id } = await params
    const db = await connectDb()
    const appId = objectId(id, 'application id')

    const app = await db.collection('applications').findOne({ _id: appId })
    if (!app) throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Application not found')

    const body = await request.json()
    const { status } = body
    if (!status) throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'Status is required')

    const now = new Date()
    await db.collection('applications').updateOne(
      { _id: appId },
      { $set: { status, updatedAt: now } }
    )

    // Notify model on status update
    if (status === 'accepted' || status === 'shortlisted') {
      const opp = await db.collection('opportunities').findOne({ _id: objectId(app.opportunityId) })
      await createNotification(
        db,
        app.userId,
        status === 'accepted' ? 'booking_confirmed' : 'application_shortlisted',
        status === 'accepted' ? 'Application Accepted! Shoot Booked' : 'Application Shortlisted',
        `Your application for "${opp?.title || 'Photoshoot'}" has been ${status}.`,
        { opportunityId: app.opportunityId, applicationId: id }
      )
    }

    const updated = await db.collection('applications').findOne({ _id: appId })
    return NextResponse.json(successResponse(serialize(updated)))
  } catch (error) {
    return handleApiError(error)
  }
}
