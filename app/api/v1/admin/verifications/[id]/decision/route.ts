import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { objectId } from '@/lib/route-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { status, notes } = body

    if (!status) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'status is required')
    }

    const db = await connectDb()
    const isApproved = status === 'Approved'

    const updatedProf = await db.collection('modelProfiles').findOneAndUpdate(
      { _id: objectId(id) },
      {
        $set: {
          isVerified: isApproved,
          verificationStatus: status,
          verificationNotes: notes || '',
          verifiedAt: isApproved ? new Date() : null,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    if (updatedProf && updatedProf.userId) {
      try {
        await db.collection('users').updateOne(
          { _id: objectId(updatedProf.userId) },
          { $set: { isVerified: isApproved, verified: isApproved } }
        )
      } catch {
        await db.collection('users').updateOne(
          { id: updatedProf.userId },
          { $set: { isVerified: isApproved, verified: isApproved } }
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
