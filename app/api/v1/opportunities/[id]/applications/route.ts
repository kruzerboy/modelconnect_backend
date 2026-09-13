import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { applicationSchema } from '@/lib/schemas'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { createNotification } from '@/lib/helpers'
import { objectId, parseBody, serialize } from '@/lib/route-utils'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request); if (auth.role !== 'model') throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'Only models can apply')
    const { id } = await params; const opportunityId = objectId(id, 'opportunity id'); const input = await parseBody(request, applicationSchema); const db = await connectDb()
    const opportunity = await db.collection('opportunities').findOne({ _id: opportunityId, status: 'open' })
    if (!opportunity) throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Open opportunity not found')
    if (new Date(opportunity.deadline) < new Date()) throw new ApiError(ERROR_CODES.CONFLICT, 409, 'This opportunity is past its deadline')
    if (await db.collection('applications').findOne({ opportunityId: id, userId: auth.userId })) throw new ApiError(ERROR_CODES.CONFLICT, 409, 'You have already applied to this opportunity')
    const now = new Date(); const application = { opportunityId: id, userId: auth.userId, proposedPrice: input.proposedPrice, message: input.message, status: 'pending', createdAt: now, updatedAt: now }
    const result = await db.collection('applications').insertOne(application)
    await createNotification(db, opportunity.createdBy, 'new_application', 'New application received', 'A model applied to your opportunity.', { opportunityId: id, applicationId: result.insertedId.toString() })
    return NextResponse.json(successResponse(serialize({ _id: result.insertedId, ...application })), { status: 201 })
  } catch (error) { return handleApiError(error) }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request); const { id } = await params; const db = await connectDb(); const opportunity = await db.collection('opportunities').findOne({ _id: objectId(id, 'opportunity id') })
    if (!opportunity) throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Opportunity not found')
    if (opportunity.createdBy !== auth.userId && auth.role !== 'admin') throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'You cannot view these applications')
    const data = await db.collection('applications').find({ opportunityId: id }).sort({ createdAt: -1 }).toArray()
    return NextResponse.json(successResponse(serialize(data)))
  } catch (error) { return handleApiError(error) }
}
