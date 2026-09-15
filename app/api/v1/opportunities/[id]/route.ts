import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/middleware'
import { ApiError, ERROR_CODES, successResponse } from '@/lib/api-response'
import { objectId, parseBody, serialize } from '@/lib/route-utils'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = await connectDb()
    const opp = await db.collection('opportunities').findOne({ _id: objectId(id, 'opportunity id') })
    if (!opp) throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Opportunity not found')

    // Enrich with business profile if available
    const business = await db.collection('businessProfiles').findOne({ userId: opp.createdBy })
    const user = await db.collection('users').findOne({ _id: objectId(opp.createdBy) })

    const enriched = {
      ...opp,
      businessName: business?.companyName || (user ? `${user.firstName} ${user.lastName}` : 'Studio'),
      businessLogo: business?.logoUrl,
    }

    return NextResponse.json(successResponse(serialize(enriched)))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)
    const { id } = await params
    const db = await connectDb()
    const oppId = objectId(id, 'opportunity id')

    const existing = await db.collection('opportunities').findOne({ _id: oppId })
    if (!existing) throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Opportunity not found')
    if (existing.createdBy !== auth.userId && auth.role !== 'admin') {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'You are not authorized to update this opportunity')
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (body.status !== undefined) updateData.status = body.status
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.deadline !== undefined) updateData.deadline = new Date(body.deadline)

    await db.collection('opportunities').updateOne({ _id: oppId }, { $set: updateData })
    const updated = await db.collection('opportunities').findOne({ _id: oppId })
    return NextResponse.json(successResponse(serialize(updated)))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request)
    const { id } = await params
    const db = await connectDb()
    const oppId = objectId(id, 'opportunity id')

    const existing = await db.collection('opportunities').findOne({ _id: oppId })
    if (!existing) throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Opportunity not found')
    if (existing.createdBy !== auth.userId && auth.role !== 'admin') {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'You are not authorized to delete this opportunity')
    }

    await db.collection('opportunities').deleteOne({ _id: oppId })
    return NextResponse.json(successResponse({ deleted: true }))
  } catch (error) {
    return handleApiError(error)
  }
}
