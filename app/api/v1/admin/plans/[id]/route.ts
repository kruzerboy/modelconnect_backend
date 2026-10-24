import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { updatePlanSchema } from '@/lib/schemas'
import { handleApiError } from '@/lib/middleware'
import { successResponse, ApiError, ERROR_CODES } from '@/lib/api-response'
import { parseBody, serialize, objectId } from '@/lib/route-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const db = await connectDb()
    const plan = await db.collection('plans').findOne({ _id: objectId(id) })

    if (!plan) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Plan not found')
    }

    return NextResponse.json(successResponse(serialize(plan)))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const validatedData = await parseBody(request, updatePlanSchema)

    const db = await connectDb()
    const updateDoc = {
      ...validatedData,
      updatedAt: new Date(),
    }

    const result = await db.collection('plans').findOneAndUpdate(
      { _id: objectId(id) },
      { $set: updateDoc },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Plan not found')
    }

    return NextResponse.json(
      successResponse(serialize(result), 'Plan updated successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const db = await connectDb()
    const result = await db.collection('plans').deleteOne({ _id: objectId(id) })

    if (result.deletedCount === 0) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 404, 'Plan not found')
    }

    return NextResponse.json(
      successResponse(null, 'Plan deleted successfully')
    )
  } catch (error) {
    return handleApiError(error)
  }
}
