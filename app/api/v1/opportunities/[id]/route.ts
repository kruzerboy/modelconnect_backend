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
      businessName: business?.companyName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || opp.businessName || 'Business Account',
      businessLogo: business?.logoUrl || opp.businessLogo,
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
    if (body.category !== undefined) updateData.category = body.category
    if (body.shootType !== undefined) updateData.shootType = body.shootType
    if (body.role !== undefined) updateData.role = body.role
    if (body.engagementType !== undefined) updateData.engagementType = body.engagementType
    if (body.isPriceOnCall !== undefined) updateData.isPriceOnCall = Boolean(body.isPriceOnCall)
    if (body.budgetMin !== undefined) updateData.budgetMin = Number(body.budgetMin)
    if (body.budgetMax !== undefined) updateData.budgetMax = Number(body.budgetMax)
    if (body.budget !== undefined) updateData.budget = body.budget
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.city !== undefined) updateData.city = body.city
    if (body.location !== undefined) updateData.location = body.location
    if (body.address !== undefined) updateData.address = body.address
    if (body.date !== undefined) updateData.date = new Date(body.date)
    if (body.startTime !== undefined) updateData.startTime = body.startTime
    if (body.endTime !== undefined) updateData.endTime = body.endTime
    if (body.deadline !== undefined) updateData.deadline = new Date(body.deadline)
    if (body.modelsRequired !== undefined) updateData.modelsRequired = Number(body.modelsRequired)
    if (body.preferredGender !== undefined) updateData.preferredGender = body.preferredGender
    if (body.clothType !== undefined) updateData.clothType = body.clothType
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.hasCameraWithCrew !== undefined) updateData.hasCameraWithCrew = Boolean(body.hasCameraWithCrew)
    if (body.hasCameraOnly !== undefined) updateData.hasCameraOnly = Boolean(body.hasCameraOnly)
    if (body.hasDroneWithPilot !== undefined) updateData.hasDroneWithPilot = Boolean(body.hasDroneWithPilot)
    if (body.hasDroneOnly !== undefined) updateData.hasDroneOnly = Boolean(body.hasDroneOnly)
    if (body.hasLightingKit !== undefined) updateData.hasLightingKit = Boolean(body.hasLightingKit)
    if (body.hasCustomGear !== undefined) updateData.hasCustomGear = Boolean(body.hasCustomGear)
    if (body.customGearDetails !== undefined) updateData.customGearDetails = body.customGearDetails
    if (body.gearExpectations !== undefined) updateData.gearExpectations = body.gearExpectations
    if (body.deliverablesExpected !== undefined) updateData.deliverablesExpected = body.deliverablesExpected
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.contactPersonName !== undefined) updateData.contactPersonName = body.contactPersonName

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
