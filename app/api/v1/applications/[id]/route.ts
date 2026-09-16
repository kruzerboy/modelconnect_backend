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

    const opp = await db.collection('opportunities').findOne({ _id: objectId(app.opportunityId) })
    const body = await request.json()
    const { status } = body
    if (!status) throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'Status is required')

    const isCreator = opp && opp.createdBy === auth.userId
    const isApplicant = app.userId === auth.userId
    const isAdmin = auth.role === 'admin'
    const isProgressOrComplete = status === 'in_progress' || status === 'completed'

    if (!isCreator && !isAdmin) {
      if (!isApplicant || !isProgressOrComplete) {
        throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'You do not have permission to update this application status')
      }
    }

    const now = new Date()
    await db.collection('applications').updateOne(
      { _id: appId },
      { $set: { status, updatedAt: now } }
    )

    // Notify counterpart on status updates
    const recipientId = auth.userId === app.userId ? (opp?.createdBy || '') : app.userId
    if (recipientId) {
      let title = ''
      let message = ''
      let type = 'status_update'

      if (status === 'accepted') {
        title = 'Application Accepted! Shoot Booked'
        message = `Your application for "${opp?.title || 'Photoshoot'}" has been accepted and booked.`
        type = 'booking_confirmed'
      } else if (status === 'shortlisted') {
        title = 'Application Shortlisted'
        message = `Your application for "${opp?.title || 'Photoshoot'}" has been shortlisted.`
        type = 'application_shortlisted'
      } else if (status === 'in_progress') {
        title = 'Shoot In Progress'
        message = `"${opp?.title || 'Photoshoot'}" has been marked as In Progress on set.`
        type = 'shoot_in_progress'
      } else if (status === 'completed') {
        title = 'Shoot Completed'
        message = `"${opp?.title || 'Photoshoot'}" has been marked as Completed.`
        type = 'shoot_completed'
      }

      if (title) {
        await createNotification(db, recipientId, type, title, message, {
          opportunityId: app.opportunityId,
          applicationId: id,
        })
      }
    }

    const updated = await db.collection('applications').findOne({ _id: appId })
    return NextResponse.json(successResponse(serialize(updated)))
  } catch (error) {

    return handleApiError(error)
  }
}
