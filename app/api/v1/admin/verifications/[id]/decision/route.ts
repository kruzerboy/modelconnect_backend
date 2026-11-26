import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError, requireAdmin } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { objectId } from '@/lib/route-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { status, notes } = body

    if (!status) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'status is required')
    }

    const db = await connectDb()
    const isApproved = status === 'Approved'
    const targetObjId = objectId(id)

    // Check if target is in modelProfiles or businessProfiles
    let updatedProf = await db.collection('modelProfiles').findOneAndUpdate(
      { _id: targetObjId },
      {
        $set: {
          isVerified: isApproved,
          verified: isApproved,
          verificationStatus: status,
          verificationNotes: notes || '',
          verifiedAt: isApproved ? new Date() : null,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    if (!updatedProf) {
      updatedProf = await db.collection('businessProfiles').findOneAndUpdate(
        { _id: targetObjId },
        {
          $set: {
            isVerified: isApproved,
            verified: isApproved,
            verificationStatus: status,
            verificationNotes: notes || '',
            verifiedAt: isApproved ? new Date() : null,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      )
    }

    if (updatedProf && updatedProf.userId) {
      const uid = updatedProf.userId.toString()
      try {
        await db.collection('users').updateOne(
          { _id: objectId(uid) },
          { $set: { isVerified: isApproved, verified: isApproved, updatedAt: new Date() } }
        )
      } catch {
        await db.collection('users').updateOne(
          { id: uid },
          { $set: { isVerified: isApproved, verified: isApproved, updatedAt: new Date() } }
        )
      }
    }

    return NextResponse.json(
      successResponse({ status, notes }, `Verification marked as ${status}`)
    )
  } catch (error) {
    return handleApiError(error)
  }
}
