import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { objectId } from '@/lib/route-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { status, reason, scope } = body

    if (!status) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, 400, 'status is required')
    }

    const db = await connectDb()
    const result = await db.collection('users').findOneAndUpdate(
      { _id: objectId(id) },
      {
        $set: {
          accountStatus: status,
          suspensionReason: reason || null,
          suspensionScope: scope || null,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'User not found')
    }

    return NextResponse.json(
      successResponse(result, 'User account status updated successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
